import { devices, outlet } from './devices.js';
import { toolBoards } from './tool-boards.js';

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
    ...(kind === 'outlet' ? outlet : devices[kind].shape),
    x,
    y,
    dir,
  });
  const goals = targets.map(([kind, x, y, w, h]) => ({ kind, x, y, w, h, sensor: true }));
  const lesson =
    lessons[index] ||
    (index < 50
      ? 'Run the incomplete machine. Watch for the first tool the marble fails to reach.'
      : 'Trace each handoff before fitting a part. Scrub the film to check where the chain changes.');
  const mounts = sockets.map(([x, y, dir = 1]) => ({ x, y, dir }));
  const fixtures = [
    ...(rail ? [{ kind: 'rail', x: rail[0], y: rail[1], w: rail[2], h: 12, a: rail[3] }] : []),
    ...tools.map(toTool),
  ];
  return {
    id: 'tools-' + slug(title),
    title,
    lesson,
    toolCourse: true,
    goal:
      goals.length === 1
        ? 'Repair the machine to ' + verbs[goals[0].kind] + '.'
        : 'Strike the numbered targets in order.',
    description:
      'The marble starts at the ' +
      (release[0] < 360 ? 'left' : 'right') +
      '. ' +
      (tools.length
        ? 'Installed equipment: ' +
          tools.map(([k]) => devices[k]?.name || 'portal exit').join(', ') +
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
