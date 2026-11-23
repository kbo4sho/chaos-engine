import { advancedRigs } from './advanced-rigs.js';
import { parts, createRun, advance } from '../machines.js';
import { driveMachine } from '../drive-course.js';
import { snapshot } from '../drawing.js';

// Each sheet marks two physical positions at two different clock times.
import { tool, ball, parcel, post, offstage, track, control, shot } from './rig-fixtures.js';
const speed = control(
  'Motor speed',
  [0.065, 0.13, 0.21],
  ['3.9 rad/s', '7.8 rad/s', '12.6 rad/s'],
  'drive-rate',
);
const opening = control(
  'Screen opening',
  [12, 26, 44],
  ['12 units', '26 units', '44 units'],
  'sort-by-size',
);
export const rigs = [
  {
    id: 'screened-slide',
    title: 'Hold one, send one',
    tools: ['sieve', 'ice'],
    brief: 'Keep blue on the screen for the first shot. Send gold down the slick rail for the second.',
    hint: 'An opening between the two diameters holds one load. The rail sets where the smaller load goes next.',
    controls: [opening, control('Ice rail tilt', [0.09, 0.31, 0.53], ['5°', '18°', '30°'], 'ice-slope')],
    shots: [shot(60, 'cargo', 390, 130), shot(84, 'marble', 488, 317)],
    make(gap, slope) {
      return track(
        ball(278, 53, 10),
        [
          parcel(390, 52, 17),
          tool('sieve', 278, 146, { w: 107, gap }),
          tool('sieve', 390, 146, { w: 107, gap }),
          tool('ice', 313, 229, { w: 185, slope, dir: 1 }),
        ],
        'marble',
      );
    },
  },
  {
    id: 'timed-cable',
    title: 'The late dispatch',
    tools: ['hatch', 'zipline'],
    brief: 'Hold blue by the hatch at the first shutter, then ride the cable through the far diamond.',
    hint: 'The lower signal fires later. Once the parcel is riding, the cable drop controls its exit.',
    controls: [
      control('Hatch lead', ['A', 'B'], ['Switch A', 'Switch B'], 'signal-channel'),
      control('Cable drop', [15, 57, 99], ['15 units', '57 units', '99 units'], 'zipline-drop'),
    ],
    shots: [shot(39, 'cargo', 395, 119), shot(108, 'cargo', 634, 346)],
    make(link, drop) {
      return track(
        ball(165, 41),
        [
          tool('switch', 165, 106, { link: 'A' }),
          tool('switch', 165, 193, { link: 'B' }),
          tool('hatch', 390, 122, { link, dir: 1 }),
          parcel(395, 102),
          tool('zipline', 396, 195, { dir: 1, span: 145, drop }),
        ],
        'cargo',
      );
    },
  },
  {
    id: 'suspended-freight',
    title: 'Catch the swing',
    tools: ['switch', 'tether'],
    brief:
      'Release the suspended parcel on cue. Catch its fall with the line so the swing reaches the second mark.',
    hint: 'The switch sets the release time. Look for the bend where the tether takes the weight.',
    controls: [
      control('Switch height', [104, 167, 228], ['High', 'Middle', 'Low'], 'signal-height'),
      control('Tether length', [83, 122, 165], ['83 units', '122 units', '165 units'], 'slack-line'),
    ],
    shots: [shot(51, 'cargo', 447, 173), shot(69, 'cargo', 407, 231)],
    make(y, length) {
      return track(
        ball(150, 41),
        [
          tool('switch', 150, y, { link: 'lift' }),
          tool('hatch', 435, 147, { link: 'lift', dir: 1 }),
          parcel(447, 128),
          post(354, 75),
          tool('tether', 354, 75, { from: 'post', to: 'parcel', length }),
        ],
        'cargo',
      );
    },
  },
  {
    id: 'spring-screen',
    title: 'Thread the return',
    tools: ['spring', 'sieve'],
    brief: 'Catch the early swing of the gold bob, then guide its return past the grating.',
    hint: 'The coil moves the bob before it reaches the screen. Use the first shutter to set the coil, then check the opening.',
    controls: [
      control('Coil rest length', [72, 109, 151], ['72 units', '109 units', '151 units'], 'loaded-coil'),
      control('Grating width', [12, 30, 54], ['12 units', '30 units', '54 units'], 'sort-by-size'),
    ],
    shots: [shot(15, 'marble', 267, 107), shot(63, 'marble', 414, 103)],
    make(length, gap) {
      return track(
        ball(256, 64, 13, 0.3),
        [
          post(342, 97),
          tool('spring', 342, 97, { from: 'post', to: 'runner', length }),
          tool('sieve', 277, 140, { w: 178, gap }),
        ],
        'marble',
      );
    },
  },
  {
    id: 'shaft-clock',
    title: 'Two hands of the clock',
    tools: ['motor', 'gearbox'],
    brief: 'Line up the notch on the gold rim, then carry the blue arm through the second shutter.',
    hint: 'Motor speed sets the input turn. The gear ratio changes how much turn reaches the blue arm.',
    controls: [
      speed,
      control('Gear ratio', [0.5, 1, 1.65], ['0.5 : 1', '1 : 1', '1.65 : 1'], 'gear-ratio'),
    ],
    shots: [shot(54, 'rim', 207, 193), shot(66, 'cargo', 397, 259)],
    make(rate, ratio) {
      return driveMachine(
        {
          input: { x: 180, y: 185, r: 40, spin: 0, density: 0.012 },
          output: { mode: 'arm', x: 525, y: 195, axle: [445, 195], density: 0.002 },
          tools: [
            { kind: 'motor', from: 'drive', to: 'frame', x: 175, y: 105, dir: 1, rate },
            { kind: 'gearbox', from: 'drive', to: 'parcel', x: 320, y: 205, ratio },
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
    id: 'rack-hoist',
    title: 'The traveling crane',
    tools: ['motor', 'pulley'],
    brief:
      'Drive the blue carriage to the first diamond. Use its travel to pull the square weight into the second shot.',
    hint: 'The carriage spends cable as it travels. The wheel position changes the direction of the pull on the weight.',
    controls: [
      speed,
      control('Pulley mount', [170, 290, 412], ['Left', 'Center', 'Right'], 'shared-rope'),
    ],
    shots: [shot(39, 'cargo', 464, 205), shot(57, 'weight', 350, 158)],
    make(rate, x) {
      const m = driveMachine(
        {
          input: { x: 130, y: 172, r: 35, spin: 0, density: 0.018 },
          output: { mode: 'slide', x: 394, y: 205, guide: [270, 646], density: 0.011 },
          tools: [
            { kind: 'rack', from: 'drive', to: 'parcel', x: 240, y: 190, pitch: 33 },
            { kind: 'motor', from: 'drive', to: 'frame', x: 132, y: 108, rate, dir: 1 },
          ],
          sockets: [],
          tray: [],
          goal: offstage,
        },
        0,
      );
      m.fixtures.push(
        { ...parts.weight.shape, x: 200, y: 230, node: 'load', density: 0.0013 },
        tool('pulley', x, 65, { from: 'parcel', to: 'load', rest: 1 }),
      );
      return m;
    },
  },
  ...advancedRigs,
];
export const tolerance = 15;
export const actorNames = {
  cargo: 'Blue parcel',
  marble: 'Gold marble',
  rim: 'Gold rim notch',
  weight: 'Square weight',
};
export function position(tape, kind, tick) {
  const frame = tape.frames[Math.min(tick, tape.frames.length - 1)],
    index = tape.indices[kind];
  const [x, y, a] = frame.poses[index];
  if (kind !== 'rim') return [x, y];
  const r = tape.run.items[index].shape.r * 0.72;
  return [x + r * Math.cos(a), y + r * Math.sin(a)];
}
export function doubleRun(M, rig, settings, offset = 0) {
  const machine = rig.make(...settings.map((index, i) => rig.controls[i].values[index]));
  const run = createRun(M, machine, null, offset),
    frames = [snapshot(run)],
    last = rig.shots.at(-1).tick;
  while (run.state === 'running' && run.tick < last) {
    advance(M, run);
    frames.push(snapshot(run));
  }
  const indices = Object.fromEntries(
    rig.shots.map(({ kind }) => [
      kind,
      run.items.findIndex((it) => it.shape.kind === (kind === 'rim' ? 'marble' : kind)),
    ]),
  );
  const tape = { run, frames, indices };
  const receipts = rig.shots.map((s) => {
    const [x, y] = position(tape, s.kind, s.tick),
      dx = x - s.x,
      dy = y - s.y;
    const reached = run.tick >= s.tick;
    return { x, y, dx, dy, reached, hit: reached && Math.hypot(dx, dy) <= tolerance };
  });
  return { ...tape, receipts, count: receipts.filter((r) => r.hit).length };
}
