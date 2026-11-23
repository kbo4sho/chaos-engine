import { driveMachine } from '../drive-course.js';
import { electrode } from '../fields.js';
import { tool, ball, parcel, track, offstage, control, shot } from './rig-fixtures.js';

export const advancedRigs = [
  {
    id: 'canopy-release',
    title: 'Drop beneath the canopy',
    tools: ['parachute', 'unload'],
    brief:
      'Photograph the falling load under its canopy, then put it through the lower mark after the release hoop.',
    hint: 'Canopy height sets how soon the descent slows. Moving the release changes where ordinary gravity takes over again.',
    controls: [
      control('Canopy height', [47, 105, 165], ['High', 'Middle', 'Low'], 'air-brake'),
      control('Release height', [197, 251, 310], ['High', 'Middle', 'Low'], 'cut-away'),
    ],
    shots: [shot(28, 'marble', 231, 191), shot(46, 'marble', 237, 342)],
    make(height, release) {
      return track(
        { ...ball(220, 36, 10, 0.45), vy: 4.4 },
        [tool('parachute', 228, height), tool('unload', 236, release, { r: 26 })],
        'marble',
      );
    },
  },
  {
    id: 'powered-bank',
    title: 'Bank a powered load',
    tools: ['thruster', 'bank'],
    brief:
      'Carry the marble to the first exposure under power. Set the bank vane’s contact point to aim the exit.',
    hint: 'The thruster follows the load’s nose. The bank reflects its current travel about that heading at contact.',
    controls: [
      control('Powered heading', [-0.42, 0, 0.42], ['Up', 'Level', 'Down'], 'gyro-heading'),
      control('Bank pickup distance', [58, 116, 182], ['Near', 'Middle', 'Far'], 'bank-angle'),
    ],
    shots: [shot(16, 'marble', 256, 99), shot(26, 'marble', 341, 66)],
    make(a, range) {
      return track(
        { ...ball(163, 56, 10, 4.1), vy: 1, a },
        [tool('thruster', 163, 56), tool('bank', 163 + range, 56 + range * 0.4, { r: 29 })],
        'marble',
      );
    },
  },
  {
    id: 'phase-coil',
    title: 'Through the coil bed',
    tools: ['phase', 'pulse'],
    brief:
      'Send the marble through the sloping rail while its halo is open, then use the coil below to aim the second exposure.',
    hint: 'Phase changes whether the rail can hold the load. A coil’s push depends on which side of its center the marble meets.',
    controls: [
      control('Phase pickup', [58, 142], ['Early', 'Late'], 'phase-clearance'),
      control('Pulse coil offset', [-15, 0, 15], ['Left', 'Center', 'Right'], 'radial-kick'),
    ],
    shots: [shot(32, 'marble', 248, 252), shot(44, 'marble', 309, 342)],
    make(height, dx) {
      return track(
        { ...ball(228, 44, 10, 0.65), vy: 2 },
        [
          tool('phase', 237, height),
          { kind: 'rail', x: 249, y: 203, w: 132, h: 12, a: 0.13 },
          tool('pulse', 251 + dx, 266, { r: 21 }),
        ],
        'marble',
      );
    },
  },
  {
    id: 'charge-exchange',
    title: 'One circuit, two loads',
    tools: ['positive', 'ground'],
    brief:
      'Photograph gold as it enters a charged pair. Remove its charge at the brush and bring the second moving load into frame.',
    hint: 'Both loads feel the electric force. After gold reaches the brush, blue keeps the velocity it has already gained.',
    controls: [
      control(
        'Blue charge',
        ['positive', 'negative'],
        ['Positive (+)', 'Negative (−)'],
        'terminal-sign',
      ),
      control('Gold grounding brush', [43, 89, 135], ['Near', 'Middle', 'Far'], 'ground-brush'),
    ],
    shots: [shot(14, 'marble', 237, 134), shot(60, 'cargo', 69, 340)],
    make(sign, reach) {
      return track(
        { ...ball(182, 93, 9, 3.3), density: 0.0015, vy: 0.65 },
        [
          { ...parcel(342, 145, 9), density: 0.0013 },
          tool('positive', 182, 93),
          tool(sign, 342, 145),
          tool('ground', 182 + reach, 93 + reach * 0.6, { r: 25 }),
          electrode(398, 242, -1),
        ],
        'cargo',
      );
    },
  },
  {
    id: 'pawl-and-spring',
    title: 'Catch a wound shaft',
    tools: ['ratchet', 'torsion'],
    brief:
      'Hold the input at its first rim mark, then let the spring carry the arm to its second exposure.',
    hint: 'A reversed pawl holds the shaft when it tries to turn back. Preload changes the spring’s first swing.',
    controls: [
      control('Preload', [-2.5, 0, 2.5], ['Left wind', 'Relaxed', 'Right wind'], 'torsion-wind'),
      control('Allowed input turn', [-1, 1], ['Counterclockwise', 'Clockwise'], 'ratchet-hand'),
    ],
    shots: [shot(22, 'rim', 189, 152), shot(90, 'cargo', 466, 279)],
    make(wind, dir) {
      return driveMachine(
        {
          input: { x: 165, y: 165, r: 38, spin: 0.12, density: 0.003 },
          output: { mode: 'arm', x: 531, y: 197, axle: [447, 197], density: 0.004 },
          tools: [
            { kind: 'torsion', from: 'drive', to: 'parcel', x: 323, y: 165, wind },
            { kind: 'ratchet', from: 'drive', to: 'frame', x: 165, y: 101, dir },
          ],
          sockets: [],
          tray: [],
          goal: offstage,
        },
        0,
      );
    },
  },
  {
    id: 'clutch-train',
    title: 'Pass it down the shaft',
    tools: ['clutch', 'gearbox'],
    brief:
      'Read the input rim as the clutch shares spin. Change the gearing on the second shaft to time the blue arm.',
    hint: 'The clutch first transfers rotation to the middle wheel. The gear pair then changes direction and speed at the output.',
    controls: [
      control('Input speed', [0.08, 0.15, 0.235], ['Slow', 'Medium', 'Fast'], 'clutch-input'),
      control('Output ratio', [0.55, 1, 1.65], ['0.55 : 1', '1 : 1', '1.65 : 1'], 'gear-ratio'),
    ],
    shots: [shot(50, 'rim', 188, 181), shot(80, 'cargo', 489, 120)],
    make(spin, ratio) {
      return driveMachine(
        {
          input: { x: 159, y: 179, r: 40, spin, density: 0.015 },
          relay: { x: 321, y: 156, r: 26, spin: 0, density: 0.007 },
          output: { mode: 'arm', x: 554, y: 199, axle: [474, 199], density: 0.002 },
          tools: [
            { kind: 'clutch', from: 'drive', to: 'relay', x: 238, y: 149 },
            { kind: 'gearbox', from: 'relay', to: 'parcel', x: 395, y: 177, ratio },
          ],
          sockets: [],
          tray: [],
          goal: offstage,
        },
        0,
      );
    },
  },
];
