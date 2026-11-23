// Build an input/output drivetrain and find a blue-receiver entrance that requires every active fitting.
import fs from 'node:fs';
import M from 'matter-js';
import { driveMachine } from '../one-part-missing/drive-course.js';
import { transmissions } from '../one-part-missing/transmissions.js';
import { createRun, advance, trial } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';

// Each letter gives a physical connection in order from input to load.
// M runs a shaft, G meshes gears, C shares spin, T winds a torsion spring, R uses a rack, P blocks reversal.
const cards = [
  ['R', 0],
  ['MR', 0],
  ['G', 0],
  ['C', 0],
  ['T', 0],
  ['PT', 0],
  ['R', 0],
  ['MG', 1],
  ['MC', 1],
  ['MT', 1],
  ['GR', 0],
  ['CR', 1],
  ['GC', 1],
  ['TR', 0],
  ['GT', 1],
  ['GG', 0],
  ['MCR', 0],
  ['TG', 1],
  ['TC', 1],
  ['MGR', 1],
  ['R', 0],
  ['GC', 0],
  ['T', 0],
  ['PG', 0],
  ['MR', 1],
  ['C', 0],
  ['MG', 1],
  ['PT', 1],
  ['GR', 1],
  ['MTR', 0],
  ['MGR', 2, 'magnet'],
  ['GR', 0, 'repulsor'],
  ['GC', 1, 'fan'],
  ['PG', 0, 'magnet'],
  ['G', 0, 'repulsor'],
  ['TR', 1, 'magnet'],
  ['MGC', 0, 'fan'],
  ['MCR', 1, 'repulsor'],
  ['MGT', 1, 'magnet'],
  ['MGR', 2, 'repulsor magnet'],
];
const names = { M: 'motor', G: 'gearbox', C: 'clutch', T: 'torsion', R: 'rack', P: 'ratchet' };
const key = (s) => s.kind + '|' + s.x + '|' + s.y;
const distant = { kind: 'flag', x: 1200, y: 900, w: 24, h: 29 };
function run(m, move, limit = 420) {
  const r = createRun(M, m, move),
    path = [];
  while (r.state === 'running' && r.tick < limit) {
    advance(M, r);
    const p = r.cargo.position;
    path.push({
      t: r.tick,
      x: p.x,
      y: p.y,
      vx: r.cargo.velocity.x,
      vy: r.cargo.velocity.y,
      spin: r.cargo.angularVelocity,
    });
  }
  return { path, state: r.state, uses: r.uses.map((u) => ({ ...u, key: key(r.items[u.item].shape) })) };
}
function rawSpeedMiss(m, move) {
  return [0.99, 1.01].some(
    (f) => trial(M, { ...m, ball: { ...m.ball, spin: m.ball.spin * f } }, move).state !== 'won',
  );
}
function build(i) {
  let state = (i + 17) * 5377381;
  const rng = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const int = (a, b) => Math.floor(a + rng() * (b - a + 1)),
    one = (a) => a[int(0, a.length - 1)],
    sign = () => one([-1, 1]);
  const shuffle = (a) => {
    a = [...a];
    for (let j = a.length - 1; j > 0; j--) {
      const k = int(0, j);
      [a[j], a[k]] = [a[k], a[j]];
    }
    return a;
  };
  const [code, pick, fields = ''] = cards[i],
    kinds = [...code].map((c) => names[c]),
    timed = code.includes('P') || (i >= 20 && (i < 30 || i % 2 === 0 || i === 39));
  for (let attempt = 0; attempt < 4200; attempt++) {
    const dir = sign(),
      angular = kinds.filter((k) => !['motor', 'ratchet'].includes(k)),
      linear = angular.at(-1) === 'rack';
    const input = {
      x: int(115, 198),
      y: int(111, 231),
      r: int(24, 40),
      spin: kinds.includes('motor') ? 0 : (dir * int(10, 34)) / 100,
      density: int(4, 20) / 1000,
    };
    const relay =
      angular.length === 2
        ? { x: int(244, 325), y: int(98, 236), r: int(17, 32), spin: 0, density: int(2, 9) / 1000 }
        : null;
    const h = { x: int(416, 528), y: int(155, 232) },
      radius = int(49, 96),
      angle = int(0, 628) / 100;
    const output = linear
      ? {
          mode: 'slide',
          x: int(379, 513),
          y: int(156, 268),
          guide: [244, 674],
          vx: kinds.includes('ratchet') ? (sign() * int(10, 39)) / 10 : 0,
          density: int(1, 5) / 1000,
        }
      : {
          mode: 'arm',
          x: Math.round(h.x + radius * Math.cos(angle)),
          y: Math.round(h.y + radius * Math.sin(angle)),
          axle: [h.x, h.y],
          spin: (sign() * int(0, 50)) / 1000,
          density: int(1, 5) / 1000,
        };
    const points = {
      drive: input,
      relay,
      parcel: linear ? output : h,
      frame: { x: input.x - 42, y: input.y + 52 },
    };
    const board = { input, relay, output, tools: [], sockets: [], tray: [], goal: { ...distant } };
    let stage = 0;
    for (const k of kinds) {
      const unary = k === 'motor' || k === 'ratchet',
        from = stage ? 'relay' : 'drive',
        to = unary ? 'frame' : relay && !stage ? 'relay' : 'parcel',
        a = points[from],
        b = points[to];
      const fit = {
        kind: k,
        from,
        to,
        x: Math.round(unary ? a.x : a.x * 0.52 + b.x * 0.48),
        y: Math.round(unary ? a.y - 45 : a.y * 0.52 + b.y * 0.48 + one([-31, 31])),
        dir: k === 'ratchet' ? (attempt % 2 ? -dir : dir) : dir,
        ratio: one([0.63, 0.8, 1.25, 1.6, 2.2]),
        pitch: int(17, 42),
        wind: (sign() * int(20, 160)) / 100,
        rate: int(8, 20) / 100,
      };
      board.tools.push(fit);
      if (!unary) stage++;
    }
    const make = () => driveMachine(board, i);
    let sim = run(make(), null, 230),
      ok = true;
    const used = (res, s) => res.uses.some((u) => u.key === key(s));
    if (!board.tools.every((s) => used(sim, s))) continue;
    for (const kind of fields.split(' ').filter(Boolean)) {
      const eligible = shuffle(
        sim.path.filter((p) => p.t > 7 && p.t < 165 && Math.hypot(p.x - output.x, p.y - output.y) > 18),
      );
      let added = false;
      for (const p of eligible.slice(0, 12)) {
        const tool = {
          kind,
          x: Math.round(p.x + (kind === 'fan' ? 0 : sign() * int(18, 45))),
          y: Math.round(p.y + (kind === 'fan' ? int(42, 77) : sign() * int(18, 43))),
          dir,
        };
        if (
          tool.x > 672 ||
          tool.x < 43 ||
          tool.y < 49 ||
          tool.y > 346 ||
          board.tools.some((s) => Math.hypot(tool.x - s.x, tool.y - s.y) < 45)
        )
          continue;
        board.tools.push(tool);
        const effect = run(make(), null, 230);
        if (
          board.tools.every((s) => used(effect, s)) &&
          effect.uses.some((u) => u.key === key(tool) && u.actor === 'cargo')
        ) {
          sim = effect;
          added = true;
          break;
        }
        board.tools.pop();
      }
      if (!added) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    const missing = board.tools.splice(pick, 1)[0],
      { kind: part, ...mount } = missing,
      spares = [mount];
    const nodes = Object.keys(points).filter((k) => points[k] && k !== 'frame');
    const wrong = shuffle(nodes.filter((k) => k !== mount.from));
    for (let slot = 0; slot < (i < 5 ? 1 : 2); slot++) {
      const from = wrong[slot % wrong.length],
        to = from === 'parcel' ? 'frame' : slot ? 'parcel' : 'frame',
        a = points[from],
        b = points[to];
      const virtual = {
        ...mount,
        from,
        to,
        dir: -mount.dir,
        ratio: one([0.5, 1, 1.8]),
        wind: -mount.wind,
        x: Math.round(slot === 0 ? a.x : (a.x + b.x) / 2 + int(-40, 40)),
        y: Math.round(slot === 0 ? a.y + 48 : (a.y + b.y) / 2 + int(22, 63)),
      };
      if (spares.every((s) => Math.hypot(s.x - virtual.x, s.y - virtual.y) > 60)) spares.push(virtual);
    }
    if (spares.length < 2) continue;
    board.sockets = shuffle(spares);
    board.tray = shuffle([
      part,
      ...shuffle(Object.keys(transmissions).filter((k) => k !== part)).slice(
        0,
        i < 2 ? 1 : i < 13 ? 2 : 3,
      ),
    ]);
    const move = { part, socket: board.sockets.indexOf(mount) };
    const probe = run(make(), move, 240),
      all = [missing, ...board.tools];
    if (!all.every((t) => used(probe, t))) continue;
    const lastUse = Math.max(...all.map((t) => probe.uses.find((u) => u.key === key(t)).tick));
    const pointsForGoal = shuffle(
      probe.path.filter(
        (p) =>
          p.t > Math.max(22, lastUse + 7) &&
          Math.hypot(p.x - output.x, p.y - output.y) > 42 &&
          p.x > 45 &&
          p.x < 677 &&
          p.y > 49 &&
          p.y < 337 &&
          Math.hypot(p.vx, p.vy) > 0.7 &&
          board.sockets.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 52),
      ),
    );
    for (const p of pointsForGoal.slice(0, 12)) {
      const phase = Math.max(0, p.t - int(8, 18)),
        window = { start: phase, duration: int(25, 43), period: int(135, 205) };
      board.goal = {
        kind: one(['bell', 'flag', 'chime']),
        x: Math.round(p.x),
        y: Math.round(p.y),
        w: 24,
        h: 28,
        ...(i >= 10 && i % 3 !== 0
          ? linear
            ? { travel: Math.sign(p.vx) }
            : { turn: Math.sign(p.spin) }
          : {}),
        ...(timed ? { window } : {}),
      };
      const m = make(),
        good = run(m, move);
      if (
        good.state !== 'won' ||
        good.path.length < (i < 10 ? 32 : 24) ||
        !all.every((s) => used(good, s))
      )
        continue;
      if (rawSpeedMiss(m, move)) continue;
      if (
        ![-3, -2, -1, 0, 1, 2, 3].every(
          (n) => trial(M, m, move, n).state === 'won' && trial(M, m, null, n).state === 'miss',
        )
      )
        continue;
      if (
        board.tools.some(
          (t) =>
            trial(
              M,
              {
                ...m,
                fixtures: m.fixtures.map((s) => (key(s) === key(t) ? { ...s, disabled: true } : s)),
              },
              move,
            ).state === 'won',
        )
      )
        continue;
      if (certify(M, m)?.length !== 1) continue;
      if (
        m.tray.some((k) =>
          m.sockets.some(
            (_, s) =>
              (k !== part || s !== move.socket) &&
              [-3, -2, 0, 2, 3].some((n) => trial(M, m, { part: k, socket: s }, n).state === 'won'),
          ),
        )
      )
        continue;
      return board;
    }
  }
  throw Error('No driven receiver for level ' + (281 + i));
}
const single = process.argv[2];
if (single) {
  const i = Number(single) - 281;
  if (!Number.isInteger(i) || !cards[i]) throw Error('Choose a level from 281 through 320.');
  console.log(JSON.stringify(build(i)));
} else {
  const rows = cards.map((_, i) => {
    const board = build(i);
    console.log('Certified', 281 + i);
    return board;
  });
  fs.writeFileSync(
    new URL('../one-part-missing/drive-boards.js', import.meta.url),
    '// Fixed drivetrain geometry and receiving windows.\nexport const driveBoards = [\n' +
      rows.map((b) => '  ' + JSON.stringify(b) + ',').join('\n') +
      '\n];\n',
  );
}
