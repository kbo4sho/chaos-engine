import { assembly, parts, createRun, advance } from '../machines.js';
import { snapshot } from '../drawing.js';
import { recordAttempt, compareAttempts } from '../attempt-film.js';

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
export function tapeFor(M, machine) {
  const run = createRun(M, machine),
    frames = [snapshot(run)];
  while (run.state === 'running') {
    advance(M, run);
    frames.push(snapshot(run));
  }
  return { run, frames, film: recordAttempt(machine, run, null, frames) };
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
