import { trial, canFlip } from './machines.js';
export const offsets = [-2, 0, 2];
export function certify(M, machine) {
  if (!offsets.every((n) => trial(M, machine, null, n).state === 'miss')) return null;
  const repairs = [];
  for (const part of machine.tray) {
    for (let socket = 0; socket < machine.sockets.length; socket++) {
      for (const move of canFlip(machine, part)
        ? [
            { part, socket },
            { part, socket, flipped: true },
          ]
        : [{ part, socket }]) {
        if (offsets.every((n) => trial(M, machine, move, n).state === 'won')) repairs.push(move);
      }
    }
  }
  return repairs.length ? repairs : null;
}
