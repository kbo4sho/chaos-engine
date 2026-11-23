import { instruments, outlet } from './devices.js';
import { toolBoards } from './tool-boards.js';

import { clockBoards } from './clock-boards.js';
export const clockChapters = [
  ['Lift shop', 'Meet the traveling platform and the off-center wheel.'],
  ['Rotary works', 'Time an encounter with a piston, a pinwheel or a tripwire.'],
  ['Gatehouse', 'The gold marble trips a switch. Its hatch releases the blue parcel.'],
  ['Parcel depot', 'Trace the signal to the door, then follow the parcel through the second half.'],
];
export const toolChapters = [
  ['Belt & spring', 'A belt changes sideways speed. A trampoline changes the height of the next arc.'],
  ['Air & iron', 'Work with the space above a fan and the curved approach to a magnet.'],
  ['Turn & brake', 'Read the incoming velocity before choosing a turn or slowing the marble.'],
  ['Through the wall', 'A portal keeps incoming motion. A repulsor pushes away from its center.'],
  ['Relay works', 'Read the machine from both ends. Find the handoff that never happens.'],
  ['Control room', 'Predict a sequence of three or four powered parts before you release the marble.'],
];

const lessonNames = [
  'First belt|Catch the fall|Left-hand drive|Upper gallery|Belt to bed|Spring to belt|Receiving bay|Double bounce|Short delivery|Loading shift',
  'Updraft|Iron filings|Crosswind|Hook and line|Air cushion|Sling pass|Lift and carry|Magnetic return|Suspended rail|Wind tunnel',
  'Quarter turn|Slow pour|Turnaround|Sticky landing|Brake light|Around the bend|Last-second lift|Turntable|Speed limit|Traffic control',
  'Through ticket|Opposite poles|Arrival speed|Back pressure|Across the room|Return address|Express lane|Split current|Long distance|Switching office',
  'Air mail|Soft catch|Change of track|Catch and release|Cross connection|Bend the stream|Transfer window|Spring tide|Signal transfer|Relay master',
  'Pressure line|The long carry|Round trip|Second landing|Corner office|Magnetic junction|Clockwork post|Overnight express|Last connection|Closing time',
  'From below|High lobe|Up and over|Cam follower|Moving walkway|High-water mark|Drawbridge shift|Two strokes|Crosshead|Lift inspection',
  'Cross slide|First rotation|Across the wire|Outward stroke|Catch a blade|Sideways step|Return stroke|Trip circuit|Driven shaft|Rotary exchange',
  'Open the hatch|Two marbles|Door to door|On signal|Latch room|Remote delivery|Blue freight|Relay cabinet|The release line|Gatehouse test',
  'Freight lift|Parcel belt|Roundhouse|Under the door|Pickup spring|Split delivery|Railhead|Night sorting|The second shift|Last parcel',
].map((titles) => titles.split('|'));

const lessons = [
  'Watch the empty run. Which moving surface could carry the marble sideways?',
  'Find the lowest point of the fall. A spring bed can trade falling speed for height.',
  'Look at the chevrons on each mount. The belt can carry against the incoming roll.',
  'The marble needs to visit the upper gallery after it drops. Look for room to rebound.',
  'Follow the belt to its far end. What could catch the marble as it leaves?',
  'Trace the landing of the bounce. A belt is useful only if the marble reaches its surface.',
  'Work backward from the receiver. Where does the next part need to get the marble?',
  'Compare the two arcs. The second contact needs a falling marble.',
  'The belt needs time in contact. Watch where the marble first reaches its top.',
  'Predict both handoffs. Use Inspect run to check the first place your prediction changes.',
  'A fan acts before contact. Watch the dashed column above its grille.',
  'An approaching marble bends toward the magnet while it is inside the dotted ring.',
  'A fast marble crosses the air column quickly. Give the lift time to act.',
  'Watch which side of the magnet the marble passes. The pull follows the pole.',
  'The spring supplies a quick lift. Air can change the shape of the rest of the arc.',
  'Sideways speed changes how long the magnet has to pull.',
  'Read the belt direction before deciding where lift will help.',
  'Look for the curve before the return. A straight drop will miss the next tool.',
  'Predict the highest point of the powered arc before fitting a part.',
  'Follow the field edges through the handoff. A near miss at the first field changes the second.',
  'The elbow turns the direction of travel a quarter turn. Trace the incoming arrow first.',
  'Syrup takes away sideways speed. Compare the exit with an ordinary falling arc.',
  'Imagine turning the incoming path around the printed elbow. Which way will it leave?',
  'A wet pad slows a marble only while it is inside the stripes.',
  'Aim for the space below the brake. It changes where a fast marble lands.',
  'Travel into the elbow matters as much as the position of its exit.',
  'The fan needs the marble to stay above the grille. Look for a way to control its approach.',
  'Trace the approach to the turn before predicting the landing.',
  'Fast and slow entries into the same next tool produce different exits.',
  'Find the first bend, then follow the marble down to its final receiver.',
  'Find the striped exit ring. Sketch the same incoming motion starting there.',
  'The dotted coil pushes outward. Which side of its center should the marble pass?',
  'At the exit, the marble keeps its speed and direction. Gravity keeps working.',
  'The repulsor pushes more strongly near its center. Look for a close pass.',
  'Treat the two mouths as one point when predicting the next landing.',
  'Work backward from the exit. The approach to the entrance sets the departure.',
  'A faster entry also means a faster exit. Read the belt before the rings.',
  'The pole pulls in and the coil pushes out. Find which curve is missing.',
  'Watch the bronze trail stop at the inlet and begin again at the outlet.',
  'Follow the signal across the gap in space, then predict its first physical contact.',
];
const verbs = { bell: 'ring the bell', flag: 'raise the flag', chime: 'sound the chime' };
const slug = (title) =>
  title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '');

export function courseMachine(board, index) {
  const { release, rail, tools, sockets, tray, targets } = board;
  const title = lessonNames[Math.floor(index / 10)][index % 10];
  const toTool = ([kind, x, y, dir = 1]) => ({
    ...(kind === 'outlet' ? outlet : instruments[kind].shape),
    x,
    y,
    dir,
  });
  const goals = targets.map(([kind, x, y, w, h, striker]) => ({
    kind,
    x,
    y,
    w,
    h,
    sensor: true,
    ...(striker ? { striker } : {}),
  }));
  const classicNote =
    lessons[index] ||
    (index < 50
      ? 'Run the incomplete machine. Watch for the first tool the marble fails to reach.'
      : 'Trace each handoff before fitting a part. Scrub the film to check where the chain changes.');
  const clockNotes = [
    'An elevator changes height while the marble is in flight. Look for their meeting point.',
    'The axle is off center. Follow the high side of the wheel as it turns.',
    'Watch the moving platform before choosing the next landing.',
    'The rim follows a different path from the axle. Find the surface that will actually meet the marble.',
    'Start from the drop. At what height does the moving surface meet the marble?',
    'Predict the surface position when the marble arrives, then check the contact frame.',
    'Trace the gap after the lift. A later contact means a different exit.',
    'Follow both strokes. Watch how much horizontal speed reaches the second part.',
    'Find the first moving surface that could redirect the release.',
    'Inspect the first contact, then predict the handoff with the moving part.',
    'The piston sweeps sideways. Place its face where the marble crosses the stroke.',
    'A pinwheel meets the marble with a moving blade. Look at which way it turns.',
    'The tripwire keeps travel along its length and kicks across it. Follow the arrow.',
    'Check which side of the piston faces the incoming marble.',
    'Look for the blade that will be rising at the instant of contact.',
    'A wire can interrupt the fall in midair. Trace the direction printed on its beam.',
    'Watch which half of the stroke meets the marble.',
    'Predict what will reach the wire before it sends the marble onward.',
    'Start with the moving solid. Trace the arc from its first contact.',
    'Locate the first failed handoff, then test a repair at that point.',
  ];
  const lesson =
    index < 60
      ? classicNote
      : clockNotes[index - 60] ||
        (index < 90
          ? 'The gold marble operates the trip switch. Follow its cable to the hatch holding the blue parcel.'
          : 'Watch the blue parcel after the hatch opens. Which part changes its delivery path?');
  const mounts = sockets.map(([x, y, dir = 1]) => ({ x, y, dir }));
  const fixtures = [
    ...(rail ? [{ kind: 'rail', x: rail[0], y: rail[1], w: rail[2], h: 12, a: rail[3] }] : []),
    ...tools.map(toTool),
    ...(board.guides || []).map(([x, y, w, a]) => ({ kind: 'rail', x, y, w, h: 10, a })),
  ];
  if (board.cargo) fixtures.push({ kind: 'cargo', x: board.cargo[0], y: board.cargo[1], r: 11 });
  return {
    id: (index < 60 ? 'tools-' : 'works-') + slug(title),
    title,
    lesson,
    toolCourse: index < 60,
    clockwork: index >= 60,
    goal: board.cargo
      ? 'Trip the switch, then deliver the blue parcel to the receiver.'
      : goals.length === 1
        ? 'Repair the machine to ' + verbs[goals[0].kind] + '.'
        : 'Strike the numbered targets in order.',
    description:
      'The marble starts at the ' +
      (release[0] < 360 ? 'left' : 'right') +
      '. ' +
      (tools.length
        ? 'Installed equipment: ' +
          tools.map(([k]) => instruments[k]?.name || 'portal exit').join(', ') +
          '. '
        : '') +
      'The final target is ' +
      (goals.at(-1).x < 360 ? 'left' : 'right') +
      ' of center.',
    success: 'Delivery complete.',
    ball: { kind: 'marble', x: release[0], y: release[1], r: 12, vx: release[2] },
    fixtures,
    sockets: mounts,
    tray,
    goals,
  };
}
export const toolCourse = toolBoards.map(courseMachine);

export const clockCourse = clockBoards.map((board, i) => courseMachine(board, i + 60));
