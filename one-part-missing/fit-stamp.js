import { fitCode, decodeFitting } from './work-orders.js';

// Published v1 part numbers stay stable if the drawer is reordered. The
// low two bits name the socket. An address carries no player data or score.
const raceParts = (
  'conveyor trampoline fan magnet syrup deflector portal repulsor cam elevator piston pinwheel tripwire switch hatch ' +
  'sieve funnel basket ice oneway zipline float parachute thruster keel hopper bank unload pulse swirl lift gyro phase positive negative ground ' +
  'motor gearbox clutch torsion ratchet rack tether spring strut winch pulley breaklink damper bridge chute bumper weight domino'
).split(' ');
export function stamp(machine, move) {
  if (!fitCode(machine, move) || [move, move.second].some((f) => f && !raceParts.includes(f.part)))
    return null;
  return [move, move.second]
    .filter(Boolean)
    .map((fit) => (1 + raceParts.indexOf(fit.part) * 4 + fit.socket).toString(36))
    .join('.');
}
export function readStamp(machine, value) {
  if (!/^[1-9a-z][0-9a-z]?(\.[1-9a-z][0-9a-z]?)?$/.test(value)) return null;
  const code = value
    .split('.')
    .map((token) => {
      const index = parseInt(token, 36) - 1;
      return String.fromCharCode(97 + (index % 4)) + '-' + raceParts[Math.floor(index / 4)];
    })
    .join('.');
  const move = decodeFitting(machine, code);
  return move && stamp(machine, move) === value ? move : null;
}
