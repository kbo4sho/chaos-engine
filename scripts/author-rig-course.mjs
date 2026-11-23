import fs from 'node:fs';
import M from 'matter-js';
import { rigMachine } from '../one-part-missing/rig-course.js';
import { createRun, advance, trial } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { links } from '../one-part-missing/rigging.js';

// First link, second link (when present), downstream tools, and missing component.
const recipes = [
  ['tether'],
  ['strut'],
  ['spring'],
  ['tether'],
  ['damper'],
  ['winch'],
  ['breaklink'],
  ['spring'],
  ['winch'],
  ['strut'],
  ['pulley'],
  ['pulley'],
  ['strut'],
  ['spring'],
  ['damper'],
  ['pulley'],
  ['winch'],
  ['tether'],
  ['breaklink'],
  ['pulley'],
  ['tether', '', 'fan'],
  ['spring', '', 'trampoline'],
  ['strut', '', 'conveyor'],
  ['spring', '', 'magnet'],
  ['damper', '', 'syrup'],
  ['breaklink', '', 'deflector'],
  ['winch', '', 'magnet'],
  ['pulley', '', 'conveyor'],
  ['tether', '', 'fan magnet'],
  ['pulley', '', 'repulsor fan'],
  ['tether', 'spring', 'magnet'],
  ['winch', 'spring', 'fan'],
  ['pulley', 'tether', 'trampoline'],
  ['strut', 'spring', 'conveyor'],
  ['pulley', 'damper', 'fan'],
  ['pulley', 'winch', 'magnet'],
  ['breaklink', 'spring', 'deflector'],
  ['pulley', 'spring', 'fan conveyor'],
  ['winch', 'tether', 'magnet trampoline'],
  ['pulley', 'damper', 'fan repulsor'],
];
const tag = (s) => s.kind + '|' + s.x + '|' + s.y;
const far = ['flag', 999, 999, 28, 32];
const margin = (p, pad = 28) => p.x > pad && p.x < 720 - pad && p.y > pad && p.y < 368;
function trace(m, move, offset = 0) {
  const r = createRun(M, m, move, offset),
    path = [];
  const target = r.cargo || r.ball;
  while (r.state === 'running' && r.tick < 150) {
    advance(M, r);
    const { x, y } = target.position;
    path.push({
      x,
      y,
      t: r.tick,
      vx: target.velocity.x,
      vy: target.velocity.y,
      bx: r.ball.position.x,
      by: r.ball.position.y,
    });
    if (y > 470 || x < -65 || x > 785) break;
  }
  return { path, state: r.state, uses: r.uses.map((u) => ({ ...u, key: tag(r.items[u.item].shape) })) };
}
function build(i) {
  let state = (i + 1) * 317441;
  const rnd = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const integer = (a, b) => Math.floor(a + rnd() * (b - a + 1)),
    pick = (a) => a[integer(0, a.length - 1)];
  const shuffle = (a) => {
    for (let j = a.length - 1; j > 0; j--) {
      const k = integer(0, j);
      [a[j], a[k]] = [a[k], a[j]];
    }
    return a;
  };
  const [first, second, chain = ''] = recipes[i];
  const chainKinds = chain.split(' ').filter(Boolean);
  const cargo = i >= 10 && (i < 20 || i >= 27);
  for (let attempt = 0; attempt < 6000; attempt++) {
    const mirror = rnd() < 0.5 ? -1 : 1,
      worldX = (x) => (mirror === 1 ? x : 720 - x);
    const ballX = integer(164, cargo ? 302 : 416),
      ballY = integer(85, 208),
      vx = (pick([-1, 1]) * integer(20, 72)) / 10;
    const board = {
      release: [worldX(ballX), ballY, vx * mirror, cargo ? integer(4, 15) / 1000 : 0.002],
      pegs: [],
      tools: [],
      sockets: [],
      tray: [],
      goals: [far],
    };
    if (cargo)
      board.parcel = [worldX(integer(350, 536)), integer(95, 225), (mirror * integer(-27, 27)) / 10];
    const ax = worldX(integer(185, 440)),
      ay = integer(43, 133);
    board.pegs = [
      [ax, ay],
      [worldX(integer(80, 190)), integer(77, 215)],
    ];
    if (
      Math.hypot(ax - board.release[0], ay - ballY) < 54 ||
      Math.hypot(ax - board.pegs[1][0], ay - board.pegs[1][1]) < 95
    )
      continue;
    const beam = (kind, order) => {
      const a = board.pegs[order];
      let from = 'peg' + order,
        to = cargo ? 'parcel' : 'runner',
        x = a[0],
        y = a[1];
      if (
        cargo &&
        (kind === 'pulley' ||
          (order === 1 && first !== 'pulley') ||
          (!second && i >= 10 && i < 20 && ![14, 16, 18].includes(i)))
      ) {
        from = 'runner';
        to = 'parcel';
        if (kind !== 'pulley') {
          x = Math.round((board.release[0] + board.parcel[0]) / 2);
          y = Math.round((ballY + board.parcel[1]) / 2);
        }
      } else if (second && order === 0 && kind !== 'pulley') to = 'runner';
      const rest =
        kind === 'breaklink'
          ? integer(97, 110) / 100
          : kind === 'tether'
            ? integer(92, 123) / 100
            : kind === 'spring' || kind === 'strut'
              ? integer(70, 126) / 100
              : kind === 'pulley'
                ? integer(92, 108) / 100
                : 1;
      return { kind, x, y, from, to, rest };
    };
    const wire = beam(first, 0),
      instruments = [wire];
    if (i === 0) wire.rest = 1.15;
    board.tools.push(wire);
    if (second) {
      const other = beam(second, 1);
      board.tools.push(other);
      instruments.push(other);
    }
    // An occasional shelf gives a parcel a physical landing before the rest of the rig acts.
    if (cargo && attempt % 4 === 0)
      board.rails = [[board.parcel[0] + mirror * 16, board.parcel[1] + 48, 97, mirror * 0.27]];
    const make = () => rigMachine(board, i);
    let current = trace(make(), null),
      last = 0;
    const hasAll = (result, tools) =>
      tools.every((t) =>
        result.uses.some((u) => u.key === tag(t) && (t.kind !== 'breaklink' || u.action === 'snapped')),
      );
    if (!hasAll(current, instruments) || (i === 0 && current.uses[0].tick < 8)) continue;
    let placed = true;
    for (const kind of chainKinds) {
      const candidates = shuffle(
        current.path.filter(
          (p) =>
            margin(p, 48) &&
            p.t > last + 5 &&
            p.t < 130 &&
            ((kind !== 'trampoline' && kind !== 'conveyor') || p.vy > 1) &&
            instruments.every((t) => Math.hypot(p.x - t.x, p.y - t.y) > 48),
        ),
      );
      let found = false;
      for (const p of candidates.slice(0, 12)) {
        const dir = p.vx < 0 ? -1 : 1;
        let x = p.x,
          y = p.y;
        if (kind === 'fan') y += integer(40, 77);
        if (['trampoline', 'conveyor'].includes(kind)) {
          x += dir * integer(4, 20);
          y += 18;
        }
        if (kind === 'magnet' || kind === 'repulsor') {
          x += pick([-1, 1]) * integer(18, 46);
          y += pick([-1, 1]) * integer(18, 41);
        }
        const s = { kind, x: Math.round(x), y: Math.round(y), dir };
        if (!margin(s, 45) || board.tools.some((t) => Math.hypot(s.x - t.x, s.y - t.y) < 52)) continue;
        board.tools.push(s);
        const next = trace(make(), null),
          hit = next.uses.find((u) => u.key === tag(s) && (!cargo || u.actor === 'cargo'));
        if (hit && hit.tick > last + 2 && hasAll(next, instruments)) {
          instruments.push(s);
          current = next;
          last = hit.tick;
          found = true;
          break;
        }
        board.tools.pop();
      }
      if (!found) {
        placed = false;
        break;
      }
    }
    if (!placed) continue;
    const missing =
      instruments[
        i < 20
          ? 0
          : i < 30
            ? i % 2 === 0
              ? 0
              : instruments.length - 1
            : i % 3 === 0
              ? 0
              : i % 3 === 1
                ? 1
                : instruments.length - 1
      ];
    const index = board.tools.indexOf(missing);
    board.tools.splice(index, 1);
    const { kind: part, ...mount } = missing;
    const target = cargo ? 'parcel' : 'runner';
    const spare = {
      x: board.pegs[1][0],
      y: board.pegs[1][1],
      from: 'peg1',
      to: target,
      rest: mount.rest || 1,
    };
    if (
      Math.hypot(mount.x - spare.x, mount.y - spare.y) < 63 ||
      (mount.from === spare.from && mount.to === spare.to)
    ) {
      spare.x = board.pegs[0][0];
      spare.y = board.pegs[0][1];
      spare.from = 'peg0';
      spare.to = cargo && mount.to === 'parcel' ? 'runner' : target;
    }
    if (Math.hypot(mount.x - spare.x, mount.y - spare.y) < 57) continue;
    if (!links[part]) {
      delete spare.from;
      delete spare.to;
      delete spare.rest;
    }
    board.sockets = shuffle([mount, spare]);
    if (i >= 6) {
      const third = { x: worldX(integer(486, 614)), y: integer(77, 285), dir: 1 };
      if (links[part]) {
        if (cargo) {
          Object.assign(third, { from: 'runner', to: 'parcel', rest: 1.33 });
        } else {
          board.pegs.push([third.x, third.y]);
          Object.assign(third, { from: 'peg2', to: 'runner', rest: 1.05 });
        }
      }
      if (board.sockets.every((s) => Math.hypot(s.x - third.x, s.y - third.y) > 68))
        board.sockets.push(third);
    }
    const others = links[part]
      ? Object.keys(links).filter((k) => k !== part && (k !== 'pulley' || cargo))
      : ['fan', 'magnet', 'bumper', 'conveyor', 'trampoline', 'syrup'].filter((k) => k !== part);
    const tray = shuffle(others).slice(0, i < 2 ? 1 : i < 20 ? 2 : 3);
    board.tray = shuffle([part, ...tray]);
    const move = { part, socket: board.sockets.indexOf(mount) };
    current = trace(make(), move);
    if (!hasAll(current, instruments)) continue;
    last = Math.max(
      ...instruments.map(
        (t) =>
          current.uses.find(
            (u) => u.key === tag(t) && (t.kind !== 'breaklink' || u.action === 'snapped'),
          ).tick,
      ),
    );
    const dead = trace(make(), null).path;
    const ablations = board.tools.map((t) => {
      const m = make();
      m.fixtures.find((f) => tag(f) === tag(t)).disabled = true;
      return trace(m, move).path;
    });
    const points = shuffle(
      current.path.filter(
        (p) =>
          p.t > last + 4 &&
          p.t > 18 &&
          margin(p, 48) &&
          Math.hypot(
            p.x - (board.parcel || board.release)[0],
            p.y - (board.parcel || board.release)[1],
          ) > 62 &&
          board.sockets.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 50) &&
          board.tools.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 46) &&
          [dead, ...ablations].every((path) =>
            path.every((q) => Math.abs(q.x - p.x) > 30 || Math.abs(q.y - p.y) > 33),
          ),
      ),
    );
    for (const p of points.slice(0, 7)) {
      board.goals = [[pick(['flag', 'bell', 'chime']), Math.round(p.x), Math.round(p.y), 28, 32]];
      const m = make(),
        r = trace(m, move);
      if (r.state !== 'won' || !hasAll(r, instruments)) continue;
      if (r.path.some((q) => q.y < 10 || q.x < 11 || q.x > 709 || q.by < 8 || q.by > 402)) continue;
      if (![-3, -2, -1.5, -1, 0, 1, 1.5, 2, 3].every((n) => trial(M, m, move, n).state === 'won'))
        continue;
      if (
        m.fixtures.some(
          (f) =>
            (f.wire || board.tools.some((t) => tag(t) === tag(f))) &&
            trial(
              M,
              { ...m, fixtures: m.fixtures.map((s) => (s === f ? { ...s, disabled: true } : s)) },
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
              (k !== part || s !== move.socket) && trial(M, m, { part: k, socket: s }).state === 'won',
          ),
        )
      )
        continue;
      return board;
    }
  }
  throw Error('No rig for level ' + (i + 201));
}
const output = new URL('../one-part-missing/rig-boards.js', import.meta.url);
const single = process.argv[2];
if (single) {
  const index = Number(single) - 201;
  if (!Number.isInteger(index) || index < 0 || index >= recipes.length)
    throw Error('Choose a level from 201 to 240.');
  console.log(JSON.stringify(build(index)));
} else {
  const boards = recipes.map((_, i) => {
    const board = build(i);
    console.log('Certified rig', i + 201);
    return board;
  });
  fs.writeFileSync(
    output,
    '// Fixed rigging apparatus and receivers.\nexport const rigBoards = [\n' +
      boards.map((b) => '  ' + JSON.stringify(b) + ',').join('\n') +
      '\n];\n',
  );
}
