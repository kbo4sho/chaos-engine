import {advancedLessons,advancedFraming,advancedExposures} from './advanced-experiments.js';
import { parts, createRun, advance } from '../machines.js';
import { driveMachine } from '../drive-course.js';
import { snapshot } from '../drawing.js';

const tool = (kind, x, y, settings = {}) => ({ ...parts[kind].shape, x, y, ...settings });
const ball = (x, y, vx = 0, r = 11) => ({ kind: 'marble', node: 'runner', x, y, vx, r });
const cargo = (x, y, r = 11) => ({ kind: 'cargo', node: 'parcel', x, y, r, density: 0.0014 });
const peg = (x, y) => ({ kind: 'eyelet', node: 'post', field: true, x, y, r: 6 });
const dummy = { kind: 'flag', x: 1600, y: 950, w: 20, h: 24, sensor: true };
const board = (release, fixtures, actor = 'marble') => ({
  ball: release,
  fixtures,
  goals: [{ ...dummy, striker: actor }],
  sockets: [],
  tray: [],
});

// Each second rig changes a physical constraint: release, pivot, track,
// cargo diameter or linkage. The same adjustment has to travel to a new rig.
function rig(kind, transfer, value) {
  const post = transfer ? [347, 85] : [299, 86];
  const bob = transfer ? ball(415, 170, -3.3) : ball(208, 145, 3.8);
  if (kind === 'pulley') {
    bob.density = 0.008;
    return board(
      bob,
      [
        cargo(transfer ? 212 : 447, transfer ? 144 : 182),
        tool(kind, value, transfer ? 65 : 89, { from: 'runner', to: 'parcel', rest: 0.96 }),
      ],
      'cargo',
    );
  }
  return board(bob, [peg(...post), tool(kind, ...post, { from: 'post', to: 'runner', length: value })]);
}
function signals(kind, transfer, value) {
  const startX = transfer ? 378 : 193;
  if (kind === 'tripwire')
    return board(ball(startX, transfer ? 61 : 40, transfer ? 1.1 : -0.6), [
      tool('tripwire', startX + (transfer ? 15 : -10), value, { dir: transfer ? -1 : 1, w: 105 }),
    ]);
  const x = transfer ? 220 : 454,
    hatchY = transfer ? 166 : 129;
  if (kind === 'hatch')
    return board(
      ball(startX, transfer ? 49 : 37),
      [
        tool('switch', startX, 109, { link: transfer ? 'B' : 'A' }),
        tool('switch', startX, 208, { link: transfer ? 'A' : 'B' }),
        tool('hatch', x, hatchY, { dir: 1, link: value }),
        cargo(x + 8, hatchY - 18),
      ],
      'cargo',
    );
  return board(
    ball(startX, transfer ? 55 : 40),
    [
      tool('switch', startX, value, { link: 'gate' }),
      tool('hatch', x, hatchY, { dir: 1, link: 'gate' }),
      cargo(x + (transfer ? -8 : 11), hatchY - 18),
    ],
    'cargo',
  );
}
function drives(kind, transfer, value) {
  const input = {
    x: transfer ? 202 : 150,
    y: transfer ? 125 : 172,
    r: transfer ? 29 : 36,
    spin: kind === 'motor' ? 0 : transfer ? -0.16 : 0.2,
    density: 0.012,
  };
  const arm = kind === 'gearbox',
    direction = transfer ? -1 : 1;
  const output = arm
    ? {
        mode: 'arm',
        x: transfer ? 469 : 532,
        y: transfer ? 131 : 198,
        axle: transfer ? [470, 205] : [451, 198],
        density: 0.002,
      }
    : {
        mode: 'slide',
        x: transfer ? 535 : 284,
        y: transfer ? 231 : 208,
        guide: [72, 650],
        density: 0.003,
      };
  const tools = arm
    ? [{ kind, from: 'drive', to: 'parcel', x: 308, y: 188, ratio: value }]
    : [
        {
          kind: 'rack',
          from: 'drive',
          to: 'parcel',
          x: 307,
          y: 197,
          pitch: kind === 'rack' ? value : 30,
        },
      ];
  if (kind === 'motor')
    tools.push({
      kind,
      from: 'drive',
      to: 'frame',
      x: input.x,
      y: input.y - 49,
      rate: value,
      dir: direction,
    });
  return driveMachine({ input, output, tools, sockets: [], tray: [], goal: dummy }, 0);
}
function handling(kind, transfer, value) {
  const x = transfer ? 421 : 285,
    sign = transfer ? -1 : 1;
  if (kind === 'sieve') {
    const y = transfer ? 190 : 148;
    const release = ball(x - 51, y - 67, 0, transfer ? 15 : 9);
    const parcel = cargo(x + 52, y - 63, transfer ? 10 : 16);
    return board(release, [
      parcel,
      ...[-51, 52].map((dx) => tool('sieve', x + dx, y, { gap: value, w: 100 })),
    ]);
  }
  if (kind === 'ice')
    return board(ball(x - sign * 37, transfer ? 82 : 46, sign * 0.8), [
      tool('ice', x, transfer ? 189 : 153, { dir: sign, slope: value, w: 170 }),
    ]);
  return board(ball(x - sign * 22, transfer ? 62 : 46, sign * 0.8), [
    tool('zipline', x, transfer ? 169 : 145, { dir: sign, span: transfer ? 111 : 151, drop: value }),
  ]);
}

export const lessons = [
  {
    id: 'slack-line',
    family: 'Cable rigs',
    title: 'Room to swing',
    kind: 'tether',
    make: rig,
    control: 'Cable length',
    values: [70, 110, 151],
    labels: ['70 units', '110 units', '151 units'],
    question: 'How far can the bob fall before a slack line pulls tight?',
    cue: 'Look for the bend where a falling path becomes a swing.',
    transfer:
      'The release is on the other side of the peg. Set the cable so the bob swings through the ring.',
  },
  {
    id: 'loaded-coil',
    family: 'Cable rigs',
    title: 'The loaded coil',
    kind: 'spring',
    make: rig,
    control: 'Rest length',
    values: [59, 108, 157],
    labels: ['59 units', '108 units', '157 units'],
    question: 'Where does the bob go when the coil starts stretched or compressed?',
    cue: 'Compare the first few frames. A short coil already pulls toward the peg.',
    transfer: 'The bob now travels left. Choose a rest length that puts it inside the ring at exposure.',
  },
  {
    id: 'shared-rope',
    family: 'Cable rigs',
    title: 'Across the sheave',
    kind: 'pulley',
    make: rig,
    actor: 'cargo',
    control: 'Pulley mount',
    values: [246, 323, 396],
    labels: ['Left', 'Center', 'Right'],
    question: 'What happens to the blue end when the pulley moves sideways?',
    cue: 'Follow the direction of the blue rope as the heavy gold end drops.',
    transfer:
      'The heavy load and the parcel have traded sides. Move the pulley to steer the blue parcel into frame.',
  },
  {
    id: 'signal-height',
    family: 'Signals',
    title: 'The early bell',
    kind: 'switch',
    make: signals,
    actor: 'cargo',
    control: 'Trip switch height',
    values: [104, 168, 235],
    labels: ['High', 'Middle', 'Low'],
    question: 'Can a switch change a parcel it never touches?',
    cue: 'Watch the gold marble reach the switch, then watch when the hatch under the parcel opens.',
    transfer:
      'The hatch sits lower on this machine. Move the switch so the parcel reaches the diamond on time.',
  },
  {
    id: 'signal-channel',
    family: 'Signals',
    title: 'Which bell rang?',
    kind: 'hatch',
    make: signals,
    actor: 'cargo',
    control: 'Hatch signal lead',
    values: ['A', 'B'],
    labels: ['Switch A', 'Switch B'],
    question: 'Two switches fire on one descent. Which one releases the parcel?',
    cue: 'The hatch listens to the switch on its lead. Follow the gold marble past A and B.',
    transfer:
      'The switch order is reversed. Connect the hatch to the signal that drops the parcel into frame.',
  },
  {
    id: 'beam-height',
    family: 'Signals',
    title: 'A kick in flight',
    kind: 'tripwire',
    make: signals,
    control: 'Beam height',
    values: [110, 165, 220],
    labels: ['High', 'Middle', 'Low'],
    question: 'Does a later kick leave the marble as far along its new path?',
    cue: 'The beam redirects the marble on contact. Compare how much flight remains after the kick.',
    transfer:
      'The new beam points left. Move it to catch the marble early or late enough to reach the ring.',
  },
  {
    id: 'drive-rate',
    family: 'Drive table',
    title: 'Bring the carriage in',
    kind: 'motor',
    make: drives,
    actor: 'cargo',
    control: 'Motor speed',
    values: [0.065, 0.13, 0.21],
    labels: ['3.9 rad/s', '7.8 rad/s', '12.6 rad/s'],
    question: 'How much farther does the carriage travel when the motor spins faster?',
    cue: 'Count the carriage travel along the guide while the clock runs.',
    transfer:
      'The motor now drives to the left. Choose a speed that places the carriage in the diamond.',
  },
  {
    id: 'rack-radius',
    family: 'Drive table',
    title: 'More travel per turn',
    kind: 'rack',
    make: drives,
    actor: 'cargo',
    control: 'Pinion pitch radius',
    values: [15, 31, 49],
    labels: ['15 units', '31 units', '49 units'],
    question: 'How much track can one turn of a larger pinion cover?',
    cue: 'Track the blue carriage along its guide as the gold shaft gives up its spin.',
    transfer: 'The input wheel is smaller and spins backward. Match the carriage to the new exposure.',
  },
  {
    id: 'gear-ratio',
    family: 'Drive table',
    title: 'Around the dial',
    kind: 'gearbox',
    make: drives,
    actor: 'cargo',
    control: 'Gear ratio',
    values: [0.5, 1, 1.65],
    labels: ['0.5 : 1', '1 : 1', '1.65 : 1'],
    question: 'Where is the blue arm after the same amount of time at three gear ratios?',
    cue: 'Use the blue arm as a clock hand. Trace how far it has rotated.',
    transfer:
      'The arm starts at the top and the input turns the other way. Gear it to cross the diamond.',
  },
  {
    id: 'sort-by-size',
    family: 'Sorting room',
    title: 'One through, one held',
    kind: 'sieve',
    make: handling,
    actor: 'both',
    control: 'Opening width',
    values: [12, 26, 43],
    labels: ['12 units', '26 units', '43 units'],
    question: 'Can the same opening hold one load and let the other through?',
    cue: 'Compare each diameter to the empty space between the bars.',
    transfer: 'Gold is now larger than blue. Set both openings to put each load in its own target.',
  },
  {
    id: 'ice-slope',
    family: 'Sorting room',
    title: 'Leave the rail',
    kind: 'ice',
    make: handling,
    control: 'Rail tilt',
    values: [0.1, 0.29, 0.49],
    labels: ['6°', '17°', '28°'],
    question: 'How does the tilt of a slick rail change the exit?',
    cue: 'Check where the load leaves the lower end, then follow the free fall.',
    transfer:
      'The rail slopes left from a higher release. Choose the tilt that carries the marble to the ring.',
  },
  {
    id: 'zipline-drop',
    family: 'Sorting room',
    title: 'The last tangent',
    kind: 'zipline',
    make: handling,
    control: 'Cable drop',
    values: [18, 58, 99],
    labels: ['18 units', '58 units', '99 units'],
    question: 'Which way does a rider travel after leaving a steeper zipline?',
    cue: 'Watch the last length of cable. Its direction carries into the flight after release.',
    transfer: 'The shorter cable runs the other way. Set its drop to put the rider inside the ring.',
  },
  ...advancedLessons,
];

export function simulate(M, lesson, transfer, setting, ticks) {
  const machine = lesson.make(lesson.kind, transfer, lesson.values[setting]);
  const run = createRun(M, machine);
  const frames = [snapshot(run)];
  while (run.state === 'running' && run.tick < ticks) {
    advance(M, run);
    frames.push(snapshot(run));
  }
  const actors = (lesson.actor === 'both' ? ['marble', 'cargo'] : [lesson.actor || 'marble']).map(
    (kind) => ({ kind, index: run.items.findIndex((item) => item.shape.kind === kind) }),
  );
  return { run, frames, actors };
}

// Measured exposure marks on the transfer rigs, in 720 × 400 bench units.
// Targets stay fixed when the player changes an input.
export const exposures = {
  ...advancedExposures,
  'slack-line': [95, 91, [[336, 236]]],
  'loaded-coil': [92, 91, [[401, 110]]],
  'shared-rope': [68, 58, [[346, 59]]],
  'signal-height': [59, 51, [[212, 247]]],
  'signal-channel': [61, 54, [[228, 364]]],
  'beam-height': [33, 29, [[258, 75]]],
  'drive-rate': [69, 85, [[226, 231]]],
  'rack-radius': [41, 67, [[383, 231]]],
  'gear-ratio': [25, 40, [[539, 179]]],
  'sort-by-size': [
    45,
    41,
    [
      [370, 178],
      [473, 363],
    ],
  ],
  'ice-slope': [74, 70, [[403, 175]]],
  'zipline-drop': [77, 64, [[231, 372]]],
};
export const radius = 20;
export function measure(tape, targets) {
  const last = tape.frames.at(-1);
  return tape.actors.map(({ kind, index }, i) => {
    const [x, y] = last.poses[index];
    const dx = x - targets[i][0],
      dy = y - targets[i][1];
    return { kind, dx, dy, inside: Math.hypot(dx, dy) <= radius };
  });
}

export function separation(tape, baseline) {
  if (!baseline) return null;
  for (let t = 0; t < tape.frames.length; t++) {
    for (const { kind, index } of tape.actors) {
      const [x, y] = tape.frames[t].poses[index];
      const [a, b] = baseline.frames[t].poses[index];
      if (Math.hypot(x - a, y - b) >= tape.run.items[index].shape.r) return { t, kind };
    }
  }
  return null;
}
export function displacement(dx, dy) {
  if (Math.hypot(dx, dy) < 1) return 'at the same position';
  return Math.abs(dx) >= Math.abs(dy)
    ? Math.round(Math.abs(dx)) + ' units ' + (dx < 0 ? 'left' : 'right')
    : Math.round(Math.abs(dy)) + ' units ' + (dy < 0 ? 'higher' : 'lower');
}

// Both settings share the same lens. These crops include every path and target
// up to the exposure, so changing a physical setting never moves the camera.
export const framing = {
  ...advancedFraming,
  'slack-line': [
    [97, 55, 393],
    [148, 54, 393],
  ],
  'loaded-coil': [
    [89, 55, 409],
    [135, 54, 417],
  ],
  'shared-rope': [
    [0, 2, 716],
    [0, 0, 693],
  ],
  'signal-height': [
    [0, 0, 720],
    [0, 0, 720],
  ],
  'signal-channel': [
    [0, 0, 720],
    [0, 0, 720],
  ],
  'beam-height': [
    [8, 4, 449],
    [143, 25, 411],
  ],
  'drive-rate': [
    [32, 0, 658],
    [32, 0, 658],
  ],
  'rack-radius': [
    [32, 0, 658],
    [32, 0, 658],
  ],
  'gear-ratio': [
    [77, 61, 492],
    [129, 68, 453],
  ],
  'sort-by-size': [
    [0, 34, 658],
    [137, 83, 569],
  ],
  'ice-slope': [
    [2, 1, 718],
    [31, 42, 645],
  ],
  'zipline-drop': [
    [2, 1, 718],
    [0, 18, 688],
  ],
};
