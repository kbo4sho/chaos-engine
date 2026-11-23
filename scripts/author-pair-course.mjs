// Remove two different working tools, change the release, then choose a receiver from the resulting motion.
// A board is kept only when every one-part trial misses and a single two-part arrangement works.
import fs from 'node:fs';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { pairMachine } from '../one-part-missing/pair-course.js';
import {
  parts,
  assembly,
  createRun,
  advance,
  trial,
  packFittings,
} from '../one-part-missing/machines.js';
import { instruments } from '../one-part-missing/devices.js';
import { certify, possibilities } from '../one-part-missing/certify.js';
const preferences = [
  [105, 106, 107, 109, 110],
  [106, 108, 110, 117],
  [117, 118, 116, 115],
  [109, 107, 110, 119],
  [123, 126, 128, 129],
  [114, 118, 127, 119],
  [134, 135, 136, 139],
  [137, 138, 140, 135],
  [141, 143, 145, 146],
  [147, 148, 149, 150],
  [165, 166, 168, 170],
  [166, 169, 165, 168],
  [175, 176, 177, 178],
  [169, 174, 176, 179],
  [170, 177, 178, 179],
  [174, 176, 179, 180],
  [168, 170, 178, 179],
  [180, 176, 177, 175],
  [184, 185, 187, 188],
  [190, 189, 186, 185],
  [181, 182, 184, 185],
  [222, 224, 231, 232],
  [226, 237, 230, 227],
  [228, 233, 236, 240],
  [221, 227, 228, 235],
  [232, 236, 239, 229],
  [223, 234, 231, 224],
  [188, 189, 190, 191],
  [238, 236, 239, 240],
  [235, 240, 238, 239],
  [151, 154, 159, 160],
  [155, 156, 157, 160],
  [191, 192, 194, 198],
  [158, 160, 156, 159],
  [193, 195, 196, 197],
  [198, 199, 197, 193],
  [196, 198, 199, 200],
  [197, 194, 199, 200],
  [199, 198, 200, 196],
  [200],
];
const removeMetadata = (s) => {
  const { fitted, ...shape } = s;
  return shape;
};
const isTool = (s) => Boolean(s.wire || Object.hasOwn(instruments, s.kind));
const stock = new Map();
function baseline(n) {
  if (!stock.has(n)) {
    const m = campaign[n - 1],
      move = certify(M, m)[0];
    stock.set(n, {
      m,
      shapes: assembly(m, move)
        .filter((s) => !s.sensor && s.kind !== 'marble')
        .map(removeMetadata),
    });
  }
  return stock.get(n);
}
function build(index) {
  let state = (index + 1) * 9293281;
  const rnd = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const int = (a, b) => Math.floor(a + rnd() * (b - a + 1)),
    choose = (a) => a[int(0, a.length - 1)];
  const shuffle = (a) => {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      [a[j], a[i]] = [a[i], a[j]];
    }
    return a;
  };
  const chapter = Math.floor(index / 10),
    socketsNeeded = index < 3 ? 2 : index < 34 ? 3 : 4,
    traySize = index < 3 ? 2 : index < 22 ? 3 : 4;
  const offsets = [-3, -2, -1, 0, 1, 2, 3];
  for (let attempt = 0; attempt < 700; attempt++) {
    const range = preferences[index],
      n = range[attempt % range.length],
      { m, shapes } = baseline(n);
    const dx = int(-22, 22),
      dy = int(-10, 10),
      reflect = rnd() < 0.5;
    const shift = (s) => {
      const t = { ...s, x: (reflect ? 720 - s.x : s.x) + dx, y: s.y + dy };
      if (reflect) {
        if (s.a) t.a = -s.a;
        if (s.vx) t.vx = -s.vx;
        if (instruments[s.kind] || s.dir) t.dir = -(s.dir || 1);
      }
      return t;
    };
    const fixed = shapes.map(shift);
    const devices = fixed.filter(isTool),
      cased = shuffle(devices);
    const a = cased[0],
      b = cased.find((s) => s.kind !== a?.kind && Math.hypot(s.x - a.x, s.y - a.y) > 67);
    if (!a || !b || (index === 39 && devices.length < 7)) continue;
    // The opening two puzzles place the functional parts at the two labeled mounts.
    const mount = (s) => {
      const result = { x: s.x, y: s.y };
      for (const k of ['dir', 'rest', 'from', 'to', 'length']) if (s[k] !== undefined) result[k] = s[k];
      return result;
    };
    const A = mount(a),
      B = mount(b),
      sockets = [A, B],
      activeParts = [a.kind, b.kind];
    const release = shift(m.ball);
    release.x += int(-9, 9);
    release.vx = ((release.vx || 0) * int(91, 111)) / 100;
    const fixtures = fixed.filter((f) => f !== a && f !== b);
    if (fixtures.some((f) => f.x < 12 || f.x > 708 || f.y < 10 || f.y > 367)) continue;
    for (let j = 0; sockets.length < socketsNeeded && j < 24; j++) {
      const d = { x: int(100, 590), y: int(78, 300), dir: rnd() < 0.5 ? 1 : -1 };
      if (
        sockets.every((s) => Math.hypot(s.x - d.x, s.y - d.y) > 78) &&
        fixtures.every((s) => Math.hypot(s.x - d.x, s.y - d.y) > 37)
      )
        sockets.push(d);
    }
    if (sockets.length !== socketsNeeded) continue;
    // Every socket accepts each drawer fitting, including two-body fittings.
    if (a.wire || b.wire) {
      const bodies = [release, ...fixtures].filter((f) => f.node);
      for (const s of sockets)
        if (!s.from) {
          const ref = choose([a, b].filter((t) => t.wire));
          const to = ref.to,
            options = bodies.filter((f) => f.node !== to);
          const end = choose(options);
          s.to = to;
          s.from = end.node;
          s.rest = choose([0.88, 1, 1.15]);
        }
    }
    const alternatives = shuffle([
      ...new Set([
        ...m.tray,
        'conveyor',
        'trampoline',
        'magnet',
        'fan',
        'syrup',
        'pinwheel',
        'deflector',
        'repulsor',
      ]),
    ]).filter((k) => !activeParts.includes(k) && (!parts[k].shape.wire || sockets.every((s) => s.from)));
    const tray = shuffle([...activeParts, ...alternatives.slice(0, traySize - 2)]);
    const goals = m.goals.map(shift),
      last = goals.at(-1),
      startGoal = { ...last };
    last.x = 1300;
    last.y = 900;
    const board = { ball: release, fixtures, sockets: shuffle(sockets), tray, goals };
    const move = packFittings([
      { part: a.kind, socket: board.sockets.indexOf(A) },
      { part: b.kind, socket: board.sockets.indexOf(B) },
    ]);
    const machine = pairMachine(board, index),
      r = createRun(M, machine, move),
      targets = [];
    let clear = true;
    while (r.state === 'running') {
      advance(M, r);
      const ball = r.cargo || r.ball,
        { x, y } = ball.position;
      if (x < 9 || x > 711 || y < 8 || y > 388) clear = false;
      if (!clear || r.tick % 3 || r.hits.length !== goals.length - 1) continue;
      if (
        r.items.some(
          (it, i) =>
            isTool(it.shape) &&
            !r.uses.some(
              (u) => u.item === i && (it.shape.kind !== 'breaklink' || u.action === 'snapped'),
            ),
        )
      )
        continue;
      if (
        x < 40 ||
        x > 680 ||
        y < 48 ||
        y > 334 ||
        board.sockets.some((s) => Math.hypot(s.x - x, s.y - y) < 54)
      )
        continue;
      if (
        Math.hypot(x - startGoal.x, y - startGoal.y) > 94 ||
        targets.some((p) => Math.hypot(p.x - x, p.y - y) < 12)
      )
        continue;
      targets.push({ x: Math.round(x), y: Math.round(y) });
    }
    for (const point of shuffle(targets).slice(0, 6)) {
      Object.assign(last, point);
      if (!offsets.every((o) => trial(M, machine, move, o).state === 'won')) continue;
      if (!offsets.every((o) => trial(M, machine, null, o).state === 'miss')) continue;
      if (
        fixtures.some(
          (f) =>
            isTool(f) &&
            trial(
              M,
              { ...machine, fixtures: fixtures.map((s) => (s === f ? { ...s, disabled: true } : s)) },
              move,
            ).state === 'won',
        )
      )
        continue;
      if (
        machine.tray.some((part) =>
          machine.sockets.some((_, socket) =>
            offsets.some((o) => trial(M, machine, { part, socket }, o).state === 'won'),
          ),
        )
      )
        continue;
      const verified = certify(M, machine);
      if (verified?.length !== 1 || JSON.stringify(verified[0]) !== JSON.stringify(move)) continue;
      if (
        [...possibilities(machine)].some(
          (p) =>
            JSON.stringify(p) !== JSON.stringify(move) &&
            offsets.some((o) => trial(M, machine, p, o).state === 'won'),
        )
      )
        continue;
      return board;
    }
  }
  throw Error('No paired challenge ' + (241 + index));
}
const single = process.argv[2];
if (single) {
  const i = Number(single) - 241;
  if (!Number.isInteger(i) || !preferences[i]) throw Error('Choose a level from 241 through 280.');
  console.log(JSON.stringify(build(i)));
} else {
  const all = preferences.map((_, i) => {
    const board = build(i);
    console.log('Certified', 241 + i);
    return board;
  });
  fs.writeFileSync(
    new URL('../one-part-missing/pair-boards.js', import.meta.url),
    '// Two-part machines and receivers.\nexport const pairBoards = [\n' +
      all.map((b) => '  ' + JSON.stringify(b) + ',').join('\n') +
      '\n];\n',
  );
}
