import { expect, it } from 'vitest';
import M from 'matter-js';
import { qualificationCourse } from '../one-part-missing/qualification-course.js';
import { practiceTargets } from '../one-part-missing/practice-targets.js';
import { certify, possibilities } from '../one-part-missing/certify.js';
import { createRun, advance, trial } from '../one-part-missing/machines.js';
import { toolEvents } from '../one-part-missing/tool-evidence.js';
import { fitCode, readOrderLink } from '../one-part-missing/work-orders.js';

it.each(qualificationCourse)(
  '$title requires each working fitting across seven releases',
  (m) => {
    const wins = certify(M, m);
    expect(wins).toHaveLength(1);
    const move = wins[0];
    expect(readOrderLink(m.id + '/build/' + fitCode(m, move)).move).toEqual(move);
    for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
      const r = createRun(M, m, move, offset);
      while (r.state === 'running') advance(M, r);
      expect(r.state).toBe('won');
      expect(r.hits).toHaveLength(m.goals.length);
      expect(toolEvents(m, move, r).filter((e) => e.grade === 'combined')).toHaveLength(m.capacity);
      for (let size = 0; size < m.capacity; size++)
        for (const partial of size ? possibilities(m, size) : [null])
          expect(trial(M, m, partial, offset).state).toBe('miss');
    }
  },
  30000,
);
it('offers a verified compound practice option for every working part', () => {
  expect(Object.values(practiceTargets).every(([, mix]) => mix.length > 0)).toBe(true);
  expect(qualificationCourse.slice(10).every((m) => m.goals.length === 2)).toBe(true);
  expect(qualificationCourse.slice(15).every((m) => m.capacity === 3)).toBe(true);
});
