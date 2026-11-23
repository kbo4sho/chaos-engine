import { trial, canFlip, packFittings } from './machines.js';
export const offsets = [-2, 0, 2];
export function* possibilities(machine) {
  const singles = [];
  for (const part of machine.tray) {
    for (let socket = 0; socket < machine.sockets.length; socket++) {
      singles.push({ part, socket });
      if (canFlip(machine, part)) singles.push({ part, socket, flipped: true });
    }
  }
  if (machine.capacity !== 2) {
    yield* singles;
    return;
  }
  for (const first of singles)
    for (const second of singles) {
      if (first.socket < second.socket && first.part !== second.part)
        yield packFittings([first, second]);
    }
}
export function certify(M, machine) {
  if (!offsets.every((n) => trial(M, machine, null, n).state === 'miss')) return null;
  if (machine.capacity === 2) {
    for (const part of machine.tray)
      for (let socket = 0; socket < machine.sockets.length; socket++)
        if (offsets.some((n) => trial(M, machine, { part, socket }, n).state === 'won')) return null;
  }
  const repairs = [];
  for (const move of possibilities(machine)) {
    if (offsets.every((n) => trial(M, machine, move, n).state === 'won')) repairs.push(move);
  }
  return repairs.length ? repairs : null;
}
