import { pairBoards } from './pair-boards.js';
export const pairChapters = [
  ['Two empty sockets', 'Fit both spares. Test one at a time to find the first missing handoff.'],
  ['Clockwork pairs', 'Restore two moving or powered fittings. Their contact times decide the exit.'],
  ['Coupled repairs', 'Follow one moving body to the next. Repair both the support and the delivery.'],
  [
    'Master repairs',
    'Work back from the receiver through the complete machine. Two useful fittings must agree on a route.',
  ],
];
const titles = [
  'Carry then catch|The return pass|Lift and steer|Incoming freight|A change of heading|Curve and climb|Near bank|Through the workshop|Second contact|Double fitting',
  'Lift and land|The angled face|Twin strokes|On the rebound|Go and return|The turning deck|Haul and hoist|One revolution|Clear the doorway|Assembly test',
  'Two loads waiting|The breathing line|Catch the release|Two ends of a rope|Suspended delivery|Take up the slack|The loaded shaft|Dockside|Over the headblock|Paired delivery',
  'Deep transfer|Cross the hall|Morning shift|The third station|Go-between|Tail of the line|Six hands|The freight office|Two spares left|Master mechanic',
].flatMap((row) => row.split('|'));
const notes = [
  'There are two gaps. Fit either part first and run it. Look for the first place where the marble loses its route.',
  'Try switching the two tools. The marble meets the same two shapes in a different order.',
  'A tool can take effect before the marble touches its housing. Inspect the first tool event before moving the second fitting.',
  'Watch the destination first. Which fitting can produce the final approach, and which can feed that fitting?',
  'Read the incoming direction before the turn. A sideways exit and a vertical exit lead to different mounts.',
  'Watch the curve before the bounce. How high is the marble when it reaches the second surface?',
  'Trace the arrival at the far ring. Which surface can meet the marble on that side?',
  'The installed coil gives the marble a push. Find a route that reaches the coil before the last surface.',
  'Inspect the first change of direction. Can that exit reach the next surface before the marble falls?',
  'The rings preserve speed and direction. Work backward from the receiver to the exit ring.',
  'Try the moving surface by itself. Freeze the frame when it meets the marble, then trace the landing.',
  'The installed pole changes the approach. Watch which side of the moving deck meets the marble.',
  'A turning blade can touch twice. Inspect the later contact before changing the downstream fitting.',
  'First find a route onto the moving deck. The stationary belt gives you a reference for the final exit.',
  'Watch the tangent of the last blade contact. Which mounting position lies on the next arc?',
  'Use half speed. The position of the deck when the marble returns matters more than its starting height.',
  'The cam and the piston can act twice. Test the first gap, then watch the second pass.',
  'Once the blades start turning, trace the marble toward the traveling deck. Check each exit separately.',
  'Follow the gold marble until the switch closes. The receiver at the far end belongs to the blue parcel.',
  'A working door still needs a signal. Inspect the last gold contact before the blue parcel moves.',
  'The two bodies have different jobs. Test the lift on its own and watch whether the hatch gets a signal.',
  'A connection can move before the parcel reaches the pole. Use the cable cue to find that first turn.',
  'The repulsor is already active. Follow the path it creates before deciding where the airflow belongs.',
  'The wheel trades line between the two bodies. Find the instant the blue parcel meets a solid surface.',
  'Find the start of the swing, then the part of its arc inside the air column.',
  'Count both cable legs at the wheel. Shortening one line changes how much travel remains for the load.',
  'The gold marble and the blue parcel can pass the same pole. Their contact buttons identify which one passed.',
  'The hatch opens only after a signal. Try getting the gold marble to the trigger before following the delivery.',
  'The winch changes the swing radius as the parcel travels. Inspect the last landing separately.',
  'One connector limits a length, the other slows motion. Compare the parcel’s speed before and after the first pull.',
  'The pole has more than one chance to affect the run. Inspect its relationship to the air column.',
  'Follow the outgoing ring velocity. The brake has to slow the marble after the correct turn.',
  'The moving deck can meet both bodies. Trace the gold signal first, then the return of the blue parcel.',
  'Watch the exit from the air column. Its direction decides whether the belt is reachable.',
  'The hinged door and the final piston serve the blue parcel. Work backward to the gold signal.',
  'Start by checking whether the gold marble can open the door. Then inspect where the parcel lands.',
  'Follow the gold marble through the airflow and belt. The blue diamond takes the final turn.',
  'The blades may contact the marble several times. Look for the last exit that can lead to a signal.',
  'The first few tools steer the gold marble. Check which body the pole acts on after the hatch opens.',
  'Trace the job in two passes. First get the gold marble to the switch. Then follow the parcel from the hatch to the receiver.',
];
export function pairMachine(board, index) {
  const title = titles[index],
    cargo = board.fixtures.some((s) => s.kind === 'cargo');
  return {
    ...board,
    id: 'pair-' + title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-'),
    title,
    capacity: 2,
    lesson: notes[index] || pairChapters[Math.floor(index / 10)][1],
    goal: cargo
      ? 'Fit two parts and deliver the blue parcel.'
      : 'Fit two parts and reach the marked receiver.',
    description:
      'Two different fittings are needed. Choose a spare, tap a socket, then repeat. You can test with one fitting installed.',
    success: cargo ? 'Both repairs held. Parcel delivered.' : 'Both repairs held. The receiver sounded.',
  };
}
export const pairCourse = pairBoards.map(pairMachine);
