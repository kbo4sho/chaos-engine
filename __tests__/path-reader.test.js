import { describe, expect, it } from 'vitest';
import { pathPasses, pathLandmark, filmPaths } from '../one-part-missing/path-reader.js';
const trace = (points, jumps = []) => ({ points, jumps: new Set(jumps) });
describe('picking recorded physics frames', () => {
  it('offers two visits to the same point, each at its real recording time', () => {
    const t = trace([
      [0, 0],
      [5, 0],
      [10, 0],
      [15, 0],
      [10, 0],
      [5, 0],
      [0, 0],
    ]);
    expect(pathPasses(t, 5, 0, 0.6, 2).map((p) => p.frame)).toEqual([1, 5]);
  });
  it('does not draw a selectable segment across a portal and still selects either mouth', () => {
    const t = trace(
      [
        [0, 1],
        [2, 1],
        [100, 1],
        [103, 1],
      ],
      [2],
    );
    expect(pathPasses(t, 50, 1, 3, 0)).toHaveLength(0);
    expect(pathPasses(t, 100, 1, 3, 0)[0].frame).toBe(2);
  });
  it('picks an actual endpoint of a fast sweep and retains the selected frame in a stationary dwell', () => {
    expect(
      pathPasses(
        trace([
          [0, 0],
          [100, 0],
        ]),
        68,
        0,
        1,
        0,
      )[0].frame,
    ).toBe(1);
    expect(
      pathPasses(
        trace([
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0],
        ]),
        0,
        0,
        3,
        2,
      )[0].frame,
    ).toBe(2);
  });
  it('keeps landmark picks inside the close-up, including when bodies leave the machine', () => {
    const t = trace([
      [-10, 8],
      [50, 13],
      [100, 9],
      [300, 45],
    ]);
    expect(pathLandmark(t, 'right', [0, 0, 150, 40])).toBe(2);
    expect(pathLandmark(t, 'top', [0, 0, 150, 40])).toBe(2);
    expect(pathLandmark(t, 'left', [400, 0, 20, 15])).toBeNull();
  });
  it('measures touch tolerance in screen pixels irrespective of bench zoom', () => {
    const t = trace([
      [20, 20],
      [50, 20],
    ]);
    expect(pathPasses(t, 35, 40, 12, 0, 0.5, 0.5)).toHaveLength(1);
    expect(pathPasses(t, 35, 40, 12, 0, 2, 2)).toHaveLength(0);
  });
  it('tracks a spinning rim and moving domino; skips a stationary drop weight', () => {
    const f = {
      actors: { marble: 0 },
      uses: [],
      items: [
        { shape: { kind: 'marble', flywheel: true, r: 10 } },
        { shape: { kind: 'tile' } },
        { shape: { kind: 'weight' } },
      ],
      frames: [
        {
          poses: [
            [10, 10, 0],
            [80, 80, 0],
            [120, 90, 0],
          ],
        },
        {
          poses: [
            [10, 10, Math.PI / 2],
            [86, 85, 0.1],
            [120, 90, 0],
          ],
        },
      ],
    };
    const paths = filmPaths(f, 'Reply');
    expect(paths.map((p) => p.name)).toEqual(['Reply · Input rim', 'Reply · Domino 1']);
    expect(paths[0].points[0][0]).toBeCloseTo(17.2);
    expect(paths[0].points[1][1]).toBeCloseTo(17.2);
  });
});
