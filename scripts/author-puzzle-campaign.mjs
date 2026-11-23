// Rebuild the frozen campaign score with the same Matter release as the player.
import fs from 'node:fs';
import Matter from 'matter-js';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import { createRun, advance, trial, canFlip } from '../one-part-missing/machines.js';
import { layout, addScore, originals } from '../one-part-missing/campaign-layout.js';

const offsets = [-2, -1, 0, 1, 2];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function trajectory(machine, move) {
  const run = createRun(
    Matter,
    { ...machine, goals: [{ kind: 'bell', x: -1000, y: -1000, w: 12, h: 12, sensor: true }] },
    move,
  );
  const points = [];
  while (run.state === 'running') {
    advance(Matter, run);
    const p = run.ball.position;
    if (run.tick % 3 === 0 && p.x > 38 && p.x < 682 && p.y > 53 && p.y < 346)
      points.push({ x: Math.round(p.x), y: Math.round(p.y), tick: run.tick });
  }
  return points;
}

function compose(n, seed) {
  const { machine, intended, family, finalTile } = layout(n, seed);
  const mount = machine.sockets[intended.socket];
  const trace = trajectory(machine, intended);
  const bare = trajectory(machine, null);
  const chapter = Math.floor((n - 1) / 10);
  const count = chapter < 5 ? 1 : chapter < 7 ? 2 : chapter < 9 ? 3 : 4;
  const size = chapter < 3 ? 40 : chapter < 6 ? 32 : chapter < 8 ? 26 : 20;
  const clear = (p) => machine.sockets.every((s) => distance(s, p) > 48);
  const weightGate =
    family === 'weight' && count > 1
      ? { x: Math.round(mount.x), y: Math.round((mount.y + machine.fixtures[0].y) / 2) }
      : null;
  // In the late signal yard the relay changes hands. Only a tilting tile
  // can touch the narrow chime in the space between the final two dominoes.
  const tiles = machine.fixtures.filter((f) => f.kind === 'tile');
  const relay =
    family === 'domino' && chapter >= 7
      ? {
          x: Math.round((tiles.at(-1).x + tiles.at(-2).x) / 2),
          y: Math.round(tiles.at(-1).y - 6),
        }
      : null;
  const marbleMarkers = count - 1 - (weightGate ? 1 : 0) - (relay ? 1 : 0);
  const finalPoints = finalTile
    ? [{ ...finalTile, tick: Infinity }]
    : trace
        .filter(
          (p, i) =>
            i % 2 === 0 &&
            clear(p) &&
            distance(p, mount) > 76 &&
            (family !== 'weight' || p.y < machine.ball.y - 62) &&
            (family !== 'chute' || (p.x - mount.x) * (machine.ball.vx > 0 ? 1 : -1) < -35) &&
            bare.every((b) => distance(b, p) > size * 0.65 + 15),
        )
        .reverse();
  for (const end of finalPoints.slice(0, 12)) {
    const route = trace.filter(
      (p) =>
        p.tick < end.tick &&
        clear(p) &&
        distance(p, end) > 65 &&
        distance(p, machine.ball) > 40 &&
        (family !== 'domino' || (p.x - mount.x) * (machine.ball.vx > 0 ? 1 : -1) < 0),
    );
    const markers = [];
    for (let i = 0; i < marbleMarkers; i++) {
      const ideal = route[Math.floor(((i + 0.6) * route.length) / (marbleMarkers + 0.6))];
      if (!ideal) break;
      const candidates = route.filter(
        (p) =>
          (!markers.length || p.tick > markers.at(-1).tick + 5) &&
          markers.every((m) => distance(p, m) > 69),
      );
      candidates.sort((a, b) => Math.abs(a.tick - ideal.tick) - Math.abs(b.tick - ideal.tick));
      if (!candidates.length) break;
      markers.push(candidates[0]);
    }
    if (markers.length !== marbleMarkers) continue;
    const score = markers.map((p) => ['chime', p.x, p.y, size, size + 4]);
    if (relay) score.push(['chime', relay.x, relay.y, 9, 17, 'tile']);
    if (weightGate) score.unshift(['chime', weightGate.x, weightGate.y, size, size + 4, 'weight']);
    score.push([
      finalTile ? 'flag' : ['bell', 'flag', 'chime'][n % 3],
      end.x,
      end.y,
      finalTile ? 20 : size,
      finalTile ? 34 : size + 4,
      ...(finalTile ? ['tile'] : []),
    ]);
    addScore(machine, score);
    if (
      !offsets.every(
        (x) =>
          trial(Matter, machine, intended, x).state === 'won' &&
          trial(Matter, machine, null, x).state === 'miss',
      )
    )
      continue;
    // The numbered releases have one answer even at their nominal launch point.
    let unique = true;
    search: for (const part of machine.tray)
      for (let socket = 0; socket < machine.sockets.length; socket++) {
        for (const flipped of canFlip(machine, part) ? [false, true] : [false]) {
          if (
            part === intended.part &&
            socket === intended.socket &&
            flipped === Boolean(intended.flipped)
          )
            continue;
          if (trial(Matter, machine, { part, socket, flipped }).state === 'won') {
            unique = false;
            break search;
          }
        }
      }
    if (unique) return score;
  }
  return null;
}
// Small floating-point differences can change where a falling domino lands.
// Check each accepted recipe in shipping Chrome as well as the Node authoring engine.
const localPath = (name) => fileURLToPath(new URL('../' + name, import.meta.url));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHAOS_CHROME ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/google-chrome'),
  headless: true,
});
try {
  const page = await browser.newPage();
  await page.addScriptTag({ path: localPath('vendor/matter-0.20.0.min.js') });
  const engineModule = await page.evaluateHandle(
    (source) => import(source),
    'data:text/javascript;base64,' +
      fs.readFileSync(localPath('one-part-missing/machines.js')).toString('base64'),
  );
  const lines = [];
  for (let n = 1; n <= 100; n++) {
    if (originals.has(n)) {
      lines.push('  null,');
      continue;
    }
    let score, seed;
    for (let attempt = 0; attempt < 5000 && !score; attempt++) {
      seed = (n * 9973 + attempt * 7919) >>> 0;
      const candidate = compose(n, seed);
      if (!candidate) continue;
      const { machine, intended } = layout(n, seed);
      addScore(machine, candidate);
      const passed = await page.evaluate(
        (physics, m, move, starts) => {
          if (
            !starts.every(
              (x) =>
                physics.trial(Matter, m, null, x).state === 'miss' &&
                physics.trial(Matter, m, move, x).state === 'won',
            )
          )
            return false;
          for (const part of m.tray)
            for (let socket = 0; socket < m.sockets.length; socket++) {
              for (const flipped of physics.canFlip(m, part) ? [false, true] : [false]) {
                if (part === move.part && socket === move.socket && flipped === Boolean(move.flipped))
                  continue;
                if (physics.trial(Matter, m, { part, socket, flipped }).state === 'won') return false;
              }
            }
          return true;
        },
        engineModule,
        machine,
        intended,
        offsets,
      );
      if (passed) score = candidate;
    }
    if (!score) throw new Error('No score for level ' + n);
    lines.push('  ' + JSON.stringify([seed, score]) + ',');
    console.log('Certified level', n, 'seed', seed);
  }
  fs.writeFileSync(
    localPath('one-part-missing/campaign-score.js'),
    '// Frozen launch seeds and ordered physical targets. See scripts/author-puzzle-campaign.mjs.\nexport const scores = [\n' +
      lines.join('\n') +
      '\n];\n',
  );
} finally {
  await browser.close();
}
