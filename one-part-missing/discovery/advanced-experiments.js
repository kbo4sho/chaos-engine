import { parts } from '../machines.js';
import { driveMachine } from '../drive-course.js';
import { electrode } from '../fields.js';

const goal = { kind: 'flag', x: 1700, y: 950, w: 18, h: 22, sensor: true };
const tool = (kind, x, y, settings = {}) => ({ ...parts[kind].shape, x, y, ...settings });
const board = (ball, fixtures) => ({
  ball: { kind: 'marble', node: 'runner', r: 10, ...ball },
  fixtures,
  goals: [goal],
  sockets: [],
  tray: [],
});

// The transfer rig reverses the travel direction and changes the approach,
// leaving the same physical adjustment in the player's hands.
function air(kind, transfer, value) {
  const direction = transfer ? -1 : 1,
    ox = transfer ? 524 : 174,
    x = (distance) => ox + direction * distance,
    y = transfer ? 54 : 42;
  if (kind === 'parachute') {
    const vx = transfer ? 0.72 : 0.45,
      vy = transfer ? 3.5 : 5;
    return board({ x: ox, y, vx: direction * vx, vy }, [tool(kind, x((value * vx) / 6), y + value)]);
  }
  if (kind === 'unload') {
    const vx = transfer ? 4.3 : 5.3,
      vy = transfer ? 1.35 : 0.75;
    return board({ x: ox, y, vx: direction * vx, vy }, [
      tool('float', ox, y),
      tool(kind, x(value), y + (value * vy) / vx),
    ]);
  }
  if (kind === 'bank') {
    const angle = transfer ? Math.PI - value : value;
    return board(
      { x: ox, y, vx: direction * (transfer ? 4.2 : 5.2), vy: transfer ? 3 : 2.2, a: angle },
      [tool(kind, x(48), y + (transfer ? 44 : 29))],
    );
  }
  return board(
    {
      x: ox,
      y: y + 68,
      vx: direction * (transfer ? 2.8 : 3.8),
      vy: transfer ? -0.3 : 0.6,
      a: transfer ? Math.PI - value : value,
      spin: direction * (transfer ? -0.015 : 0.012),
    },
    [tool('gyro', ox, y + 68), tool('thruster', x(10), y + 72)],
  );
}
function fields(kind, transfer, value) {
  const direction = transfer ? -1 : 1,
    ox = transfer ? 490 : 182,
    x = (d) => ox + direction * d,
    y = transfer ? 54 : 42;
  if (kind === 'pulse' || kind === 'swirl') {
    const body = { x: ox, y, vx: direction * (transfer ? 1.5 : 0.8), vy: transfer ? 1.5 : 2 };
    const center = x(16 + (kind === 'pulse' ? value : 0));
    return board(body, [
      tool(kind, center, y + (transfer ? 55 : 62), { dir: kind === 'swirl' ? value * direction : 1 }),
    ]);
  }
  if (kind === 'phase') {
    return board({ x: ox, y, vx: direction * (transfer ? 1.3 : 0.8), vy: 2.2 }, [
      tool(kind, x(value * 0.14), y + value),
      {
        kind: 'rail',
        x: x(29),
        y: y + (transfer ? 172 : 155),
        w: 127,
        h: 11,
        a: direction * (transfer ? 0.12 : 0.2),
      },
    ]);
  }
  if (kind === 'terminal') {
    return board(
      { x: ox, y: y + 69, r: 8, density: 0.0008, vx: direction * (transfer ? 3.3 : 4.3), vy: 1.5 },
      [tool(value, ox, y + 69), electrode(x(90), y + (transfer ? 93 : 152), transfer ? 1 : -1)],
    );
  }
  return board(
    {
      x: ox,
      y: y + 69,
      r: 8,
      density: 0.001,
      vx: direction * (transfer ? 3.3 : 4.1),
      vy: transfer ? 0 : 1.4,
      sign: 1,
    },
    [
      tool('ground', x(value), y + 69 + value * (transfer ? 0.24 : 0.8), { r: 24 }),
      electrode(x(116), y + (transfer ? 85 : 151), -1),
    ],
  );
}
function shafts(kind, transfer, value) {
  const input = {
    x: transfer ? 212 : 154,
    y: transfer ? 136 : 174,
    r: transfer ? 31 : 39,
    spin: (transfer ? -1 : 1) * (kind === 'clutch' ? value : kind === 'ratchet' ? 0.15 : 0),
    density: 0.015,
  };
  const axle = transfer ? [477, 193] : [431, 205],
    output = {
      mode: 'arm',
      x: transfer ? 477 : 513,
      y: transfer ? 115 : 205,
      axle,
      density: transfer ? 0.0028 : 0.0018,
    };
  const tools =
    kind === 'ratchet'
      ? [
          { kind: 'ratchet', from: 'drive', to: 'frame', x: input.x, y: input.y - 50, dir: value },
          { kind: 'gearbox', from: 'drive', to: 'parcel', x: 315, y: 166, ratio: 0.88 },
        ]
      : [
          {
            kind,
            from: 'drive',
            to: 'parcel',
            x: 321,
            y: 167,
            ...(kind === 'torsion' ? { wind: value } : {}),
          },
        ];
  return driveMachine({ input, output, tools, sockets: [], tray: [], goal }, 0);
}
export const advancedLessons = [
  {
    id: 'air-brake',
    family: 'Flight equipment',
    title: 'Open the canopy',
    kind: 'parachute',
    make: air,
    control: 'Canopy pickup height',
    labels: ['High', 'Middle', 'Low'],
    values: [25, 97, 176],
    question: 'How much descent does the canopy remove when it opens at a different height?',
    cue: 'Look for the bend from acceleration into a steadier descent. The canopy stays on the load.',
    transfer:
      'The approach is slower and travels left. Pick the opening height that puts gold in frame.',
  },
  {
    id: 'cut-away',
    family: 'Flight equipment',
    title: 'Where gravity returns',
    kind: 'unload',
    make: air,
    control: 'Release hoop distance',
    labels: ['Near', 'Middle', 'Far'],
    values: [34, 107, 184],
    question: 'Where does the floating load begin to fall again?',
    cue: 'The collar cancels gravity. Look for a change in curvature after the load crosses the release hoop.',
    transfer:
      'The collar travels left on a steeper heading. Move the release hoop to catch the falling marble.',
  },
  {
    id: 'bank-angle',
    family: 'Flight equipment',
    title: 'Bank the descent',
    kind: 'bank',
    make: air,
    control: 'Marble heading at release',
    labels: ['Nose up', 'Level', 'Nose down'],
    values: [-0.42, 0, 0.42],
    question: 'Can the same vane send an incoming descent in three directions?',
    cue: 'The bank reflects velocity across the load’s heading. Compare the outgoing direction at the hoop.',
    transfer:
      'The marble now approaches from the opposite side at a steeper angle. Aim its bank toward the ring.',
  },
  {
    id: 'gyro-heading',
    family: 'Flight equipment',
    title: 'Hold a powered heading',
    kind: 'gyro',
    make: air,
    control: 'Starting heading',
    labels: ['Upward', 'Across', 'Downward'],
    values: [-1.25, -0.2, 1.21],
    question: 'Which heading will a gyroscope hold when the thruster fires?',
    cue: 'The gyro seeks the nearest quarter turn. The attached thruster works along the moving load’s nose.',
    transfer:
      'This powered load drifts left before the correction settles. Pick the heading that reaches the mark.',
  },
  {
    id: 'radial-kick',
    family: 'Coils and gates',
    title: 'Choose the side of a pulse',
    kind: 'pulse',
    make: fields,
    control: 'Coil offset from approach',
    labels: ['Near side', 'Centered', 'Far side'],
    values: [-15, 0, 15],
    question: 'How does the point of contact change a pulse?',
    cue: 'The first push points away from the coil center. Compare the side of the marble touched by the coil.',
    transfer: 'The load approaches from the right. Offset the coil to direct the pulse into frame.',
  },
  {
    id: 'swirl-turn',
    family: 'Coils and gates',
    title: 'Take the tangent',
    kind: 'swirl',
    make: fields,
    control: 'Winding relative to approach',
    labels: ['Forward turn', 'Reverse turn'],
    values: [1, -1],
    question: 'Which side does a tangent kick send the load toward?',
    cue: 'The swirl coil acts across the radius at contact. A reversed winding sends the kick the other way.',
    transfer:
      'The approach is mirrored and shallower. Choose which winding carries the load through the mark.',
  },
  {
    id: 'phase-clearance',
    family: 'Coils and gates',
    title: 'Cross before the gate closes',
    kind: 'phase',
    make: fields,
    control: 'Phase gate pickup',
    labels: ['Early', 'Late'],
    values: [18, 105],
    question: 'Does phasing early leave enough time to pass through the rail?',
    cue: 'Watch the dotted halo. Collisions return when it disappears, even if the load has yet to reach the rail.',
    transfer:
      'A lower barrier lies in the new path. Move the phase gate so the load is on the correct side at exposure.',
  },
  {
    id: 'terminal-sign',
    family: 'Coils and gates',
    title: 'Bend around a pole',
    kind: 'terminal',
    make: fields,
    contactKind: (v) => v,
    control: 'Charge terminal',
    labels: ['Positive (+)', 'Negative (−)'],
    values: ['positive', 'negative'],
    question: 'How does changing the moving charge bend its path beside a fixed pole?',
    cue: 'Equal signs repel and opposite signs attract. Watch the trajectory while the load is within reach of the pole.',
    transfer:
      'The fixed pole has the opposite sign on the return route. Choose the moving load’s charge.',
  },
  {
    id: 'ground-brush',
    family: 'Coils and gates',
    title: 'Leave the circuit',
    kind: 'ground',
    make: fields,
    control: 'Grounding brush distance',
    labels: ['Near', 'Far'],
    values: [18, 78],
    question: 'What happens when the brush removes the charge during the approach?',
    cue: 'The signed marker disappears at the brush. Compare how much the pole has already bent the path.',
    transfer: 'The load passes the pole from the opposite side. Choose when to release its charge.',
  },
  {
    id: 'clutch-input',
    family: 'Shaft couplings',
    title: 'Share the input spin',
    kind: 'clutch',
    make: shafts,
    actor: 'cargo',
    control: 'Starting input speed',
    labels: ['Slow', 'Medium', 'Fast'],
    values: [0.065, 0.14, 0.23],
    question: 'How far does the output arm move while the clutch plates share their spin?',
    cue: 'The input starts moving first. The clutch brings the arm along as the difference in speed fades.',
    transfer:
      'The input turns backward into a heavier arm. Choose the starting speed that puts blue in the diamond.',
  },
  {
    id: 'torsion-wind',
    family: 'Shaft couplings',
    title: 'Wind the spring first',
    kind: 'torsion',
    make: shafts,
    actor: 'cargo',
    control: 'Spring preload',
    labels: ['Left wind', 'Relaxed', 'Right wind'],
    values: [-2.1, 0, 2.1],
    question: 'Can a pre-wound spring move an arm when the shaft starts at rest?',
    cue: 'Wind stores a relative turn between the two shafts. Look for the first swing before the return.',
    transfer:
      'The new arm hangs from the top of its pivot. Set the spring’s initial wind to put it in frame.',
  },
  {
    id: 'ratchet-hand',
    family: 'Shaft couplings',
    title: 'Hold one direction',
    kind: 'ratchet',
    make: shafts,
    actor: 'cargo',
    control: 'Allowed shaft turn',
    labels: ['Clockwise', 'Counterclockwise'],
    values: [1, -1],
    question: 'What reaches the output arm when a ratchet holds the input shaft?',
    cue: 'The pawl permits one direction. Follow the blue arm when the input tries to turn against the stop.',
    transfer: 'The flywheel now spins the other way. Set the pawl to put the arm through the diamond.',
  },
].map((lesson) => ({ ...lesson, instruments: true }));

// The photographed marks stay fixed for every setting and do not encode the solution.
export const advancedExposures = {
  'air-brake': [41, 44, [[498, 286]]],
  'cut-away': [48, 45, [[335, 119]]],
  'bank-angle': [48, 53, [[538, 82]]],
  'gyro-heading': [30, 31, [[337, 242]]],
  'radial-kick': [44, 52, [[573, 319]]],
  'swirl-turn': [36, 41, [[245, 354]]],
  'phase-clearance': [40, 39, [[440, 352]]],
  'terminal-sign': [26, 27, [[683, 223]]],
  'ground-brush': [29, 38, [[160, 351]]],
  'clutch-input': [55, 61, [[420, 140]]],
  'torsion-wind': [54, 54, [[537, 242]]],
  'ratchet-hand': [58, 64, [[477, 115]]],
};
export const advancedFraming = {
  'air-brake': [
    [0, 0, 704],
    [41, 12, 679],
  ],
  'cut-away': [
    [0, 0, 718],
    [23, 4, 697],
  ],
  'bank-angle': [
    [0, 0, 720],
    [0, 0, 720],
  ],
  'gyro-heading': [
    [0, 60, 577],
    [161, 72, 555],
  ],
  'radial-kick': [
    [0, 0, 690],
    [51, 12, 669],
  ],
  'swirl-turn': [
    [0, 0, 692],
    [50, 12, 670],
  ],
  'phase-clearance': [
    [0, 0, 690],
    [53, 12, 667],
  ],
  'terminal-sign': [
    [0, 41, 616],
    [249, 34, 465],
  ],
  'ground-brush': [
    [9, 70, 574],
    [49, 72, 558],
  ],
  'clutch-input': [
    [75, 69, 487],
    [133, 62, 471],
  ],
  'torsion-wind': [
    [75, 69, 487],
    [133, 62, 471],
  ],
  'ratchet-hand': [
    [75, 69, 487],
    [124, 48, 488],
  ],
};
