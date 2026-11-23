import { describe, expect, it } from 'vitest';
import M from 'matter-js';
import { clockCourse } from '../one-part-missing/tool-course.js';
import { mechanisms } from '../one-part-missing/mechanisms.js';
import { advance, createRun, trial } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/workshop.js';
import { experiment } from '../one-part-missing/tool-lab.js';
describe('Clockwork and cargo', () => {
  it('uses every moving solid and requires its powered motion', () => {
    const seen = new Set();
    for (const m of clockCourse) {
      const move = certify(M, m)[0],
        run = createRun(M, m, move);
      while (run.state === 'running') advance(M, run);
      expect(run.state, m.id).toBe('won');
      for (const { kind } of run.uses) seen.add(kind);
      for (const s of m.fixtures.filter((s) => s.kind in mechanisms)) {
        expect(
          trial(
            M,
            { ...m, fixtures: m.fixtures.map((f) => (f === s ? { ...f, disabled: true } : f)) },
            move,
          ).state,
          m.id + ' ' + s.kind,
        ).toBe('miss');
      }
      if (run.cargo) {
        const trigger = run.uses.find((u) => u.kind === 'switch');
        const hatch = run.uses.find((u) => u.kind === 'hatch');
        expect(trigger.actor).toBe('marble');
        expect(trigger.tick).toBe(hatch.tick);
        expect(hatch.tick).toBeLessThan(run.hits.at(-1));
        expect(m.goals.at(-1).striker).toBe('cargo');
        if (clockCourse.indexOf(m) >= 30)
          expect(
            run.uses.some((u) => u.actor === 'cargo' && run.items[u.item].shape.fitted),
            m.id,
          ).toBe(true);
      }
    }
    expect([...seen]).toEqual(expect.arrayContaining(Object.keys(mechanisms)));
  });
  it.each(Object.keys(mechanisms))('%s works from the center release in its lab', (kind) => {
    const { powered, reference } = experiment(M, kind);
    expect(powered.run.uses.some((u) => u.kind === kind)).toBe(true);
    expect(reference.run.uses.some((u) => u.kind === kind)).toBe(false);
    expect(
      powered.path.some(
        ([x, y], i) =>
          reference.path[i] && Math.hypot(x - reference.path[i][0], y - reference.path[i][1]) > 10,
      ),
    ).toBe(true);
  });
});
