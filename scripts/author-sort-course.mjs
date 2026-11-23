// Construct a working material-handling line, take out one station, and place
// two independent receivers on the actual routes. Re-test every installation.
import fs from 'node:fs';
import M from 'matter-js';
import { parts, advance, createRun, trial } from '../one-part-missing/machines.js';
import { sortMachine } from '../one-part-missing/sort-course.js';
import { sortingParts } from '../one-part-missing/sorting.js';
const recipes = [
  'sieve',
  'funnel',
  'basket',
  'ice',
  'oneway',
  'zipline',
  'sieve',
  'ice',
  'basket',
  'zipline',
  'funnel+basket',
  'sieve+ice',
  'zipline+ice',
  'oneway+basket',
  'ice+funnel',
  'zipline+oneway',
  'oneway+funnel',
  'ice+sieve',
  'funnel+zipline',
  'sieve+basket',
  'conveyor+ice',
  'funnel+magnet',
  'zipline+fan',
  'sieve+conveyor',
  'ice+repulsor',
  'oneway+trampoline',
  'zipline+trampoline',
  'sieve+magnet',
  'basket+elevator',
  'funnel+conveyor+ice',
  'sieve+magnet+basket',
  'zipline+ice+fan',
  'ice+conveyor+basket',
  'funnel+repulsor+ice',
  'basket+magnet+oneway',
  'sieve+fan+zipline',
  'ice+repulsor+basket',
  'zipline+magnet+funnel',
  'funnel+trampoline+ice',
  'sieve+magnet+zipline+basket',
];
const far = [
  { kind: 'flag', bin: 'gold', x: 1900, y: 1500, striker: 'marble' },
  { kind: 'flag', bin: 'blue', x: 2600, y: 1500, striker: 'cargo' },
].map((s) => ({ ...s, w: 25, h: 24, sensor: true }));
const actorKinds = ['marble', 'cargo'];
const fitFor = (s, kind) => ({ ...parts[kind].shape, ...s, kind });
function trace(board, stop = 165) {
  const m = sortMachine(board, 0),
    r = createRun(M, m),
    paths = [[], []];
  for (let t = 1; t <= stop; t++) {
    r.tick = t;
    M.Engine.update(r.engine, 1000 / 60);
    for (const [k, b] of [r.ball, r.cargo].entries())
      paths[k].push({ t, x: b.position.x, y: b.position.y, vx: b.velocity.x, vy: b.velocity.y });
  }
  return { paths, uses: r.uses, tools: r.items.filter((it) => parts[it.shape.kind]) };
}
const inside = (p) => p.x > 45 && p.x < 675 && p.y > 52 && p.y < 355;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function build(i, skip = 0) {
  if (i === 16) {
    // The marble passes up through the permitted face and lands on the same gate on its return.
    const board = {
      ball: { kind: 'marble', r: 9, x: 218, y: 270, vx: 0.22, vy: -9.5 },
      fixtures: [
        { kind: 'cargo', r: 17, x: 450, y: 45, vx: 1.2 },
        { ...parts.funnel.shape, x: 510, y: 160, gap: 30 },
      ],
      tray: ['oneway', 'ice', 'zipline'],
      sockets: [
        { x: 440, y: 295, dir: 1 },
        { x: 182, y: 155, dir: 1 },
        { x: 237, y: 174, dir: -1 },
      ],
      goals: [
        { ...far[0], x: 239, y: 164, w: 26, h: 26, hold: 12, pace: 0.8 },
        {
          kind: 'flag',
          bin: 'blue',
          x: 510,
          y: 166,
          striker: 'cargo',
          w: 21,
          h: 22,
          sensor: true,
          hold: 8,
          pace: 1,
        },
      ],
    };
    const m = sortMachine(board, i),
      move = { part: 'oneway', socket: 2 },
      r = createRun(M, m, move);
    while (r.state === 'running') advance(M, r);
    if (r.state !== 'won') throw Error('The returning gate must pass both loads.');
    return { board, move, binTicks: r.binTicks, uses: r.uses, attempt: 0 };
  }
  let seed = Math.imul(i + 1, 529871) + skip * 97531;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1)),
    choose = (a) => a[int(0, a.length - 1)];
  const shuffle = (a) => {
    a = [...a];
    for (let j = a.length - 1; j > 0; j--) {
      const k = int(0, j);
      [a[j], a[k]] = [a[k], a[j]];
    }
    return a;
  };
  const recipe = recipes[i].split('+');
  for (let attempt = 0; attempt < 950; attempt++) {
    const dir = rnd() < 0.5 ? -1 : 1,
      baseX = int(210, 470);
    const tight = ['sieve', 'funnel'].includes(recipe[0]);
    const actors = [
      {
        kind: 'marble',
        r: int(7, 10),
        x: baseX,
        y: int(60, 118),
        vx: tight ? (rnd() - 0.5) * 0.32 : (dir * int(12, 35)) / 10,
      },
      {
        kind: 'cargo',
        r: int(16, 21),
        x: baseX + (tight ? int(-7, 7) : dir * int(-125, 125)),
        y: int(28, 48),
        vx: tight ? (rnd() - 0.5) * 0.28 : (dir * int(-8, 34)) / 10,
      },
    ];
    if (dist(actors[0], actors[1]) < actors[0].r + actors[1].r + 6) continue;
    const b = { ball: actors[0], fixtures: [actors[1]], goals: far, tray: [], sockets: [] },
      stations = [];
    let result = trace(b);
    for (const [j, kind] of recipe.entries()) {
      const candidates = result.paths.flatMap((path, k) =>
        path
          .filter(
            (p) =>
              inside(p) &&
              p.y > 105 &&
              p.y < 310 &&
              p.t >= 11 &&
              p.t <= 94 &&
              p.vy > -0.8 &&
              (Math.hypot(p.vx, p.vy) > 1 || kind === 'magnet' || kind === 'repulsor' || kind === 'fan'),
          )
          .map((p) => ({ ...p, k })),
      );
      let installed = false;
      for (const pick of shuffle(candidates).slice(0, 28)) {
        const direction = rnd() < 0.66 ? dir : -dir;
        const s = { kind, x: Math.round(pick.x), y: Math.round(pick.y), dir: direction };
        if (kind === 'sieve' || kind === 'funnel') {
          s.gap = int(26, 32);
          if (j === 0 && tight) s.x = baseX + int(-4, 4);
          else s.x += int(-24, 24);
        }
        if (kind === 'ice') {
          s.slope = int(10, 37) / 100;
          s.x += int(-25, 25);
        }
        if (kind === 'basket') s.x += int(-31, 31);
        if (kind === 'zipline') {
          s.span = int(105, 187);
          s.drop = int(28, 76);
          if (s.x + s.dir * s.span < 30 || s.x + s.dir * s.span > 690) s.dir = -s.dir;
        }
        if (kind === 'oneway') {
          s.dir = pick.vy > 0 ? -1 : 1;
          s.x += int(-33, 33);
        }
        if (kind === 'magnet' || kind === 'repulsor') {
          s.x += int(19, 58) * direction;
          s.y += int(-26, 28);
        }
        if (kind === 'fan') s.y += int(16, 48);
        if (!inside(s) || stations.some((old) => dist(old, s) < 53)) continue;
        const ns = fitFor(s, kind),
          next = { ...b, fixtures: [...b.fixtures, ns] },
          trial = trace(next);
        const active = trial.uses.find((u) => u.kind === kind);
        if (!active || stations.some((old) => !trial.uses.some((u) => u.kind === old.kind))) continue;
        // Early stations act in sequence somewhere on the route, and the new station must move a load.
        const changed = trial.paths.some((path, k) =>
          path.some((p, t) => inside(p) && dist(p, result.paths[k][t]) > 13),
        );
        if (!changed) continue;
        stations.push(ns);
        b.fixtures.push(ns);
        result = trial;
        installed = true;
        break;
      }
      if (!installed) break;
    }
    if (stations.length < recipe.length) continue;
    if (
      i === 0 &&
      !(
        result.uses.some((u) => u.action === 'through gap' && u.actor === 'marble') &&
        result.uses.some((u) => u.action === 'caught on bars' && u.actor === 'cargo')
      )
    )
      continue;
    const lastUse = Math.max(...stations.map((s) => result.uses.find((u) => u.kind === s.kind).tick));
    const removed = choose(stations.filter((s) => sortingParts[s.kind])),
      kind = removed.kind;
    const mount = (s) =>
      Object.fromEntries(
        ['x', 'y', 'dir', 'gap', 'slope', 'span', 'drop']
          .filter((k) => s[k] !== undefined)
          .map((k) => [k, s[k]]),
      );
    const intended = mount(removed),
      sockets = [intended];
    for (let k = 0; k < 22 && sockets.length < (i < 6 ? 2 : i < 24 ? 3 : 4); k++) {
      const opt = { x: int(100, 610), y: int(85, 300), dir: rnd() < 0.5 ? 1 : -1 };
      if (sockets.every((s) => dist(s, opt) > 85) && stations.every((s) => dist(s, opt) > 45))
        sockets.push(opt);
    }
    if (sockets.length < (i < 6 ? 2 : i < 24 ? 3 : 4)) continue;
    b.sockets = shuffle(sockets);
    b.fixtures = b.fixtures.filter((s) => s !== removed);
    const distractors =
      i < 6
        ? ['bridge', 'bumper', 'chute', 'basket', 'ice', 'zipline', 'funnel']
        : Object.keys(sortingParts).concat('conveyor', 'trampoline', 'magnet', 'fan');
    b.tray = shuffle([
      kind,
      ...shuffle(distractors.filter((k) => k !== kind)).slice(0, i < 4 ? 1 : i < 25 ? 2 : 3),
    ]);
    const move = { part: kind, socket: b.sockets.indexOf(intended) };
    const points = result.paths.map((path, k) =>
      shuffle(
        path.filter(
          (p, t) =>
            t % 3 === 0 && p.t >= Math.max(24, lastUse - 22) && inside(p) && dist(p, actors[k]) > 42,
        ),
      ).slice(0, 28),
    );
    if (points.some((list) => !list.length)) continue;
    for (let g = 0; g < 32; g++) {
      const picked = points.map(choose);
      if (dist(picked[0], picked[1]) < 68) continue;
      const goals = picked.map((p, k) => {
        const settled = Math.hypot(p.vx, p.vy) < 0.7;
        return {
          ...far[k],
          x: Math.round(p.x),
          y: Math.round(p.y),
          w: int(20, 30),
          h: int(18, 27),
          ...(settled ? { hold: int(8, 16), pace: 1.0 } : {}),
        };
      });
      if (i === 0 && !goals[1].hold) continue;
      const machine = sortMachine({ ...b, goals }, i);
      if (trial(M, machine, null).state === 'won' || trial(M, machine, move).state !== 'won') continue;
      const r = createRun(M, machine, move);
      while (r.state === 'running') advance(M, r);
      if (r.tick < 32 || r.binTicks.some((t) => t < 15) || Math.abs(r.binTicks[0] - r.binTicks[1]) < 5)
        continue;
      if (stations.some((s) => !r.uses.some((u) => u.kind === s.kind))) continue;
      if (
        machine.fixtures
          .filter((s) => parts[s.kind])
          .some(
            (s) =>
              trial(M, { ...machine, fixtures: machine.fixtures.filter((f) => f !== s) }, move).state ===
              'won',
          )
      )
        continue;
      if (
        [-3, -2, -1, 1, 2, 3].some(
          (o) =>
            trial(M, machine, move, o).state !== 'won' || trial(M, machine, null, o).state === 'won',
        )
      )
        continue;
      let unique = true;
      for (const spare of b.tray)
        for (let slot = 0; slot < b.sockets.length; slot++) {
          if (spare === kind && slot === move.socket) continue;
          if (
            [-3, 0, 3].some((o) => trial(M, machine, { part: spare, socket: slot }, o).state === 'won')
          )
            unique = false;
          if (!unique) break;
        }
      if (unique)
        return {
          board: { ...b, goals },
          move,
          binTicks: r.binTicks,
          uses: r.uses.map((u) => [u.kind, u.actor, u.action, u.tick]),
          attempt,
        };
    }
  }
  return null;
}
const [start, end, dir, skip] = process.argv.slice(2);
if (start !== undefined) {
  fs.mkdirSync(dir, { recursive: true });
  for (let n = Number(start); n <= Number(end); n++) {
    const r = build(n, Number(skip) || 0);
    fs.writeFileSync(dir + '/' + n + '.json', JSON.stringify(r));
    console.log(n, r?.attempt, r?.move, r?.binTicks);
  }
}
