import { links, makeLinks, installRigging } from './rigging.js';
import { rotorBody } from './mechanisms.js';
import { instruments, installDevices } from './devices.js';

// Coordinates and velocities use the same 720 × 400 workbench for every screen.
export const WIDTH = 720;
export const HEIGHT = 400;
export const STEP = 1000 / 60;
export const LIMIT = 420;

const rail = (x, y, w, a = 0, h = 12) => ({ kind: 'rail', x, y, w, h, a });
const marble = (x, y, vx = 2.2, r = 12) => ({ kind: 'marble', x, y, r, vx });
const rocker = (x, y, w, a = 0) => ({ kind: 'rocker', x, y, w, h: 12, a, pivot: true });
const tile = (x, y, h) => ({ kind: 'tile', x, y, w: 12, h });
const gate = (kind, x, y, w = 46, h = 42) => ({ kind, x, y, w, h, sensor: true });
const socket = (x, y) => ({ x, y });

export const parts = {
  ...instruments,
  ...links,
  bridge: {
    name: 'Bridge',
    description: 'Span a gap',
    shape: { kind: 'bridge', w: 146, h: 12, a: 0.1 },
  },
  chute: {
    name: 'Return rail',
    description: 'Roll to the left',
    shape: { kind: 'chute', w: 126, h: 12, a: -0.46 },
  },
  bumper: {
    name: 'Rubber drum',
    description: 'Bounce off its rim',
    shape: { kind: 'bumper', r: 27, bounce: 1.09 },
  },
  weight: {
    name: 'Drop weight',
    description: 'Press a lever',
    shape: { kind: 'weight', w: 31, h: 34, density: 0.014 },
  },
  domino: { name: 'Tall domino', description: 'Pass the push', shape: { kind: 'tile', w: 12, h: 67 } },
};

export const machines = [
  {
    id: 'last-bell',
    title: 'The last bell',
    goal: 'Ring the brass bell.',
    description:
      'A marble rolls right and tips a pivoted lever. Socket A is in the gap before the bell. Socket B is below the lever.',
    success: 'The bell rang.',
    ball: marble(78, 61),
    fixtures: [
      rail(162, 110, 230, 0.22),
      rocker(351, 157, 153, 0.14),
      rail(306, 175, 26),
      rail(397, 185, 26),
    ],
    sockets: [socket(489, 203), socket(333, 288)],
    tray: ['bumper', 'bridge', 'chute'],
    goals: [gate('bell', 589, 236, 47, 54)],
  },
  {
    id: 'switchback',
    title: 'Wrong-way freight',
    description:
      'The upper ramp carries the marble to the right. Socket B is beyond its end. The flag waits below on the left.',
    goal: 'Send the marble back to the left-hand flag.',
    success: 'Flag raised.',
    ball: marble(74, 43),
    fixtures: [rail(195, 102, 290, 0.23), rail(320, 291, 180, -0.16)],
    sockets: [socket(241, 205), socket(403, 187)],
    tray: ['bridge', 'chute', 'bumper'],
    goals: [gate('flag', 209, 304, 52, 60)],
  },
  {
    id: 'high-note',
    title: 'The high note',
    description:
      'The marble drops off the launch rail above socket A. A hanging chime sits higher and farther to the right.',
    goal: 'Bounce the marble into the hanging chime.',
    success: 'The high note sounded.',
    ball: marble(96, 38),
    fixtures: [rail(203, 105, 245, 0.26)],
    sockets: [socket(380, 259), socket(534, 298)],
    tray: ['chute', 'bumper', 'bridge'],
    goals: [gate('chime', 488, 149, 61, 64)],
  },
  {
    id: 'counterweight',
    title: 'Heavy lifting',
    description:
      'A marble rests at the right end of a seesaw. Socket B hangs above the opposite end. The bell is overhead.',
    goal: 'Launch the waiting marble into the bell.',
    success: 'The lever lifted the marble.',
    ball: marble(463, 267, 0),
    fixtures: [rocker(390, 301, 194), rail(339, 319, 28), rail(465, 319, 35)],
    sockets: [socket(542, 183), socket(324, 126)],
    tray: ['bridge', 'bumper', 'weight'],
    goals: [gate('bell', 460, 174, 42, 44)],
  },
  {
    id: 'domino-post',
    title: 'Special delivery',
    description:
      'A row of upright dominoes runs to the flag. Socket A sits between two groups of tiles.',
    goal: 'Topple the last tile to trip the signal flag.',
    success: 'The signal is up.',
    ball: marble(87, 84),
    fixtures: [
      rail(181, 187, 239, 0.37),
      rail(455, 331, 439, 0, 18),
      ...[350, 380, 450, 480, 510, 540].map((x) => tile(x, 288, 67)),
    ],
    sockets: [socket(415, 288), socket(219, 249)],
    tray: ['weight', 'domino', 'bumper'],
    goals: [gate('flag', 583, 301, 21, 38)],
    striker: 'tile',
  },
  {
    id: 'three-chimes',
    title: 'Three-note waltz',
    description:
      'Two sloped tracks run beneath three chimes. Socket B sits between the tracks, and socket A is below them.',
    goal: 'Sound all three chimes from left to right.',
    success: 'All three chimes sounded.',
    ball: marble(71, 42),
    fixtures: [rail(162, 103, 231, 0.19), rail(530, 238, 220, 0.15)],
    sockets: [socket(503, 325), socket(351, 166)],
    tray: ['chute', 'bridge', 'bumper'],
    goals: [
      gate('chime', 202, 89, 30, 42),
      gate('chime', 473, 207, 28, 54),
      gate('chime', 638, 243, 38, 56),
    ],
  },
];

export function canFlip(machine, part) {
  return Boolean(machine.reversible && ['bridge', 'chute'].includes(part));
}

function validPlacement(machine, fit) {
  return Boolean(
    fit &&
    machine.tray.includes(fit.part) &&
    Number.isInteger(fit.socket) &&
    machine.sockets[fit.socket] &&
    (fit.flipped === undefined ||
      fit.flipped === false ||
      (fit.flipped === true && canFlip(machine, fit.part))),
  );
}
function cleanFit(fit) {
  return { part: fit.part, socket: fit.socket, ...(fit.flipped ? { flipped: true } : {}) };
}
export function fittings(machine, move) {
  if (!validPlacement(machine, move)) return [];
  if (!move.second) return [cleanFit(move)];
  const second = move.second;
  if (
    machine.capacity !== 2 ||
    !validPlacement(machine, second) ||
    second.second ||
    second.part === move.part ||
    second.socket === move.socket
  )
    return [];
  return [cleanFit(move), cleanFit(second)].sort((a, b) => a.socket - b.socket);
}
export function packFittings(placed) {
  const sorted = placed.map(cleanFit).sort((a, b) => a.socket - b.socket);
  return sorted[1] ? { ...sorted[0], second: sorted[1] } : sorted[0] || null;
}
export function validMove(machine, move) {
  return fittings(machine, move).length === (machine.capacity || 1);
}
export function placePart(machine, move, placement) {
  if (!validPlacement(machine, placement)) return move;
  if (machine.capacity !== 2) return cleanFit(placement);
  const remaining = fittings(machine, move).filter(
    (f) => f.socket !== placement.socket && f.part !== placement.part,
  );
  if (remaining.length === 2) return move;
  return packFittings([...remaining, placement]);
}
export function assembly(machine, move) {
  const shapes = [...machine.fixtures];
  for (const fit of fittings(machine, move)) {
    const shape = { ...parts[fit.part].shape, ...machine.sockets[fit.socket], fitted: true };
    if (shape.mirror && shape.a) shape.a = -shape.a;
    if (fit.flipped) shape.a = -shape.a;
    shapes.push(shape);
  }
  return [...shapes, machine.ball, ...machine.goals];
}

export function makeBody(M, shape) {
  const { kind } = shape;
  const moving = ['marble', 'cargo', 'rocker', 'tile', 'weight'].includes(kind);
  const options = {
    label: kind,
    angle: shape.a || 0,
    isStatic: !moving,
    isSensor: Boolean(shape.sensor || shape.field),
    frictionAir: 0.001,
    friction: kind === 'tile' ? 0.55 : 0.08,
    restitution: shape.bounce ?? 0.04,
    density: shape.density || 0.002,
    render: {
      color: shape.sensor ? '#ffc857' : shape.fitted ? '#ff9d59' : '#0abdc6',
    },
  };
  const { x, y } = shape;
  const body =
    kind === 'pinwheel'
      ? rotorBody(M, shape, options)
      : shape.r
        ? M.Bodies.polygon(x, y, 40, shape.r, options)
        : M.Bodies.rectangle(x, y, shape.w, shape.h, options);
  if (shape.bounce) body.restitution = shape.bounce;
  if (shape.r) body.circleRadius = shape.r;
  if (shape.vx) M.Body.setVelocity(body, { x: shape.vx, y: 0 });
  const pivot = shape.pivot
    ? M.Constraint.create({ pointA: { x, y }, bodyB: body, length: 0, stiffness: 1 })
    : null;
  return { body, pivot, shape };
}

export function createRun(M, machine, move = null, offset = 0) {
  const engine = M.Engine.create({ positionIterations: 8, velocityIterations: 6 });
  const items = assembly(machine, move).map((shape) =>
    makeBody(M, shape.kind === 'marble' ? { ...shape, x: shape.x + offset } : shape),
  );
  for (const { body, pivot } of items) M.Composite.add(engine.world, pivot ? [body, pivot] : body);
  const ball = items.find((i) => i.shape.kind === 'marble').body;
  const goals = items.filter((i) => i.shape.sensor);
  const run = {
    engine,
    items,
    ball,
    goals,
    gated: items.some((i) => i.shape.kind === 'hatch'),
    cargo: items.find((i) => i.shape.kind === 'cargo')?.body,
    striker: machine.striker || 'marble',
    hits: [],
    uses: [],
    tick: 0,
    state: 'running',
  };
  const tools = items.filter(({ shape }) => instruments[shape.kind] || shape.kind === 'outlet');
  if (tools.length) {
    const scene = {
      tools,
      marbles: items.filter((i) => ['marble', 'cargo'].includes(i.shape.kind)).map((i) => i.body),
    };
    installDevices(
      M,
      engine,
      () => scene,
      (tool, actor) => {
        run.uses.push({
          kind: tool.shape.kind,
          item: items.indexOf(tool),
          tick: run.tick,
          actor: actor.label,
        });
      },
    );
  }
  const wires = makeLinks(M, engine.world, items);
  if (wires.length)
    installRigging(
      M,
      engine,
      () => wires,
      (l, action) => {
        const item = items.findIndex((i) => i.body === l.rigMarker);
        run.uses.push({ kind: l.rig.kind, item, tick: run.tick, actor: 'rig', action });
      },
    );
  // Read passive fittings at the physical collision as well as the powered tools at activation.
  const passive = new Map();
  for (const [item, { shape, body }] of items.entries()) {
    if (!shape.fitted && !shape.labPiece) continue;
    const kind = shape.kind === 'tile' ? 'domino' : shape.kind;
    if (['bridge', 'chute', 'bumper', 'weight', 'domino'].includes(kind))
      passive.set(body, { item, kind, seen: new Set() });
  }
  M.Events.on(engine, 'collisionStart', ({ pairs }) => {
    for (const { bodyA, bodyB } of pairs) {
      if (passive.size) {
        const fitting = passive.get(bodyA) || passive.get(bodyB);
        if (fitting) {
          const other = passive.has(bodyA) ? bodyB : bodyA;
          const makesContact =
            fitting.kind === 'weight'
              ? other.label === 'rocker'
              : fitting.kind === 'domino'
                ? other.label === 'tile'
                : other === run.ball || other === run.cargo;
          if (makesContact && !fitting.seen.has(other.label)) {
            fitting.seen.add(other.label);
            run.uses.push({
              kind: fitting.kind,
              item: fitting.item,
              actor: other.label,
              tick: run.tick,
            });
          }
        }
      }
      const goal = goals[run.hits.length];
      const target = goal?.body;
      const striker = bodyA === target ? bodyB : bodyB === target ? bodyA : null;
      if (striker?.label === (goal?.shape.striker || run.striker)) run.hits.push(run.tick);
    }
  });
  return run;
}

export function advance(M, run) {
  if (run.state !== 'running') return;
  run.tick++;
  M.Engine.update(run.engine, STEP);
  if (run.hits.length === run.goals.length) run.state = 'won';
  else {
    const { x, y } = run.ball.position;
    const outside = y > HEIGHT + 70 || x > WIDTH + 65 || x < -65;
    const nextStriker = run.goals[run.hits.length]?.shape.striker || run.striker;
    const parcelLost =
      nextStriker === 'cargo' &&
      run.cargo &&
      (run.cargo.position.y > HEIGHT + 70 ||
        run.cargo.position.x < -65 ||
        run.cargo.position.x > WIDTH + 65 ||
        (run.gated && outside && !run.uses.some((u) => u.kind === 'switch')));
    // A tile can still trip the flag after the marble leaves the board.
    if (run.tick >= LIMIT || parcelLost || (outside && nextStriker === 'marble')) run.state = 'miss';
  }
}

export function trial(M, machine, move, offset = 0) {
  const run = createRun(M, machine, move, offset);
  while (run.state === 'running') advance(M, run);
  return { state: run.state, tick: run.tick, hits: run.hits };
}
