// Grow each route along the real moving body's path. Each required station
// is removed and independently simulated before a drawing enters the course.
import fs from 'node:fs';
import M from 'matter-js';
import { parts, createRun, advance, trial } from '../one-part-missing/machines.js';
import { flightParts } from '../one-part-missing/flight.js';
const recipes = [
  'float',
  'parachute',
  'thruster',
  'keel',
  'hopper',
  'bank',
  'float unload',
  'thruster',
  'parachute',
  'hopper',
  'float thruster',
  'parachute thruster',
  'bank keel',
  'parachute unload',
  'keel bank',
  'hopper thruster',
  'float keel',
  'thruster unload',
  'bank float',
  'keel unload',
  'float',
  'parachute',
  'keel',
  'thruster',
  'float unload',
  'bank',
  'float thruster',
  'hopper',
  'parachute bank',
  'keel unload',
  'float thruster unload',
  'parachute bank thruster',
  'hopper float bank',
  'thruster unload float',
  'bank parachute keel',
  'float bank unload',
  'hopper thruster unload',
  'thruster keel bank',
  'float thruster bank unload',
  'parachute thruster unload bank',
];
const hintFor = {
  float: 'Look at the incoming descent before the collar cancels gravity.',
  parachute: 'Watch the canopy slow the falling load after pickup.',
  thruster: 'Follow the load’s facing mark. The motor pushes along that axis.',
  keel: 'Read the direction the load faces when the fin takes away its sideways drift.',
  hopper: 'The foot fires on supported contact. Compare pickup with the later jump.',
  bank: 'Compare the incoming and reflected paths on either side of the vane.',
  unload: 'Inspect the last frame with gear still attached, then trace the empty load.',
};
import {dist,inside,of,g,trace} from './lib/station-traces.mjs';
function build(i, salt = 0) {
  let seed = Math.imul(i + 1, 2831089) + salt * 44261;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const num = (a, b) => a + Math.floor(rand() * (b - a + 1)),
    pick = (xs) => xs[num(0, xs.length - 1)];
  const shuffle = (data) => {
    const arr = [...data];
    for (let j = arr.length - 1; j > 0; j--) {
      const k = num(0, j);
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
    return arr;
  };
  const line = recipes[i].split(' '),
    parcel = (i >= 20 && i < 30) || [34, 36, 38, 39].includes(i),
    actor = parcel ? 'cargo' : 'marble';
  const counts = Array(8).fill(0);
  for (let attempt = 0; attempt < 2500; attempt++) {
    const dir = rand() < 0.78 ? 1 : -1;
    const launch = {
      kind: actor,
      r: num(9, 12),
      x: dir > 0 ? num(64, 157) : num(567, 654),
      y: num(47, 120),
      vx: (dir * num(29, 60)) / 10,
      vy: num(-25, 18) / 10,
      a: (dir === 1 ? 0 : Math.PI) + num(-78, 70) / 100,
    };
    const ball = parcel
      ? { kind: 'marble', x: dir > 0 ? 594 : 122, y: 39, r: 9, vx: dir * 0.5 }
      : launch;
    const stages = [],
      far = g({ x: 1600, y: 1600 }, actor);
    const board = { ball, fixtures: [], sockets: [], tray: [], goals: [far] };
    if (parcel) {
      // The gold marble trips the hatch. The parcel starts at rest on it and
      // picks up its horizontal velocity from the belt beneath the door.
      launch.y = 54;
      launch.vx = 0;
      launch.vy = 0;
      board.fixtures.push(
        of('switch', { x: ball.x + dir * 9, y: num(91, 117) }),
        of('hatch', { x: launch.x, y: launch.y + launch.r + 5, dir }),
        launch,
        of('conveyor', { x: launch.x + dir * 36, y: 132, dir }),
      );
    }
    let result = trace(board, actor),
      last = parcel
        ? (result.uses.find((u) => u.kind === 'conveyor' && u.actor === 'cargo')?.tick ?? 25)
        : 0;
    for (const [j, kind] of line.entries()) {
      const choices = shuffle(
        result.points.filter(
          (p) =>
            inside(p) &&
            p.t > last + (j ? 6 : 3) &&
            p.t < last + (j ? 42 : 50) &&
            p.y > 55 &&
            p.y < 296 &&
            Math.hypot(p.vx, p.vy) > 1.4 &&
            (kind !== 'hopper' || p.vy > -0.2) &&
            stages.every((s) => dist(s, p) > 54),
        ),
      );
      let installed = false;
      for (const p of choices.slice(0, 13)) {
        const st = of(kind, { x: Math.round(p.x), y: Math.round(p.y) }),
          fixture = [st];
        if (kind === 'hopper') {
          const impact = result.points[Math.min(result.points.length - 1, p.t + num(5, 12))];
          if (!inside(impact) || impact.y > 320) continue;
          fixture.push({
            kind: 'rail',
            x: Math.round(impact.x),
            y: Math.round(impact.y + launch.r + 6),
            w: num(82, 128),
            h: 10,
            a: num(-10, 10) / 100,
          });
        }
        const next = trace({ ...board, fixtures: [...board.fixtures, ...fixture] }, actor);
        const used = next.uses.find(
          (e) =>
            e.kind === kind &&
            e.actor === actor &&
            e.action ===
              (kind === 'hopper'
                ? 'hopped'
                : kind === 'unload'
                  ? 'released gear'
                  : kind === 'bank'
                    ? 'banked'
                    : 'attached'),
        );
        if (
          !used ||
          used.tick <= last ||
          stages.some((s) => !next.uses.some((u) => u.kind === s.kind && u.actor === actor))
        )
          continue;
        if (
          !next.points.some(
            (q) =>
              q.t > used.tick && inside(q) && result.points[q.t] && dist(q, result.points[q.t]) > 14,
          )
        )
          continue;
        stages.push(st);
        board.fixtures.push(...fixture);
        result = next;
        last = used.tick;
        installed = true;
        break;
      }
      if (!installed) break;
    }
    if (stages.length !== line.length) continue;
    counts[0]++;
    const removed = i < 7 ? stages.at(-1) : pick(stages),
      mount = { x: removed.x, y: removed.y };
    const sockets = [mount],
      count = i < 7 ? 2 : i < 28 ? 3 : 4;
    for (let t = 0; t < 48 && sockets.length < count; t++) {
      const s = { x: num(70, 655), y: num(65, 308) };
      if (sockets.every((o) => dist(o, s) > 67) && stages.every((o) => dist(o, s) > 43)) sockets.push(s);
    }
    if (sockets.length !== count) continue;
    const distractors =
      i < 4
        ? ['bridge', 'bumper', 'bank', 'trampoline']
        : Object.keys(flightParts).concat('conveyor', 'trampoline', 'zipline', 'magnet', 'fan');
    board.fixtures = board.fixtures.filter((f) => f !== removed);
    board.sockets = shuffle(sockets);
    board.tray = shuffle([
      removed.kind,
      ...shuffle(distractors.filter((x) => x !== removed.kind)).slice(0, i < 4 ? 1 : i < 27 ? 2 : 3),
    ]);
    const fit = { part: removed.kind, socket: board.sockets.indexOf(mount) };
    const late = shuffle(
      result.points.filter(
        (q) =>
          q.t > last + 8 && inside(q) && dist(q, launch) > 62 && stages.every((s) => dist(s, q) > 27),
      ),
    ).slice(0, 23);
    for (const point of late) {
      const goals = [g(point, actor)];
      if (line.length >= 2 && i >= 12) {
        const middle = result.points.filter(
          (q) =>
            inside(q) && q.t > 10 && q.t < point.t - 10 && dist(q, point) > 63 && dist(q, launch) > 45,
        );
        if (middle.length) goals.unshift(g(pick(middle), actor, 'chime'));
      }
      const m = { ...board, goals };
      counts[1]++;
      if ([13, 14, 17, 18, 19, 34, 38, 39].includes(i)) {
        const arrival = trial(M, m, fit);
        if (arrival.state !== 'won') continue;
        goals.at(-1).window = { start: Math.max(0, arrival.tick - 3), duration: 7, period: 144 };
      }
      if (trial(M, m, null).state === 'won' || trial(M, m, fit).state !== 'won') continue;
      counts[2]++;
      const r = createRun(M, m, fit);
      while (r.state === 'running') advance(M, r);
      if (
        line.some(
          (k) =>
            !r.uses.some(
              (u) => u.kind === k && u.actor === actor && (k !== 'hopper' || u.action === 'hopped'),
            ),
        )
      )
        continue;
      if (parcel && !r.uses.some((u) => u.kind === 'switch')) continue;
      counts[3]++;
      const devices = m.fixtures.filter((s) => parts[s.kind]);
      if (
        devices.some(
          (f) =>
            trial(
              M,
              { ...m, fixtures: m.fixtures.map((s) => (s === f ? { ...s, disabled: true } : s)) },
              fit,
            ).state === 'won',
        )
      )
        continue;
      counts[4]++;
      if (
        [-3, -2, -1, 1, 2, 3].some(
          (n) => trial(M, m, fit, n).state !== 'won' || trial(M, m, null, n).state === 'won',
        )
      )
        continue;
      counts[5]++;
      let unique = true;
      for (const part of m.tray)
        for (let socket = 0; socket < count; socket++)
          if (part !== fit.part || socket !== fit.socket)
            if ([-2, 0, 2].some((n) => trial(M, m, { part, socket }, n).state === 'won')) unique = false;
      if (!unique) continue;
      m.note = (parcel ? 'The gold marble releases the blue parcel. ' : '') + hintFor[line.at(-1)];
      return {
        board: m,
        fit,
        tick: r.tick,
        uses: r.uses.map((u) => [u.kind, u.action, u.tick]),
        attempt,
      };
    }
  }
  throw Error('No reliable drawing for flight ' + (i + 1) + ' ' + counts.join('/'));
}
const [first = '0', end = '40', dir, salt = '0'] = process.argv.slice(2);
const drawings = [];
if (dir) fs.mkdirSync(dir, { recursive: true });
for (let i = +first; i < +end; i++) {
  const item = build(i, +salt);
  drawings.push(item.board);
  if (dir) fs.writeFileSync(dir + '/' + i + '.json', JSON.stringify(item));
  console.log(i + 361, item.fit, item.tick, item.uses, item.attempt);
}
if (+first === 0 && +end === 40 && !dir)
  fs.writeFileSync(
    new URL('../one-part-missing/flight-boards.js', import.meta.url),
    '// Physically certified station geometry. See scripts/author-flight-course.mjs.\nexport const flightBoards = [\n' +
      drawings.map((b) => '  ' + JSON.stringify(b) + ',').join('\n') +
      '\n];\n',
  );
