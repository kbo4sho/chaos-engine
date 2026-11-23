import M from 'matter-js';
import { courseMachine } from '../../one-part-missing/tool-course.js';
import { createRun, advance, trial } from '../../one-part-missing/machines.js';
import { certify } from '../../one-part-missing/workshop.js';
import { motionAt } from '../../one-part-missing/mechanisms.js';

const recipes = [
  'B',
  'T',
  'M',
  'W',
  'E',
  'C',
  'F',
  'D',
  'K',
  'I',
  'bE',
  'mD',
  'bW',
  'kF',
  'dC',
  'fB',
  'mWt',
  'eMb',
  'dRf',
  'pRtB',
];
const cargoParts = [
  'elevator',
  'conveyor',
  'cam',
  'tripwire',
  'trampoline',
  'deflector',
  'piston',
  'fan',
  'magnet',
  'pinwheel',
];
const distance = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
function observe(machine, move) {
  const r = createRun(M, machine, move);
  const cargo = r.items.find((it) => it.shape.kind === 'cargo')?.body;
  const path = [];
  while (r.state === 'running' && r.tick < 200) {
    advance(M, r);
    const b = cargo || r.ball;
    path.push({ x: b.position.x, y: b.position.y, t: r.tick });
    if (cargo && (b.position.y > 421 || b.position.x < -20 || b.position.x > 740)) break;
  }
  return { path, uses: r.uses, state: r.state };
}

export function buildRelay(index, build) {
  const globalIndex = 80 + index;
  const upstream = build(globalIndex, recipes[index]);
  const primary = certify(M, courseMachine(upstream, globalIndex))[0];
  const switchLocation = upstream.targets.at(-1).slice(1, 3);
  const fitsSwitch = index === 0 || index === 3 || index === 7;
  const fitsCargo = index >= 10;
  const intended = fitsSwitch ? 'switch' : fitsCargo ? cargoParts[index - 10] : primary.part;
  const instrument = [primary.part, ...upstream.sockets[primary.socket]];
  let state = (index + 11) * 19373;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const integer = (a, b) => Math.floor(a + (b - a + 1) * random());
  for (let attempt = 0; attempt < 4500; attempt++) {
    const hatchX = integer(80, 640),
      hatchY = integer(65, 135),
      dir = random() < 0.5 ? -1 : 1;
    if (Math.hypot(hatchX - switchLocation[0], hatchY - switchLocation[1]) < 140) continue;
    const tools = upstream.tools.map((tuple) => [...tuple]);
    if (fitsSwitch || fitsCargo) tools.push(instrument);
    if (!fitsSwitch) tools.push(['switch', ...switchLocation]);
    if (tools.some(([, x, y]) => Math.hypot(x - hatchX, y - hatchY) < 93)) continue;
    const board = {
      ...upstream,
      tools: [...tools, ['hatch', hatchX, hatchY, dir]],
      cargo: [hatchX + dir * integer(0, 19), hatchY - 24],
      targets: [['flag', 1000, 900, 28, 32, 'cargo']],
      sockets: upstream.sockets.map((mount) => [...mount]),
      tray: [...upstream.tray],
    };
    if (fitsCargo && (intended === 'fan' || attempt % 3 === 0)) {
      board.guides = [[hatchX + dir * 25, hatchY + 66, 96, dir * 0.36]];
    }
    const machine = () => courseMachine(board, globalIndex);
    let move = { ...primary };
    if (fitsSwitch || fitsCargo) {
      const socket = integer(0, 2);
      const fitting = fitsSwitch ? [...switchLocation, 1] : [hatchX, hatchY + 60, dir];
      const others = fitsCargo ? [cargoParts[(index - 8) % 10], 'switch'] : ['magnet', 'cam'];
      board.tray = [...new Set([intended, ...others, 'bridge'])];
      board.tray.push(...board.tray.splice(0, integer(0, board.tray.length - 1)));
      board.sockets = [
        [integer(70, 650), integer(115, 313), 1],
        [integer(70, 650), integer(115, 313), -1],
      ];
      board.sockets.splice(socket, 0, fitting);
      move = { part: intended, socket };
    }
    if (fitsCargo) {
      const empty = observe(machine(), null);
      const open = empty.uses.find((u) => u.kind === 'hatch');
      if (!open) continue;
      const options = empty.path.filter(
        (p) => p.t > open.tick + 12 && p.y > hatchY + 55 && p.y < 295 && p.x > 55 && p.x < 665,
      );
      if (!options.length) continue;
      const p = options[integer(0, options.length - 1)];
      let x = p.x,
        y = p.y;
      const direction = random() < 0.5 ? -1 : 1;
      switch (intended) {
        case 'elevator':
        case 'piston':
        case 'cam':
        case 'pinwheel': {
          const drift = motionAt({ kind: intended, x: 0, y: 0, dir: direction }, p.t);
          x += integer(-18, 18) - drift.x;
          y += integer(6, 24) - drift.y;
          break;
        }
        case 'fan':
          y += integer(22, 51);
          x += integer(-28, 28);
          break;
        case 'magnet':
          x += direction * integer(22, 48);
          break;
        case 'conveyor':
        case 'trampoline':
          y += 18;
          x += integer(-22, 22);
          break;
      }
      if (x < 53 || x > 667 || y < 55 || y > 325) continue;
      board.sockets[move.socket] = [Math.round(x), Math.round(y), direction];
    }
    if (
      board.sockets.some(
        ([x, y], i) =>
          board.sockets.some(([a, b], j) => j < i && Math.hypot(x - a, y - b) < 90) ||
          board.tools.some(([, a, b]) => Math.hypot(x - a, y - b) < 55),
      )
    )
      continue;
    const fitted = observe(machine(), move);
    const opened = fitted.uses.find((u) => u.kind === 'hatch');
    if (!opened || (fitsCargo && !fitted.uses.some((u) => u.kind === intended && u.actor === 'cargo')))
      continue;
    const possible = fitted.path.filter(
      (p) =>
        p.t > opened.tick + 10 &&
        p.x > 51 &&
        p.x < 669 &&
        p.y > 55 &&
        p.y < 330 &&
        board.sockets.every(([x, y]) => Math.hypot(p.x - x, p.y - y) > 55) &&
        board.tools.every(([, x, y]) => Math.hypot(p.x - x, p.y - y) > 57),
    );
    if (!possible.length) continue;
    for (const end of [possible.at(-1), possible[Math.floor(possible.length * 0.65)]]) {
      board.targets = [['flag', Math.round(end.x), Math.round(end.y), 30, 32, 'cargo']];
      const m = machine();
      if (![-3, -2, -1, 0, 1, 2, 3].every((n) => trial(M, m, move, n).state === 'won')) continue;
      const played = observe(m, move);
      if (
        !played.uses.some((u) => u.kind === primary.part) ||
        (fitsCargo && !played.uses.some((u) => u.actor === 'cargo' && u.kind === intended))
      )
        continue;
      // Both halves must matter. Disable one fixed tool, leaving its unpowered body in the rig.
      if (
        m.fixtures.some(
          (s) =>
            s.kind !== 'rail' &&
            s.kind !== 'cargo' &&
            s.kind !== 'outlet' &&
            trial(
              M,
              { ...m, fixtures: m.fixtures.map((f) => (f === s ? { ...f, disabled: true } : f)) },
              move,
            ).state === 'won',
        )
      )
        continue;
      const repairs = certify(M, m);
      if (repairs?.length !== 1 || repairs[0].part !== move.part || repairs[0].socket !== move.socket)
        continue;
      if (
        m.tray.some((part) =>
          m.sockets.some(
            (_, socket) =>
              (part !== move.part || socket !== move.socket) &&
              trial(M, m, { part, socket }).state === 'won',
          ),
        )
      )
        continue;
      return board;
    }
  }
  throw Error('Unable to arrange signal and cargo on level ' + (181 + index));
}
