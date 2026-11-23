import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { sortCourse } from '../one-part-missing/sort-course.js';
import { sortingParts } from '../one-part-missing/sorting.js';
import { parts, advance, createRun, trial } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { experiment } from '../one-part-missing/tool-lab.js';
const finish = (m, fit) => {
  const r = createRun(M, m, fit);
  while (r.state === 'running') advance(M, r);
  return r;
};
describe('Mixed loads in the sorting room', () => {
  it('accepts both delivery orders and requires every installed station', () => {
    const firsts = new Set(),
      used = new Set();
    let holds = 0;
    for (const m of sortCourse) {
      const fit = certify(M, m)[0],
        r = finish(m, fit);
      expect(r.state, m.id).toBe('won');
      expect(r.binTicks.filter(Number.isFinite)).toHaveLength(2);
      expect(r.binTicks.toSorted((a, b) => a - b)).toEqual(r.hits);
      firsts.add(r.binTicks[0] < r.binTicks[1] ? 'gold' : 'blue');
      for (const g of r.goals)
        if (g.shape.hold) {
          holds++;
          expect(g.body.render.binHold).toBeGreaterThanOrEqual(g.shape.hold);
        }
      for (const f of m.fixtures.filter((s) => parts[s.kind])) {
        expect(
          r.uses.some((u) => u.kind === f.kind),
          m.id,
        ).toBe(true);
        expect(
          trial(M, { ...m, fixtures: m.fixtures.filter((s) => s !== f) }, fit).state,
          m.id + ' ' + f.kind,
        ).toBe('miss');
      }
      r.uses.forEach((u) => used.add(u.kind));
    }
    expect(firsts.size).toBe(2);
    expect(holds).toBeGreaterThan(10);
    expect([...used]).toEqual(expect.arrayContaining(Object.keys(sortingParts)));
  });
  it('separates a small and large load and distinguishes both faces of a gate', () => {
    const m = sortCourse[0],
      r = finish(m, certify(M, m)[0]);
    expect(r.uses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actor: 'marble', action: 'through gap' }),
        expect.objectContaining({ actor: 'cargo', action: 'caught on bars' }),
      ]),
    );
    const gate = sortCourse[16],
      up = finish(gate, certify(M, gate)[0]);
    const events = up.uses
      .filter((u) => u.kind === 'oneway' && u.actor === 'marble')
      .map((u) => u.action);
    expect(events).toEqual(['passed with arrow', 'blocked return']);
  });
  it.each(Object.keys(sortingParts))(
    'compares actual %s contact at three different diameters',
    (kind) => {
      for (const offset of [-24, 0, 24]) {
        const e = experiment(M, kind, offset),
          r = e.powered.run;
        expect(r.ball.circleRadius).toBe([7, 13, 21][1 + offset / 24]);
        expect(r.uses.some((u) => u.kind === kind)).toBe(true);
        expect(e.reference.run.uses).toHaveLength(0);
        if (kind === 'sieve')
          expect(r.uses[0].action).toBe(offset === 24 ? 'caught on bars' : 'through gap');
        if (kind !== 'sieve' || offset === 24)
          expect(
            e.powered.path.some(
              ([x, y], t) =>
                e.reference.path[t] &&
                Math.hypot(x - e.reference.path[t][0], y - e.reference.path[t][1]) > 10,
            ),
          ).toBe(true);
      }
    },
  );
});
