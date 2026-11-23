import { it, expect } from 'vitest';
import { mountLabels } from '../one-part-missing/mount-layout.js';
it('keeps the rack and countershaft separately tappable on a narrow printed table', () => {
  const a = [
    { x: 64, y: 96 },
    { x: 183, y: 116 },
    { x: 165.5, y: 122 },
  ];
  const points = mountLabels(a, [{ x: 130.5, y: 114.5 }], 360, 200);
  for (const [i, p] of points.entries()) {
    expect(p.x).toBeGreaterThanOrEqual(22);
    expect(p.x).toBeLessThanOrEqual(338);
    for (const q of points.slice(i + 1))
      expect(Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y))).toBeGreaterThanOrEqual(44);
  }
});
