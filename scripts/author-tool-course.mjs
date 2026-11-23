// Bake the targets once. Gameplay never adjusts equipment or receivers to make a shot land.
import { buildRelay } from './lib/author-relay-boards.mjs';
import { motionAt } from '../one-part-missing/mechanisms.js';
import fs from 'node:fs';
import M from 'matter-js';
import { createRun, advance, trial } from '../one-part-missing/machines.js';
import { courseMachine } from '../one-part-missing/tool-course.js';
import { certify } from '../one-part-missing/workshop.js';

const key = {
  B: 'conveyor',
  T: 'trampoline',
  F: 'fan',
  M: 'magnet',
  D: 'deflector',
  S: 'syrup',
  P: 'portal',
  R: 'repulsor',
  C: 'cam',
  E: 'elevator',
  I: 'piston',
  W: 'pinwheel',
  K: 'tripwire',
};
// Uppercase is the missing fitting. A lesson then changes its approach, order or partner.
const recipes = [
  'B T B T bT tB Bt tT Tb bTb',
  'F M F M tF bM fB mT Mf fMb',
  'D S D S bS bD sF dT sB dSt',
  'P R P R pT mP bP mR Pt pRb',
  'bFm sTb dBt mPs fRb rMt pSd tFm dPb mTr',
  'fRbp bMtf pDbt tSfp bDrm mFbt rPds bTrp dMfb prtB',
].flatMap((chapter) => chapter.split(' '));
const clockRecipes = ['E C E C eB cT bE tC eMb cFt', 'I W K I W K iB wK cIf mWe'].flatMap((s) =>
  s.split(' '),
);
const between = (n, low, high) => n >= low && n <= high;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const within = (p) => between(p.x, 56, 664) && between(p.y, 45, 326);
const point = (tuple) => ({ x: tuple[1], y: tuple[2] });
const farReceiver = ['bell', 950, 950, 25, 28];

function trace(machine, move, offset = 0) {
  const r = createRun(M, machine, move, offset),
    path = [];
  while (r.state === 'running' && r.tick < 205) {
    advance(M, r);
    const { x, y } = r.ball.position;
    path.push({ x, y, t: r.tick, vx: r.ball.velocity.x, vy: r.ball.velocity.y });
  }
  return { path, uses: r.uses.map((u) => ({ ...u, ...r.items[u.item].shape })) };
}

export function build(i, recipe) {
  let seed = (i + 1) * 61717;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const integer = (a, b) => Math.floor(a + (b - a + 1) * rnd());
  const pick = (a) => a[integer(0, a.length - 1)];
  const shuffle = (a) => {
    for (let j = a.length - 1; j > 0; j--) {
      const k = integer(0, j);
      [a[j], a[k]] = [a[k], a[j]];
    }
    return a;
  };
  const sequence = [...recipe].map((s) => key[s.toUpperCase()]);
  const missing = [...recipe].findIndex((s) => s === s.toUpperCase());
  const intended = sequence[missing];
  for (let attempt = 0; attempt < 9000; attempt++) {
    const dir = i === 0 ? 1 : i === 2 ? -1 : rnd() < 0.5 ? -1 : 1;
    const releaseX = dir === 1 ? integer(56, 170) : integer(550, 664);
    const release = [releaseX, integer(32, 86), (dir * integer(30, 74)) / 10];
    const rail =
      (attempt + i) % 3 === 0
        ? [releaseX + dir * 57, release[1] + 49, 145, (dir * integer(11, 34)) / 100]
        : null;
    const board = { release, rail, tools: [], sockets: [], tray: [], targets: [farReceiver] };
    const blank = () => courseMachine(board, i);
    let current = trace(blank(), null),
      lastTick = rail ? 17 : 0,
      lastPoint = { x: release[0], y: release[1] };
    const positions = [];
    for (const kind of sequence) {
      const options = shuffle(
        current.path.filter(
          (p) =>
            within(p) &&
            p.t > lastTick + 4 &&
            p.t < lastTick + 70 &&
            distance(p, lastPoint) > 45 &&
            ((kind !== 'trampoline' && kind !== 'conveyor') || p.vy > 1.5),
        ),
      );
      const old = board.tools.length;
      let placed = false;
      for (const p of options.slice(0, 8)) {
        let x = p.x,
          y = p.y,
          orientation = p.vx < 0 ? -1 : 1;
        if (kind === 'conveyor' || kind === 'trampoline') {
          y += 18;
          x += orientation * integer(7, 29);
          if (kind === 'conveyor' && i > 2 && rnd() < 0.3) orientation *= -1;
        } else if (['cam', 'elevator', 'piston', 'pinwheel'].includes(kind)) {
          const drift = motionAt({ kind, x: 0, y: 0, dir: orientation }, p.t);
          if (kind === 'piston') {
            x -= orientation * integer(7, 28) + drift.x;
            y += integer(-15, 15);
          } else if (kind === 'pinwheel') {
            x += orientation * integer(-15, 15);
            y += integer(13, 33);
          } else {
            x += orientation * integer(-12, 20) - drift.x;
            y += (kind === 'cam' ? 28 : 17) - drift.y;
          }
        } else if (kind === 'fan') {
          y += integer(34, 76);
        } else if (kind === 'repulsor' || kind === 'magnet') {
          x += integer(-50, 50);
          y += pick([-1, 1]) * integer(19, 50);
        } else if (kind === 'deflector') {
          orientation *= rnd() < 0.7 ? 1 : -1;
        }
        const tuple = [kind, Math.round(x), Math.round(y), orientation],
          pos = point(tuple);
        if (!within(pos) || board.tools.some((q) => distance(pos, point(q)) < 58)) continue;
        board.tools.push(tuple);
        if (kind === 'portal') {
          const exit = ['outlet', integer(110, 610), integer(65, 226)];
          if (
            distance(point(exit), pos) < 157 ||
            board.tools.slice(0, old).some((q) => distance(point(exit), point(q)) < 82)
          ) {
            board.tools.length = old;
            continue;
          }
          board.tools.push(exit);
        }
        const next = trace(blank(), null);
        const firstUse = next.uses.find((u) => u.kind === kind && u.x === tuple[1] && u.y === tuple[2]);
        if (
          firstUse &&
          (positions.length === 0 || firstUse.tick > lastTick + 2) &&
          positions.every((prev) =>
            next.uses.some(
              (u) => u.kind === prev[0] && u.x === prev[1] && u.y === prev[2] && u.tick < firstUse.tick,
            ),
          )
        ) {
          current = next;
          lastTick = firstUse.tick;
          lastPoint = point(board.tools.at(-1));
          positions.push(tuple);
          placed = true;
          break;
        }
        board.tools.length = old;
      }
      if (!placed) break;
    }
    if (positions.length !== sequence.length) continue;
    const correct = positions[missing],
      badPaths = [];
    for (const tuple of positions) {
      const m = blank();
      m.fixtures.find((s) => s.kind === tuple[0] && s.x === tuple[1] && s.y === tuple[2]).disabled =
        true;
      badPaths.push(trace(m, null).path);
    }
    const endOptions = shuffle(
      current.path.filter(
        (p) =>
          within(p) &&
          p.t >= lastTick + 5 &&
          board.tools.every((q) => distance(p, point(q)) > 53) &&
          badPaths.every((path) =>
            path.every((q) => Math.abs(q.x - p.x) > 30 || Math.abs(q.y - p.y) > 33),
          ),
      ),
    );
    if (!endOptions.length) continue;
    board.tools = board.tools.filter((q) => q !== correct);
    const mount = correct.slice(1);
    const sockets = [mount];
    const count = i >= 60 ? (i % 10 < 2 ? 2 : 3) : i < 2 ? 1 : i < 20 ? 2 : i < 45 ? 3 : 4;
    for (let j = 0; sockets.length < count && j < 60; j++) {
      const pos = { x: integer(94, 626), y: integer(100, 305) };
      if (
        sockets.some(([x, y]) => distance(pos, { x, y }) < 110) ||
        board.tools.some((q) => distance(point(q), pos) < 66) ||
        endOptions.slice(0, 2).some((p) => distance(p, pos) < 56)
      )
        continue;
      sockets.push([pos.x, pos.y, rnd() < 0.5 ? 1 : -1]);
    }
    if (sockets.length !== count) continue;
    board.sockets = shuffle(sockets);
    const move = { part: intended, socket: board.sockets.indexOf(mount) };
    const known = [
      'bridge',
      'bumper',
      ...new Set(
        [...recipes, ...clockRecipes]
          .slice(0, i + 1)
          .join('')
          .toUpperCase()
          .split('')
          .map((s) => key[s]),
      ),
    ];
    const others = shuffle(
      known.filter((k) => k !== intended && (k !== 'portal' || sequence.includes(k))),
    );
    board.tray = shuffle([intended, ...others.slice(0, i < 2 ? 1 : i < 30 ? 2 : 3)]);
    for (const end of endOptions.slice(0, 5)) {
      const final = [pick(['chime', 'flag', 'bell']), Math.round(end.x), Math.round(end.y), 28, 32];
      board.targets = [final];
      if (sequence.length >= 3) {
        const middle = current.path.filter(
          (p) =>
            within(p) &&
            p.t > 7 &&
            p.t < end.t - 5 &&
            distance(p, end) > 105 &&
            board.tools.every((q) => distance(p, point(q)) > 50) &&
            sockets.every(([x, y]) => distance(p, { x, y }) > 55),
        );
        if (!middle.length) continue;
        const p = middle[Math.floor(middle.length * 0.57)];
        board.targets.unshift(['chime', Math.round(p.x), Math.round(p.y), 30, 34]);
      }
      const machine = blank();
      const offsets =
        i >= 60 ? Array.from({ length: 25 }, (_, j) => (j - 12) / 4) : [-3, -2, -1, 0, 1, 2, 3];
      const ok = offsets.every((n) => trial(M, machine, move, n).state === 'won');
      if (!ok) continue;
      if (
        i >= 60 &&
        [-0.007, 0.007].some((d) =>
          [-3, -1, 0, 1, 3].some(
            (n) =>
              trial(M, { ...machine, ball: { ...machine.ball, vx: machine.ball.vx + d } }, move, n)
                .state !== 'won',
          ),
        )
      )
        continue;
      if (
        i >= 60 &&
        machine.fixtures.some(
          (fixture) =>
            fixture.kind !== 'rail' &&
            fixture.kind !== 'outlet' &&
            trial(
              M,
              {
                ...machine,
                fixtures: machine.fixtures.map((s) => (s === fixture ? { ...s, disabled: true } : s)),
              },
              move,
            ).state === 'won',
        )
      )
        continue;
      const repairs = certify(M, machine);
      if (repairs?.length !== 1) continue;
      // Reject lucky center-line alternatives as well as fully robust alternatives.
      if (
        board.tray.some((part) =>
          sockets.some(
            (_, socket) =>
              (part !== intended || socket !== move.socket) &&
              trial(M, machine, { part, socket }).state === 'won',
          ),
        )
      )
        continue;
      const fitted = trace(machine, move);
      if (
        [-3, 0, 3].some((offset) =>
          trace(machine, move, offset).path.some(
            (p) => !between(p.x, 13, 707) || !between(p.y, 13, 385),
          ),
        )
      )
        continue;
      if (
        !positions.every((q) => fitted.uses.some((u) => u.kind === q[0] && u.x === q[1] && u.y === q[2]))
      )
        continue;
      return board;
    }
  }
  throw Error('Could not author ' + (i + 101) + ' ' + recipe);
}
export function saveBoards(name, boards) {
  const file = new URL('../one-part-missing/' + name + '-boards.js', import.meta.url);
  fs.writeFileSync(
    file,
    '// Fixed release, mount and receiver coordinates for the ' +
      (name === 'tool' ? 'powered tool' : 'clockwork') +
      ' course.\nexport const ' +
      name +
      'Boards = [\n' +
      boards.map((b) => '  ' + JSON.stringify(b) + ',').join('\n') +
      '\n];\n',
  );
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const clock = process.argv.includes('--clock');
  const boards = (clock ? clockRecipes : recipes).map((recipe, index) => {
    const i = index + (clock ? 60 : 0);
    const board = build(i, recipe);
    console.log('Certified', i + 101, recipe);
    return board;
  });
  if (clock) {
    for (let i = 0; i < 20; i++) {
      boards.push(buildRelay(i, build));
      console.log('Certified relay', 181 + i);
    }
  }
  saveBoards(clock ? 'clock' : 'tool', boards);
}
