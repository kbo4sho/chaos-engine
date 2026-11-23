import { transmissions } from './transmissions.js';
import { instruments } from './devices.js';
import { driveBoards } from './drive-boards.js';
export const driveChapters = [
  [
    'Drive table',
    'Trace the gold input shaft to the blue output. Learn the difference between spin, slip and sideways travel.',
  ],
  [
    'Gear train',
    'Connect several shafts. Watch the handedness of each turn before following the parcel.',
  ],
  ['Timing shop', 'Deliver while the receiver shows OPEN. A missed passage can come around again.'],
  [
    'Dispatch engines',
    'Follow the transmission through its load and the final receiver. Test one change at a time.',
  ],
];
const titles = [
  'Spin into slide|Start the drive|Opposite rotation|Slipping plates|Wound together|One-way stop|Changing pitch|Turning load|The shared shaft|Drive inspection',
  'Intermediate shaft|Back-driven|The second spindle|Winding drum|Handed gears|Double mesh|A slow start|Rotary transfer|The slip train|Output inspection',
  'First opening|Marked interval|Early return|Passing moment|Clocked slide|Wait for green|Narrow opening|Escapement room|Second passage|Window inspection',
  'Shop transmission|Off-center freight|The works clock|Stored rotation|Turning circle|Bridge drive|Timed dispatch|Last carriage|The night gear|The master shaft',
].flatMap((s) => s.split('|'));
const notes = [
  'One shaft spins and one carriage can slide. Watch the carriage for a sideways movement before changing the mount.',
  'The input wheel starts at rest. A drive must turn it before the rack can carry the blue parcel.',
  'Watch the notch on the gold hub. With meshing gears, the output turns the opposite way.',
  'The plates can slip before their speeds approach one another. Compare the blue arm with the gold spokes.',
  'A wound coupling returns relative rotation. Watch the output before the spring unwinds.',
  'A one-way stop allows forward motion and holds against reverse spin. Enter the receiver when it reads OPEN.',
  'Look at the distance the carriage covers during one turn of the input wheel.',
  'Separate the power source from the gear connection. Test whether the input already turns.',
  'A working motor may turn while the load is disconnected. Follow the transfer to the blue arm.',
  'Trace the input torque into the spring. When does the parcel cross its highest point?',
  'Watch both gold and gray notches. Motion reaches the rack through an intermediate shaft.',
  'The carriage can also drive the pinion. Inspect the direction of its first motion.',
  'Two connections meet at the gray shaft. Predict the direction after each handoff.',
  'A spring can delay a rack. Freeze the winding moment, then inspect the first sideways motion.',
  'Work backward from the blue arm through the spring to the toothed connection.',
  'Two gear meshes reverse spin twice. Use the input and relay labels to distinguish them.',
  'The intermediate shaft and rack already have a path to the load. Check what starts that path.',
  'Relative winding changes the output speed over time. A single early frame can miss the return.',
  'Follow the winding at the first joint and the slipping at the second.',
  'The marked receiver cares about the approach. Trace the direction of the final slide.',
  'Watch the short OPEN interval above the receiver. The parcel must enter during it.',
  'Read the direction mark as well as the clock. A carrier can pass the same place twice.',
  'An early pass can miss and a later revolution can deliver. Inspect both receiver events.',
  'Follow the stop as the shaft tries to reverse. Then time the blue arm’s entry.',
  'A steady motor gives each rack pass a repeatable time. The velocity arrow shows the requested direction.',
  'Watch how quickly the clutch plates share spin. Slippage changes the arrival time.',
  'Follow the wire from the motor to the toothed pair. Which opening can that gearing reach?',
  'A held shaft can store twist. Look at the spring’s response when the input meets its stop.',
  'Compare the wheel rotation with the carriage’s approach to the receiving window.',
  'Follow the chain from motor to spring to rack. Which action establishes the arrival time?',
  'The pole changes the load on the rack. Check the motor, the gear mesh and the final approach.',
  'The push from the field changes the slide. Watch the outer end of the drivetrain.',
  'Trace the coupling through the gray shaft. The fan acts on the parcel once it reaches the air column.',
  'Check the stop before the pole pulls the load around. Which pass crosses an open receiver?',
  'The field and the gear mesh both change the route through the marked receiver.',
  'Follow the spring into the rack, then inspect how the pole changes the travel.',
  'The blue arm and air column meet after two shaft handoffs. Inspect the first missed passage.',
  'The clutch has to transfer useful spin before the rack and coil can deliver the carriage.',
  'Compare the input notch with the intermediate shaft while the spring winds against the load.',
  'Read the final job from the motor to the gear pair, through the rack, then past both poles. Enter within the open interval.',
];
export function driveMachine(board, index) {
  const { input, relay, output, tools, sockets, tray, goal } = board,
    title = titles[index],
    linear = output.mode === 'slide';
  const fly = (kind, node, p) => ({
    kind,
    node,
    flywheel: true,
    axle: [p.x, p.y],
    x: p.x,
    y: p.y,
    r: p.r,
    spin: p.spin,
    density: p.density,
  });
  const fixtures = [];
  if (relay) fixtures.push(fly('flywheel', 'relay', relay));
  fixtures.push({ kind: 'eyelet', node: 'frame', x: input.x - 42, y: input.y + 52, r: 6, field: true });
  const parcel = {
    kind: 'cargo',
    node: 'parcel',
    r: 12,
    density: output.density,
    x: output.x,
    y: output.y,
    spin: output.spin || 0,
    vx: output.vx || 0,
    ...(linear ? { guide: output.guide } : { axle: output.axle }),
  };
  fixtures.push(
    parcel,
    ...tools.map((s) => ({ ...(transmissions[s.kind] || instruments[s.kind]).shape, ...s })),
  );
  return {
    id: 'drive-' + title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
    title,
    transmission: true,
    lesson: notes[index],
    goal: goal.window
      ? 'Enter the open receiver with the blue parcel.'
      : goal.turn
        ? 'Enter the receiver with the blue arm turning ' +
          (goal.turn > 0 ? 'clockwise.' : 'counterclockwise.')
        : goal.travel
          ? 'Enter the receiver with the blue carriage moving ' + (goal.travel > 0 ? 'right.' : 'left.')
          : 'Drive the blue parcel to its receiver.',
    description: linear
      ? 'A gold flywheel and a blue carriage share the bench. The carriage travels horizontally on its guide.'
      : 'The gold input wheel drives a blue parcel on an eccentric arm. The arm swings around a fixed axle.',
    success: 'The drive delivered the parcel.',
    ball: fly('marble', 'drive', input),
    fixtures,
    sockets,
    tray,
    goals: [{ ...goal, sensor: true, striker: 'cargo' }],
  };
}
export const driveCourse = driveBoards.map(driveMachine);
