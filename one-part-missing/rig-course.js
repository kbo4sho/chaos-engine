import { links } from './rigging.js';
import { instruments } from './devices.js';
import { rigBoards } from './rig-boards.js';
export const rigChapters = [
  ['Suspension shop', 'Read what a fitting does when its endpoints move closer or farther apart.'],
  ['Counterweight loft', 'Follow both moving ends. The receiver listens for the blue parcel.'],
  ['Release works', 'Use tension, recoil and a well-placed tool to change the next handoff.'],
  [
    'Rigging floor',
    'Trace a pair of connected mechanisms, then look for where the delivery leaves the rig.',
  ],
];
const titles = [
  'First tether|Held apart|Elastic return|Inside the swing|Shock absorber|Reel in|The weak seam|Downward reach|Shorter line|Suspension test',
  'One cable, two ends|The lighter load|Moving tie|Stretch allowance|Suspended brake|Shared length|Reel transfer|Load path|Breaking strain|Counterweight test',
  'Fan the swing|Spring landing|Rolling stock|Coil and pole|Brake the fall|Across the seam|Crank delivery|Load exchange|Rope and air|Cable transfer',
  'Linked motion|Elastic hoist|Reeving room|Tension test|Slow the return|Freight crane|Quick release|The double rig|Winding house|The last lift',
].map((row) => row.split('|'));
const notes = [
  'Run the loose line once. At the first taut frame, trace the turn around the peg.',
  'A strut can push as well as pull. Watch what happens when the endpoints move closer.',
  'The coil stretches before returning energy. Compare its turn with a rigid rod.',
  'Look at the inward part of the swing. The tether can go slack there.',
  'A damper absorbs motion along its shaft. It does not hold a fixed distance.',
  'The winch takes in line as the marble travels. The radius of the swing shrinks.',
  'A weak seam can carry a pull and then separate. Inspect the instant it snaps.',
  'Watch when the link first feels a load, then trace the remaining free fall.',
  'Compare a shrinking line with a fixed-length line before choosing the mounting point.',
  'Use the first loaded frame to predict the far end of the swing.',
  'A pulley shares one cable between two moving bodies. A longer leg on one side takes length from the other.',
  'Follow the blue diamond. Watch where it goes when the other end drops.',
  'The moving gold endpoint can guide the parcel. A fixed peg produces a different exit.',
  'A coil can store motion on one body and return it to the other.',
  'Look along the damper shaft. Motion across it survives more easily than motion along it.',
  'The wheel routes the cable. Changing its position changes the pull on both ends.',
  'Trace which moving endpoint the winch draws toward its partner.',
  'Start at the parcel receiver and work backward to its supporting link.',
  'Follow the parcel after the seam breaks. A new free-flight arc begins there.',
  'Check the moment the line first carries a load. Which way is the blue parcel moving?',
  'First trace the hanging line, then the air above the grille. Where do the two paths overlap?',
  'The spring and the trampoline both return energy. Inspect the first bounce to see which acts second.',
  'The belt changes speed along its top. Watch which way the rod guides the marble afterward.',
  'The magnetic pull bends the path while the coil changes its length. Watch their contact times.',
  'The damper absorbs motion along its shaft. The syrup acts only inside its marked pool.',
  'Inspect the broken seam. Where can a quarter turn send the marble on its free-flight path?',
  'The drum takes in line throughout the release. Follow the shortening radius past the pole.',
  'When the belt carries the blue parcel, watch the other leg of the pulley.',
  'Follow the marble through the air from the fan. Which way can the pole bend that exit?',
  'Watch the blue diamond at the first push. The fan needs the parcel inside its rising column.',
  'Find the fixed peg, then follow the moving tie between the two bodies. When does the pole act?',
  'The winch takes up line steadily. Compare its timing with the recoil of the second link.',
  'The pulley trades line between both bodies. Check which leg is under load at the trampoline.',
  'One connection keeps its span and the other can stretch. Trace their pull before the belt.',
  'Compare the line around the wheel with the line ending at the fixed peg. Which limits the parcel’s speed?',
  'The drum shortens its line while the pulley shares the remaining travel. Follow the parcel past the pole.',
  'Inspect the weak seam before and after the break. Which connection still guides the load?',
  'Watch for the parcel’s exit from the fan column. The belt must meet it on that path.',
  'The gold end of this rig changes radius as the drum winds in. Check the parcel’s next landing.',
  'Trace both ends over the wheel. Pause at the fan and follow the blue parcel’s final curved approach.',
];
export function rigMachine(board, index) {
  const { release, parcel, pegs, rails = [], tools = [], sockets, tray, goals } = board;
  const title = titles[Math.floor(index / 10)][index % 10];
  const fixtures = pegs.map(([x, y], i) => ({
    kind: 'eyelet',
    node: 'peg' + i,
    x,
    y,
    r: 6,
    field: true,
  }));
  for (const [x, y, w, a] of rails) fixtures.push({ kind: 'rail', x, y, w, h: 12, a });
  if (parcel)
    fixtures.push({
      kind: 'cargo',
      node: 'parcel',
      x: parcel[0],
      y: parcel[1],
      r: 11,
      vx: parcel[2] || 0,
      density: 0.002,
    });
  for (const tool of tools)
    fixtures.push({ ...(links[tool.kind] || instruments[tool.kind]).shape, ...tool });
  const target = parcel ? 'parcel' : 'marble';
  return {
    id: 'rig-' + title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
    title,
    rigging: true,
    lesson:
      notes[index] ||
      (index < 30
        ? 'Study the line at the instant the next tool acts. A taut line and a slack line give different exits.'
        : 'Follow each moving endpoint. Inspect the first handoff that fails before changing the fitting.'),
    goal: parcel
      ? 'Guide the blue parcel to the marked receiver.'
      : 'Guide the gold marble to the marked receiver.',
    description:
      'The ' +
      target +
      ' receiver is on the ' +
      (goals.at(-1)[1] < 360 ? 'left' : 'right') +
      '. Dotted lines show the two endpoints of a connector mount.',
    success: parcel ? 'The parcel reached its receiver.' : 'The rig made its delivery.',
    ball: {
      kind: 'marble',
      node: 'runner',
      x: release[0],
      y: release[1],
      vx: release[2],
      density: release[3],
      r: 12,
    },
    fixtures,
    sockets,
    tray,
    goals: goals.map(([kind, x, y, w, h]) => ({
      kind,
      x,
      y,
      w,
      h,
      sensor: true,
      striker: parcel ? 'cargo' : 'marble',
    })),
  };
}
export const rigCourse = rigBoards.map(rigMachine);
