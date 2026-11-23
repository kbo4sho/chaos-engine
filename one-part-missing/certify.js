import { trial, canFlip, packFittings } from './machines.js';
export const offsets = [-2, 0, 2];
export function* possibilities(machine, count = machine.capacity || 1) {
  const singles = [];
  for (const part of machine.tray) {
    for (let socket = 0; socket < machine.sockets.length; socket++) {
      singles.push({ part, socket });
      if (canFlip(machine, part)) singles.push({ part, socket, flipped: true });
    }
  }
  function* choose(placed, nextSocket) {
    if (placed.length === count) {yield packFittings(placed);return;}
    for (const candidate of singles) {
      if (candidate.socket < nextSocket || placed.some(f=>f.part===candidate.part)) continue;
      yield* choose([...placed,candidate],candidate.socket+1);
    }
  }
  yield* choose([],0);
}
export function certify(M, machine) {
  if (!offsets.every((n) => trial(M, machine, null, n).state === 'miss')) return null;
  for (let count=1; count<(machine.capacity || 1); count++) {
    for (const partial of possibilities(machine,count))
      if (offsets.some(n=>trial(M,machine,partial,n).state==='won')) return null;
  }
  const repairs = [];
  for (const move of possibilities(machine)) {
    if (offsets.every((n) => trial(M, machine, move, n).state === 'won')) repairs.push(move);
  }
  return repairs.length ? repairs : null;
}
