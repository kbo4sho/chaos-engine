import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { flightCourse } from '../one-part-missing/flight-course.js';
import { flightParts, gearBit } from '../one-part-missing/flight.js';

import { parts, advance, createRun, trial } from '../one-part-missing/machines.js';
import { snapshot, atFrame } from '../one-part-missing/drawing.js';
import { certify } from '../one-part-missing/certify.js';
import { experiment } from '../one-part-missing/tool-lab.js';
describe('Flight fittings', () => {
  it.each(flightCourse.map((m, i) => [i + 361, m]))(
    'flight %i requires every active station',
    (_, m) => {
      const fits = certify(M, m);
      expect(fits).toHaveLength(1);
      const fit = fits[0];
      for (const delta of [-3, -2, -1, 0, 1, 2, 3]) {
        expect(trial(M, m, fit, delta).state).toBe('won');
        expect(trial(M, m, null, delta).state).toBe('miss');
      }
      for (const f of m.fixtures.filter((s) => parts[s.kind]))
        expect(
          trial(
            M,
            { ...m, fixtures: m.fixtures.map((s) => (s === f ? { ...s, disabled: true } : s)) },
            fit,
          ).state,
          f.kind,
        ).toBe('miss');
    },
  );
  it.each(Object.keys(flightParts))('%s can be investigated in a physical comparison', (k) => {
    const { powered, reference } = experiment(M, k);
    expect(powered.run.uses.some((u) => u.kind === k)).toBe(true);
    expect(reference.run.uses.some((u) => u.kind === k)).toBe(false);
    expect(
      powered.path.some(
        ([x, y], i) =>
          reference.path[i] && Math.hypot(x - reference.path[i][0], y - reference.path[i][1]) > 18,
      ),
    ).toBe(true);
  });
  it('scrubs equipment at the actual pickup and release frames', () => {
    const m = flightCourse[6],
      r = createRun(M, m, certify(M, m)[0]),
      t = [snapshot(r)];
    while (r.state === 'running') {
      advance(M, r);
      t.push(snapshot(r));
    }
    const active = r.uses.find((u) => u.kind === 'float').tick,
      released = r.uses.find((u) => u.kind === 'unload').tick;
    const gear = (n) => atFrame(r, t[n]).ball.render?.gearMask || 0;
    expect([gear(active - 1), gear(active), gear(released - 1), gear(released)]).toEqual([
      0,
      gearBit.float,
      gearBit.float,
      0,
    ]);
  });
  it('distinguishes fitting the foot from landing on a support and jumping', () => {
    const m = flightCourse[4],
      fit = certify(M, m)[0],
      r = createRun(M, m, fit);
    while (r.state === 'running') advance(M, r);
    const events = r.uses.filter((u) => u.kind === 'hopper');
    expect(events.map((u) => u.action)).toEqual(['attached', 'hopped']);
    expect(events[1].tick).toBeGreaterThan(events[0].tick);
    const air = createRun(M, { ...m, fixtures: m.fixtures.filter((s) => s.kind !== 'rail') }, fit);
    while (air.state === 'running') advance(M, air);
    expect(air.uses.some((u) => u.action === 'hopped')).toBe(false);
  });
});
