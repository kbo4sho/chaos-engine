import { flightBoards } from './flight-boards.js';
export const flightChapters = [
  ['Flight fittings', 'Collect equipment at a ring. Follow what stays on the moving load.'],
  ['Change of course', 'Combine fittings and find the moment a change of equipment matters.'],
  ['Parcel airfield', 'Release the blue parcel, then guide its flight from station to station.'],
  ['Flight certification', 'Trace the course in stages. Each working station earns its place.'],
];
const titles = [
  'Neutral buoyancy',
  'Silk landing',
  'Under its own power',
  'Hold a heading',
  'The hopping foot',
  'The bank turn',
  'Back to gravity',
  'Clean departure',
  'Long descent',
  'Touch and go',
  'Carry the thrust',
  'Drag and drive',
  'The turning fin',
  'Canopy release',
  'Trimmed approach',
  'Hopping freight',
  'Free glide',
  'Second wind',
  'Reversed approach',
  'Service interval',
  'Parcel pilot',
  'Soft parcel',
  'The transfer fin',
  'Parcel runway',
  'Clear the hatch',
  'Bank the parcel',
  'Gliding post',
  'Parcel lift',
  'Brake on approach',
  'Crossfield mail',
  'The fitting shed',
  'Longway round',
  'Over the footbridge',
  'Two service stops',
  'Air brake',
  'The return corridor',
  'Ground crew',
  'Tower approach',
  'Last departure',
  'Flight certified',
];
const notes = [
  'The float collar cancels new gravity. It keeps the motion the load already has when it enters the ring.',
  'The canopy resists a fall. Watch the same load keep travelling sideways as it descends.',
  'A thruster keeps pushing after pickup. Look at the load’s facing mark to predict the direction.',
  'The keel reduces motion across the load’s own axis. Watch what happens to its sideways skid.',
  'The foot arms at the ring. It jumps only from a supporting surface. Inspect both events in the run.',
  'A bank mirrors velocity across the load’s facing direction. Compare the incoming and outgoing slopes.',
  'The first ring fits a collar. The release hoop removes it, letting gravity bend the remaining path.',
];
export function flightMachine(board, i) {
  const title = titles[i];
  return {
    ...board,
    id: 'flight-' + title.toLowerCase().replaceAll(' ', '-'),
    title,
    flight: true,
    goal: board.goals.some((g) => g.striker === 'cargo')
      ? 'Release the blue parcel and deliver it through the marked targets.'
      : board.goals.length > 1
        ? 'Fly through the numbered targets in order.'
        : 'Fly the gold marble into the receiver.',
    lesson: notes[i] || board.note || flightChapters[Math.floor(i / 10)][1],
    description:
      'Rings fit equipment to a passing load. Inspect the run to see which gear it is carrying.',
    success: 'Flight cleared.',
  };
}
export const flightCourse = flightBoards.map(flightMachine);
