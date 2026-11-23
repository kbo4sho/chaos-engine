import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { lessons, lessonById, practice } from '../one-part-missing/learning.js';
import { parts, assembly } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/workshop.js';
import { experiment } from '../one-part-missing/tool-lab.js';

describe('Learning routes', () => {
  it('places all fifty-four tools in actual repairs and teaches distinct starting mechanics', () => {
    expect(lessons).toHaveLength(103);
    expect(lessonById.size).toBe(lessons.length);
    expect(Object.keys(practice).sort()).toEqual(Object.keys(parts).sort());
    const used = (m) => assembly(m, certify(M, m)[0]).map((s) => s.kind);
    const first = lessons.slice(0, 7).map(({ machine }) => certify(M, machine)[0].part);
    expect(new Set(first).size).toBeGreaterThanOrEqual(6);
    const routeParts = new Set(lessons.flatMap(({ machine }) => used(machine)));
    for (const [part, stations] of Object.entries(practice)) {
      expect(routeParts.has(parts[part].shape.kind), part).toBe(true);
      expect(new Set(stations).size).toBe(3);
      for (const n of stations)
        expect(used(campaign[n - 1]), part + ' ' + n).toContain(parts[part].shape.kind);
    }
  });
  it.each(['bridge', 'chute', 'bumper', 'weight', 'domino'])(
    '%s produces a measurable effect in the fitted-versus-empty lab',
    (kind) => {
      const { powered, reference } = experiment(M, kind);
      expect(powered.run.uses[0]?.kind).toBe(kind);
      expect(reference.run.uses).toHaveLength(0);
      expect(
        powered.path.some(
          ([x, y], i) =>
            reference.path[i] && Math.hypot(x - reference.path[i][0], y - reference.path[i][1]) > 12,
        ),
      ).toBe(true);
      if (kind === 'domino') {
        const angle = (track) => Math.abs(track.run.items.find((item) => item.shape.track).body.angle);
        expect(angle(powered)).toBeGreaterThan(0.9);
        expect(angle(reference)).toBeLessThan(0.12);
      }
    },
  );
});
