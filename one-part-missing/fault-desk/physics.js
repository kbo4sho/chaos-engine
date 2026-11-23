import { assembly, parts } from '../machines.js';

import { compareAttempts } from '../attempt-film.js';
export { recordSimulation as tapeFor } from '../attempt-film.js';

export function inspectionLine(source, fit) {
  return assembly(source, fit)
    .slice(0, -source.goals.length - 1)
    .map(({ fitted, ...s }) => s);
}
export function fieldMachine(source, fit, station, change, service = null) {
  const fixtures = inspectionLine(source, fit).map((shape, i) =>
    i === station && service !== i ? { ...shape, ...change } : shape,
  );
  return { ...source, fixtures, capacity: 1, sockets: [], tray: [] };
}
export function firstDifference(record, reference) {
  return compareAttempts(record.film, reference.film).first;
}
export function scopes(line, indices) {
  return [...indices]
    .sort((a, b) => line[a].x - line[b].x || line[a].y - line[b].y)
    .map((item, i) => ({
      item,
      letter: String.fromCharCode(65 + i),
      name: parts[line[item].kind].name,
    }));
}
export function stationReading(tape, item) {
  const event = tape.run.uses.find((e) => e.item === item);
  return event
    ? {
        tick: event.tick,
        action: event.action || 'contact',
        actor: event.actor,
      }
    : null;
}
