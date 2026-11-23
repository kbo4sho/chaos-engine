import { qualificationBoards } from './qualification-boards.js';

export const qualificationChapters = [
  [
    'Cross training',
    'Fit two different tools and trace the first time each one acts. The striped receivers open on the bench clock.',
  ],
  [
    'Qualification finals',
    'Reach two marked receivers in order. The last five machines require three working spares.',
  ],
];
const cards = [
  [
    'Air off the cam',
    'Watch the lift under the marble. Its height as it leaves the moving face determines how long the air column can push it.',
  ],
  [
    'The loaded lever',
    'Follow the square weight down to the rocker. The pole acts on the marble while the weight supplies the push on the lever.',
  ],
  [
    'Turn after the snap',
    'Pause when the cable snaps. Its pull ends on that frame. The vane can still turn the released marble.',
  ],
  [
    'Held to the belt',
    'Trace the blue parcel. A fixed-length connection can push as well as pull, which changes where the parcel lands on the belt.',
  ],
  [
    'Hold the new heading',
    'The swirl turns the incoming path. The gyro aligns the nose, which changes where the attached thruster drives the marble.',
  ],
  [
    'Lift to the drum',
    'Look at the marble just before the rebound. Even a small change in its approach from the air column changes the time of the return.',
  ],
  [
    'Recoil lane',
    'Follow the return rail first. A pole pushes away from its center, so the side from which the marble enters sets its exit.',
  ],
  [
    'Wind against the motor',
    'Inspect the shaft at release. Motor torque and spring wind act together before the blue parcel crosses the receiver.',
  ],
  [
    'Quarter-turn crossing',
    'The vane turns the moving marble. Find which span it can reach afterward, then watch the clock on its way to the flag.',
  ],
  [
    'Charged freight',
    'Follow the load at the terminal, then at the pulse coil. The coil gives one impulse when the load enters its field.',
  ],
  [
    'Beneath the phase gate',
    'Ring the upper chime first. Watch the halo as the marble crosses the rail, then trace the coil’s push below it.',
  ],
  [
    'Break the attraction',
    'The first chime listens for blue. Watch the force between the loads before and after the brush removes the charge. Gold must reach the flag.',
  ],
  [
    'Catch the winding shaft',
    'The pawl can hold one direction of rotation. Follow the parcel past the first mark and watch the spring unwind against the held direction.',
  ],
  [
    'The falling witness',
    'Gold must ring the chime. The flag listens for a falling domino. Inspect the first contact between two tiles to find where the handoff begins.',
  ],
  [
    'Springboard dispatch',
    'The cam alters the gold signal. After the hatch opens, follow the blue parcel through the first chime and off the trampoline.',
  ],
  [
    'Escape the broken line',
    'The line separates, the vane turns the released load and the air column pushes it again. Use the three fitting times to find an idle station.',
  ],
  [
    'Tension at the far flag',
    'A rigid span and an elastic one constrain the same delivery. Track the blue parcel through the lower chime and read the final receiver clock.',
  ],
  [
    'Powered bank inspection',
    'The thruster follows the nose. Follow the change in heading at the gyro and the change in travel at the bank before the flag.',
  ],
  [
    'Along the rack',
    'Watch the input shaft begin to wind. The rack converts rotation into blue travel. The chime and flag mark two positions along that slide.',
  ],
  [
    'Last charge on the line',
    'Follow blue to the first chime. Inspect the moving charge, the instant it is grounded and the last impulse carrying freight to the open flag.',
  ],
];
const actor = { marble: 'gold marble', cargo: 'blue parcel', tile: 'falling domino' };
const article = (word) => (word === 'chime' ? 'the chime' : word === 'bell' ? 'the bell' : 'the flag');
export const qualificationCourse = qualificationBoards.map((board, i) => {
  const [title, lesson] = cards[i],
    last = board.goals.at(-1),
    first = board.goals[0];
  const end = article(last.kind) + (last.window ? ' while it is open' : '');
  const goal =
    board.goals.length === 1
      ? 'Bring the ' + actor[last.striker] + ' to ' + end + '.'
      : 'Ring the first chime with the ' +
        actor[first.striker] +
        ', then bring the ' +
        actor[last.striker] +
        ' to ' +
        end +
        '.';
  return {
    ...board,
    id: 'qualification-' + title.toLowerCase().replaceAll(' ', '-'),
    title,
    lesson,
    goal,
    qualification: true,
    description:
      goal + ' Fit ' + (board.capacity === 3 ? 'three' : 'two') + ' working spares in separate sockets.',
    success:
      board.goals.length === 2
        ? 'Both receivers registered in order.'
        : 'The receiving station registered.',
  };
});
