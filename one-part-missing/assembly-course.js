import { assemblyBoards } from './assembly-boards.js';
import { parts } from './machines.js';
export const assemblyChapters = [
  [
    'Three at the bench',
    'Trace the first spare that acts. Keep it in place while you test the next handoff.',
  ],
  [
    'Lines and shafts',
    'Connect a moving load, carry torque or convert rotation into travel. Read the endpoints on each mount.',
  ],
  [
    'Freight inspection',
    'Deliver two different loads or equip one in flight. Watch which body reaches each station.',
  ],
  [
    'Assembly finals',
    'Choose three spares for the line. Check the timing of the entire machine, one contact at a time.',
  ],
];
const cards = [
  [
    'Three at the bench',
    'Three spares, three mounts. Start with one part. Fitting activity tells you exactly when a spare first touches the run.',
  ],
  [
    'Spring return',
    'A pole can push or pull before the load reaches a surface. Follow the bend that ends in a rebound.',
  ],
  [
    'Up to the rings',
    'The last ring carries the incoming velocity across the gap. Work backward to the speed that the far side needs.',
  ],
  [
    'Brake after the bend',
    'Trace the route from the exit ring through the turn. A brake changes where a moving marble falls.',
  ],
  [
    'Moving meeting',
    'The elevator moves while the marble travels. Step the film until both reach the same height.',
  ],
  [
    'Trip inspection',
    'Watch the gold marble trigger a latch. Then follow the blue parcel through the second half of the bench.',
  ],
  [
    'Twin sensing lines',
    'Two tripwires can report the same kind of contact. Fitting activity identifies the spare you actually installed.',
  ],
  [
    'Press and spring',
    'A wheel can send the marble back through an earlier region. Watch the second pass before moving the last fitting.',
  ],
  [
    'Far side braking',
    'Read the approach to the installed portal. Compare a single fitted return part with the full route.',
  ],
  [
    'Two floors down',
    'The upper line carries the signal, the lower line carries the parcel. Test each side separately.',
  ],
  [
    'Reel and spring',
    'A shortening cable changes the swing while a spring stretches. Find where the moving load can enter the lift.',
  ],
  [
    'Tension in the line',
    'A slack tether does not pull. Scrub the run until it straightens, then check the direction of the next force.',
  ],
  [
    'Hoist return',
    'Find which end of the line rises when the other end falls. Let the receiver tell you which body to follow.',
  ],
  [
    'Over the sheave',
    'Read each pair of endpoints. A winch changes a line’s length and a pulley transfers travel between its ends.',
  ],
  [
    'Engage the shaft',
    'Find the input and output shafts. The rack can only move the parcel once the clutch transmits motion.',
  ],
  [
    'Travel left',
    'The final receiver checks direction. Use the marks on the shaft to work out which way the rack should travel.',
  ],
  [
    'Load at speed',
    'Inspect the parcel as it leaves the rack. The field at the end of the line still changes the arrival.',
  ],
  [
    'Wound input',
    'The torsion spring stores an angle. Watch the input and intermediate shaft separately as that angle unwinds.',
  ],
  [
    'At full extension',
    'A moving end can reach a surface twice. Check the first taut line, then look for the contact that delivers the parcel.',
  ],
  [
    'Timed transmission',
    'The blue receiver has an opening interval. Compare the instant the clutch passes motion with the arrival time.',
  ],
  [
    'Two receiving bays',
    'Gold and blue count separately. Begin with the first load that reaches its bay and check what the other load still needs.',
  ],
  [
    'Catch the second load',
    'Watch both exits from the ice. A basket can catch one size of load while the other continues over its rim.',
  ],
  [
    'Wire above the sieve',
    'Follow the load that takes the overhead line. Its release height decides whether the next grating is reachable.',
  ],
  [
    'Quiet landing',
    'Gold must remain in its bay for consecutive frames. Check the hold counter before changing a successful blue approach.',
  ],
  [
    'Second collection',
    'Work backward from the slower receiving bay. Inspect the last push the load receives before settling.',
  ],
  [
    'Drop the collar',
    'Floating keeps existing velocity. Inspect the two events that fit and release equipment before judging the landing.',
  ],
  [
    'Bank without drift',
    'The bank uses the body’s facing axis. Compare the paths before and after the ring, then find where gravity resumes.',
  ],
  [
    'Airborne freight',
    'Restore the gold signal before tracing the parcel. A release hoop only acts on a load carrying gear.',
  ],
  [
    'Departure clearance',
    'Look at the nose of the moving body. Its thruster travels with it until it crosses the release hoop.',
  ],
  [
    'Night airfield',
    'The final receiver opens briefly. Inspect the gear on the parcel as it crosses the first target.',
  ],
  [
    'Transfer across town',
    'An installed ring moves the marble between two parts of the bench. Track its speed across the break in the trail.',
  ],
  [
    'Punch clock',
    'The gold switch opens a different lane. Mark the handoff from wheel to signal before repairing the parcel landing.',
  ],
  [
    'Rigging certificate',
    'Trace both legs of the pulley, then watch the spring feed the load into the air column.',
  ],
  [
    'Power certificate',
    'The motor, coupled wheels and moving rack form a chain. Look for the first shaft that fails to move its output.',
  ],
  [
    'Cold store crossover',
    'A bank redirects the incoming load while the ice changes its contact with the surface. Both receiving bays must register.',
  ],
  [
    'Runway handoff',
    'The belt sets the parcel’s approach to its flight equipment. Watch where the canopy opens before judging the bank.',
  ],
  [
    'Return through the mill',
    'The piston can engage after the door opens. Follow the gold signal and the blue parcel in separate viewings.',
  ],
  [
    'The evening train',
    'Watch the rail, both fields and the receiver clock. A moving parcel can still arrive on the wrong stroke.',
  ],
  [
    'Windward approach',
    'The canopy limits descent and the keel resists sideways slip. Compare the two headings around the bank.',
  ],
  [
    'Chief mechanic',
    'Trace the release signal, propulsion and final bank in order. The open window belongs to the blue parcel.',
  ],
];
export const assemblyCourse = assemblyBoards.map((board, i) => {
  const [title, lesson] = cards[i],
    all = [...board.fixtures.map((s) => s.kind), ...board.tray],
    bins = board.goals.every((g) => g.bin),
    cargo = board.goals.some((g) => g.striker === 'cargo');
  return {
    ...board,
    id: 'assembly-' + title.toLowerCase().replaceAll(' ', '-'),
    title,
    lesson,
    capacity: 3,
    flightEquipment: all.some((k) =>
      ['thruster', 'float', 'keel', 'parachute', 'hopper', 'unload'].includes(k),
    ),
    shaftMounts: all.some((k) => parts[k]?.shape.drive),
    goal: bins
      ? 'Fit three spares and deliver both loads to their receiving bays.'
      : cargo
        ? 'Fit three spares and deliver the blue parcel.'
        : 'Fit three spares and reach the marked targets in order.',
    description:
      'A three-part repair. The activity strip records the first action of each installed spare.',
    success: 'Assembly accepted.',
  };
});
