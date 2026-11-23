import M from 'matter-js';
import { expect, it } from 'vitest';
import { lessons, exposures, simulate } from '../one-part-missing/discovery/experiments.js';
import { instrumentReading, instrumentEvents } from '../one-part-missing/discovery/instruments.js';
function observation(id, setting, transfer = false) {
  const lesson = lessons.find((l) => l.id === id),
    tape = simulate(M, lesson, transfer, setting, exposures[id][Number(transfer)]);
  return { events: instrumentEvents(tape), read: (t) => instrumentReading(lesson, tape, t) };
}
it('reads the exact frame at which a phase interval expires', () => {
  const { events, read } = observation('phase-clearance', 0);
  const end = events.find((e) => e.name === 'Solid again');
  expect(read(end.tick - 1).state).toContain('0.02 s left');
  expect(read(end.tick).state).toContain('collisions on');
});
it('shows the actual neutral frame and loss of attached gear in the two transfer rigs', () => {
  const ground = observation('ground-brush', 1, true);
  const discharge = ground.events.find((e) => e.name.includes('grounded'));
  expect(ground.read(discharge.tick - 1).state).toContain('positive');
  expect(ground.read(discharge.tick).state).toContain('neutral');
  const cut = observation('cut-away', 1, true),
    release = cut.events.find((e) => e.name.includes('released gear'));
  expect(cut.read(release.tick - 1).state).toContain('Float collar');
  expect(cut.read(release.tick).state).toBe('No gear attached');
});
it('measures travel and turn from the selected frame on a reversed input', () => {
  const arm = observation('clutch-input', 1, true);
  expect(arm.read(0).state).toContain('0.00 turns');
  expect(arm.read(20).state).toMatch(/Input -[0-9]/);
  expect(arm.read(20).motion).toContain('units/s');
});
