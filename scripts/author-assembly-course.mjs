// Rebuild three-station challenges from physical courses, then exhaustively
// reject alternative complete or partial installations throughout the release tolerance.
import fs from 'node:fs';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import {
  assembly,
  parts,
  packFittings,
  createRun,
  advance,
  trial,
} from '../one-part-missing/machines.js';
import { certify, possibilities } from '../one-part-missing/certify.js';
const starts = [
  [141, 145, 155, 150],
  [146, 149, 157],
  [156, 154, 159],
  [160, 155, 157],
  [169, 170, 179, 180],
  [191, 192, 194, 170, 180],
  [193, 194, 196, 179],
  [195, 197, 200, 180],
  [150, 157, 160],
  [199, 196, 200],
  [229, 230, 231, 232],
  [227, 228, 230, 231],
  [233, 234, 235, 236],
  [236, 237, 239, 240],
  [292, 295, 297, 298],
  [299, 300, 310, 320],
  [308, 314, 318, 320],
  [317, 319, 318, 320],
  [239, 238, 237, 235],
  [320, 319, 317, 315],
  [350, 351, 352, 353],
  [352, 353, 354, 355],
  [354, 355, 356, 359],
  [356, 357, 358, 360],
  [354, 357, 359, 360],
  [391, 392, 393, 394],
  [392, 394, 396, 398],
  [385, 387, 390],
  [391, 394, 397],
  [395, 399, 400],
  [155, 157, 160, 159],
  [198, 197, 196, 200],
  [236, 238, 239, 240],
  [309, 312, 317, 320],
  [353, 356, 354, 357, 352, 359, 360],
  [389, 390, 395, 396],
  [197, 198, 199, 200],
  [313, 317, 319, 320],
  [395, 397, 399, 400],
  [400, 399, 398, 397],
];
const cache = new Map();
function stock(n) {
  if (!cache.has(n)) {
    const m = campaign[n - 1],
      f = certify(M, m)[0];
    cache.set(n, {
      m,
      shapes: assembly(m, f)
        .slice(0, -m.goals.length - 1)
        .map(({ fitted, ...s }) => s),
    });
  }
  return cache.get(n);
}
const spread = [0, -3, 3, -1, 1, -2, 2];
const spatial = [
  'x',
  'y',
  'dir',
  'from',
  'to',
  'rest',
  'length',
  'gap',
  'span',
  'drop',
  'ratio',
  'pitch',
  'rate',
  'wind',
  'phase',
  'stroke',
  'a',
  'pair',
  'channel',
];
function author(i) {
  let seed = (i + 1) * 49999;
  const rand = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  const int = (a, b) => a + Math.floor(rand() * (b - a + 1)),
    shuffle = (arr) => {
      const copy = [...arr];
      for (let k = copy.length - 1; k > 0; k--) {
        const j = int(0, k);
        [copy[k], copy[j]] = [copy[j], copy[k]];
      }
      return copy;
    };
  const counters = Array(8).fill(0);
  for (let attempt = 0; attempt < (i === 34 ? 7000 : 900); attempt++) {
    const n = starts[i][attempt % starts[i].length],
      { m, shapes } = stock(n);
    const dx = int(-26, 26),
      dy = int(-13, 12);
    const translate = (s) => ({
      ...s,
      x: s.x + dx,
      y: s.y + dy,
      ...(s.axle && { axle: [s.axle[0] + dx, s.axle[1] + dy] }),
      ...(s.guide && { guide: s.guide.map((x) => x + dx) }),
    });
    const all = shapes.map(translate);
    // Cross a sorting bench with a fourth field on an actual outgoing arc.
    if (i === 34) {
      const probe = {
        ...m,
        ball: translate(m.ball),
        fixtures: all,
        sockets: [],
        goals: m.goals.map((g) => ({ ...g, x: 1600, y: 1200 })),
      };
      const r = createRun(M, probe),
        seats = [];
      while (r.state === 'running') {
        advance(M, r);
        for (const b of [r.ball, r.cargo]) {
          const { x, y } = b.position;
          if (
            r.tick > 24 &&
            r.tick % 4 === 0 &&
            x > 70 &&
            x < 650 &&
            y > 65 &&
            y < 305 &&
            Math.hypot(b.velocity.x, b.velocity.y) > 1.4 &&
            all.every((f) => Math.hypot(x - f.x, y - f.y) > 52)
          )
            seats.push({ x: Math.round(x), y: Math.round(y) });
        }
      }
      if (!seats.length) continue;
      const kind = shuffle(['bank', 'parachute', 'thruster', 'deflector', 'syrup'])[0];
      all.push({ ...parts[kind].shape, ...shuffle(seats)[0], dir: 1 });
    }
    const tools = all.filter((s) => parts[s.kind]);
    const needed = i < 10 ? 3 : i < 30 ? 3 : i === 39 ? 7 : 4;
    if (tools.length < needed) continue;
    const cut = [];
    for (const s of shuffle(tools))
      if (cut.length < 3 && cut.every((o) => o.kind !== s.kind && Math.hypot(s.x - o.x, s.y - o.y) > 42))
        cut.push(s);
    if (cut.length < 3) continue;
    counters[0]++;
    const fixtures = all.filter((s) => !cut.includes(s)),
      ball = translate(m.ball);
    ball.x += int(-4, 4);
    if (ball.vx) ball.vx *= int(97, 103) / 100;
    const sockets = cut.map((s) =>
      Object.fromEntries(spatial.filter((k) => s[k] !== undefined).map((k) => [k, s[k]])),
    );
    const correct = [...sockets];
    const kinds = cut.map((s) => s.kind);
    if (i >= 20) {
      for (let tries = 0; tries < 80; tries++) {
        const p = { x: int(98, 620), y: int(60, 316), dir: rand() < 0.5 ? -1 : 1 };
        if (
          sockets.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 74) &&
          fixtures.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 45)
        ) {
          sockets.push(p);
          break;
        }
      }
    }
    const connected = cut.find((s) => s.wire || s.drive);
    if (connected)
      for (const s of sockets)
        if (!s.from)
          Object.assign(s, { from: connected.from, to: connected.to, rest: connected.rest ?? 1 });
    const mounts = shuffle(sockets);
    const extra = shuffle(
      [
        'fan',
        'trampoline',
        'magnet',
        'parachute',
        'brake',
        'syrup',
        'elevator',
        'ice',
        'repulsor',
        'keel',
        'cam',
        'conveyor',
        'bank',
      ].filter((k) => parts[k] && !kinds.includes(k)),
    );
    const tray = shuffle([...kinds, ...extra.slice(0, i < 6 ? 0 : i <= 34 ? 1 : 2)]);
    const board = { ball, fixtures, sockets: mounts, tray, goals: m.goals.map(translate) };
    const move = packFittings(kinds.map((part, k) => ({ part, socket: mounts.indexOf(correct[k]) })));
    const machine = { ...board, capacity: 3 };
    const reachable = (move, offset = 0, board = machine) =>
      trial(M, board, move, offset).state === 'won';
    // First try the source receiver with changed approach. Ordinary target contacts
    // can also be recut along the last load's actual path. Bins retain their holds.
    const goal = board.goals.at(-1),
      original = { ...goal },
      targets = [{ x: goal.x + int(-5, 5), y: goal.y + int(-4, 4) }];
    if (i === 34 && goal.bin) {
      const parked = board.goals.map((g) => ({ ...g, x: 1600, y: 900 }));
      const r = createRun(M, { ...machine, goals: parked }, move),
        samples = [[], []];
      while (r.state === 'running') {
        advance(M, r);
        for (const [k, body] of [r.ball, r.cargo].entries()) {
          const { x, y } = body.position,
            g = board.goals[k];
          if (x < 42 || x > 678 || y < 38 || y > 354 || r.tick % 3 || r.tick < 25 || r.uses.length < 2)
            continue;
          if (Math.hypot(body.velocity.x, body.velocity.y) < 0.5) continue;
          if (samples[k].every((t) => Math.hypot(t.x - x, t.y - y) > 8))
            samples[k].push({ x: Math.round(x), y: Math.round(y) });
        }
      }
      for (const g of board.goals) {
        delete g.pace;
        delete g.hold;
      }
      if (samples.every((a) => a.length)) {
        Object.assign(board.goals[0], shuffle(samples[0])[0], { w: int(14, 21), h: int(14, 21) });
        targets.splice(0, targets.length, ...shuffle(samples[1]));
      }
    }
    if (!goal.bin) {
      goal.x = 1900;
      goal.y = 1400;
      const run = createRun(M, machine, move),
        actor = goal.striker === 'cargo' ? run.cargo : run.ball;
      while (run.state === 'running') {
        advance(M, run);
        const { x, y } = actor.position;
        if (
          run.tick % 4 === 0 &&
          x > 35 &&
          x < 685 &&
          y > 36 &&
          y < 354 &&
          Math.hypot(x - original.x, y - original.y) < 70 &&
          run.hits.length === board.goals.length - 1 &&
          targets.every((p) => Math.hypot(x - p.x, y - p.y) > 12)
        )
          targets.push({ x: Math.round(x), y: Math.round(y) });
      }
    }
    const partials = [null, ...possibilities(machine, 1), ...possibilities(machine, 2)],
      full = [...possibilities(machine)];
    for (const t of targets.slice(0, 7)) {
      Object.assign(goal, t);
      if (!spread.every((o) => reachable(move, o))) continue;
      counters[1]++;
      const run = createRun(M, machine, move);
      while (run.state === 'running') advance(M, run);
      const active = run.items.filter((it) => parts[it.shape.kind]);
      if (active.some((it) => !run.uses.some((e) => e.item === run.items.indexOf(it)))) continue;
      if (
        fixtures.some(
          (f) =>
            parts[f.kind] &&
            reachable(move, 0, {
              ...machine,
              fixtures: fixtures.map((s) => (s === f ? { ...s, disabled: true } : s)),
            }),
        )
      )
        continue;
      counters[2]++;
      if (partials.some((p) => reachable(p))) continue;
      counters[3]++;
      const alternate = full.filter((p) => JSON.stringify(p) !== JSON.stringify(move));
      if (alternate.some((p) => reachable(p))) continue;
      counters[4]++;
      if ([...partials, ...alternate].some((p) => spread.slice(1).some((o) => reachable(p, o))))
        continue;
      return {
        board,
        move,
        source: n,
        tick: run.tick,
        events: run.uses.map((e) => e.kind),
        critical: active.map((s) => s.shape.kind),
        attempt,
      };
    }
  }
  throw Error('No assembly for ' + i + ' ' + counters.join('/'));
}
const [start = '0', end = '40', dir] = process.argv.slice(2),
  rows = [];
if (dir) fs.mkdirSync(dir, { recursive: true });
for (let i = +start; i < +end; i++) {
  const r = author(i);
  rows.push(r.board);
  console.log(i, r.source, r.tick, r.critical, r.attempt);
  if (dir) fs.writeFileSync(dir + '/' + i + '.json', JSON.stringify(r));
}
if (!dir && rows.length === starts.length)
  fs.writeFileSync(
    new URL('../one-part-missing/assembly-boards.js', import.meta.url),
    '// Generated by scripts/author-assembly-course.mjs.\nexport const assemblyBoards = [\n' +
      rows.map((b) => '  ' + JSON.stringify(b) + ',').join('\n') +
      '\n];\n',
  );
