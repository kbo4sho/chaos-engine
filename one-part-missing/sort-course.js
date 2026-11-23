import { sortBoards } from './sort-boards.js';
export const sortChapters = [
  [
    'Sorting room',
    'Follow both loads. Match the gold marble and the blue parcel to their own receivers.',
  ],
  [
    'Clearance tests',
    'Compare diameter, approach direction and settling time. Either receiver can be reached first.',
  ],
  [
    'Sorting lines',
    'Use the handling tools together with belts, powered fields and clockwork. Follow one load at a time.',
  ],
  [
    'Dispatch floor',
    'Both loads share a working line. Read both delivery times to locate the missing handoff.',
  ],
];
const titles = [
  'Through the grating|Into the funnel|The pickup basket|On the ice|Against the arrow|Down the cable|Small enough|Twin bins|A steady landing|First collection',
  'The wide mouth|The small opening|A quick release|Lower shelf|A clean catch|Passing overhead|Above the gate|Two aisles|The slow load|Clearance inspection',
  'Conveyor sorting|Two flags waiting|The carrying current|Grating transfer|Outbound lane|One-way freight|The cable station|Sorted by size|Elevated loads|Line inspection',
  'Supply counter|Long haul|Slip and catch|The outer bay|A measured stop|Two destinations|The receiving desk|Sorting exchange|Late collection|Dispatch complete',
].flatMap((s) => s.split('|'));
const notes = [
  'Compare the diameter of each load with the gap. The blue diamond marked HOLD needs its load to settle.',
  'Watch the sloping sides. One load can settle in the throat while the other takes a different route.',
  'A receiver can finish first while the other load is still moving. Look for the load that needs a catch.',
  'The polished rail gives a moving load a shallow, low-friction exit. Follow its next landing.',
  'The arrows show permitted travel. A load approaching against the arrows can come to rest on the gate.',
  'Watch the moment the rider leaves the cable. Its outgoing direction follows the final stretch.',
  'Measure the small load against the grating. Which route stays open beneath it?',
  'Look at the first touch on the incline. The two loads arrive with different speeds.',
  'Inspect the first delivery before moving any spares. Which load is still in transit?',
  'Trace the rider into the cable entrance, then follow the other load to its mark.',
  'A wide mouth collects loads from the side. The opening at the bottom decides which load continues.',
  'The polished surface and the grating work in sequence. Watch the height of the incoming load.',
  'Step through the cable exit. The rider leaves with forward speed that a nearby surface can redirect.',
  'Use the one-way arrows to trace the approach to the lower shelf.',
  'First find the clean entry. The route through the throat changes with the angle of approach.',
  'The cable carries its rider along a fixed tangent. Look for the platform underneath the return.',
  'The marble starts below the gate. Watch it pass upward, turn, and land on the same gate from above.',
  'Two nearby loads can reach their receivers in either order. Trace the smaller load first.',
  'Mark the cable exit before following the load to the funnel mouth.',
  'A load that fits an opening can continue into the basket. Inspect both arrival cues separately.',
  'The belt adds horizontal speed. Look at where the load reaches the ice.',
  'Follow the curve toward the magnet. Check which side of the funnel it meets.',
  'A cable exit can feed the air column. Pause there before following the rest of the route.',
  'Compare the load caught by the grating with the load carried along the belt.',
  'The coil changes the approach speed. Follow the outgoing load onto the inclined rail.',
  'The trampoline can send a load back toward the gate. Check which direction the arrows allow.',
  'Trace the rider along the wire, then inspect how the spring surface changes the outgoing path.',
  'Watch where the magnet bends the approach to the grating. The two loads have different clearances.',
  'The moving deck and the basket can take a load at different times. Inspect the later arrival.',
  'Read the line from the funnel onto the powered belt and across the polished rail.',
  'The grating separates the paths. Follow the load affected by the pole before changing the catch.',
  'The cable and the fan can change the exit speed. Look for where the ice takes over.',
  'Trace the load across the polished surface and belt. Where does the catch need to meet it?',
  'Follow the turn through the funnel. The coil changes the approach to the ice.',
  'Look at the load slowed by the basket. Which side of the one-way surface can hold it?',
  'The grating, air column and cable share a line. Inspect each load’s route separately.',
  'Work back from the receiver through the basket, coil and polished rail.',
  'Track the first load that reaches the funnel. Find the moment the cable and the magnet change the other path.',
  'The funnel sets up the bounce. Trace the outgoing curve as far as the incline.',
  'Four stations share this delivery. Inspect the first bin, then follow the remaining load through its last station.',
];
export function sortMachine(board, i) {
  const title = titles[i];
  return {
    ...board,
    id: 'sort-' + title.toLowerCase().replaceAll(' ', '-'),
    title,
    sorting: true,
    goal: 'Deliver gold to its ring and blue to its diamond.',
    lesson: notes[i] || sortChapters[Math.floor(i / 10)][1],
    description:
      'Each load has its own receiver. Either may arrive first. A receiver marked HOLD needs the load to settle inside.',
    success: 'Both loads received.',
  };
}
export const sortCourse = sortBoards.map(sortMachine);
