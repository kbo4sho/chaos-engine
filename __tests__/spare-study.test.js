import { it, expect } from 'vitest';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { certify } from '../one-part-missing/certify.js';
import { fittings } from '../one-part-missing/machines.js';
import { compareSpare, studyKey } from '../one-part-missing/spare-study.js';
it.each([
  1, 35, 49, 60, 93, 145, 193, 230, 248, 289, 320, 341, 362, 413, 436, 457, 480,
  488, 500,
])(
  'measures the actual physical effect of each fitted spare in job %i',
  (n) => {
    const m = campaign[n - 1],
      move = certify(M, m)[0],
      fits = fittings(m, move),
      keys = new Set();
    let complete = null;
    for (const f of fits) {
      const s = compareSpare(M, m, move, f.socket, complete);
      complete = s.fitted;
      expect(s.fitted.run.state).toBe('won');
      expect(s.bare.run.state).toBe('miss');
      expect(s.bare.run.items.filter((it) => it.shape.fitted)).toHaveLength(
        fits.length - 1,
      );
      if (s.kind === 'contacts') expect(s.correct).toBe(s.bare.run.hits.length);
      else {
        const from = s.fitted.frames[s.tick].poses[s.a][s.axis],
          to = s.bare.frames[s.tick].poses[s.b][s.axis];
        expect(Math.abs(to - from)).toBeGreaterThan(s.threshold);
        expect(s.correct).toBe(to < from ? 0 : 2);
      }
      keys.add(studyKey(m, move, f.socket));
    }
    expect(keys.size).toBe(fits.length);
    expect(compareSpare(M, m, move, 100)).toBeNull();
  },
);
