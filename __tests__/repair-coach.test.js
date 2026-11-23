import { describe, expect, it } from 'vitest';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { orders } from '../one-part-missing/work-orders.js';
import { advance, createRun } from '../one-part-missing/machines.js';
import { snapshot } from '../one-part-missing/drawing.js';
import { recordAttempt } from '../one-part-missing/attempt-film.js';
import { inspectMiss, guideRepair, compareHandoff } from '../one-part-missing/repair-coach.js';
function inspect(m, move = null) {
  const r = createRun(M, m, move),
    frames = [snapshot(r)];
  while (r.state === 'running') {
    advance(M, r);
    frames.push(snapshot(r));
  }
  expect(r.state).toBe('miss');
  const film = recordAttempt(m, r, move, frames);
  return { film, diagnosis: inspectMiss(m, film, r.passes) };
}
describe('Optional repair hints', () => {
  it('measures the actual closest approach and links a visible separation to the working path', () => {
    const m = campaign[0],
      { film, diagnosis: d } = inspect(m),
      ref = guideRepair(M, m, null, d);
    expect(d.tick).toBe(229);
    expect(Math.round(d.distance)).toBe(90);
    expect(ref.steps).toEqual([{ operation: 'fit', part: 'bridge', socket: 0 }]);
    const comparison = compareHandoff(film, d, ref);
    expect(comparison.first).toBe(216);
    expect(comparison.distance(comparison.first)).toBeGreaterThanOrEqual(d.source.r);
  });
  it('points to the parcel that needed more time to settle', () => {
    const { diagnosis: d } = inspect(campaign[320], { part: 'chute', socket: 0 });
    expect(d.kind).toBe('cargo');
    expect(d.detail).toContain('10 of the 12 consecutive frames');
  });
  it('identifies the closed receiver on a real rejected pass', () => {
    const { diagnosis: d, film } = inspect(campaign[285], { part: 'torsion', socket: 1 });
    expect(d.detail).toContain('while it was closed');
    expect(d.tick).toBeLessThan(film.frames.length);
  });
  it('explains a missing striker without inventing a path for that actor', () => {
    const m = campaign[55],
      { diagnosis: d } = inspect(m);
    expect(d.detail).toContain('no drop weight');
    expect(d.kind).toBe('marble');
    expect(guideRepair(M, m, null, d).steps[0].part).toBe('weight');
  });
  it('keeps a good first part and reveals the remaining installation', () => {
    const m = campaign[240],
      move = { part: 'conveyor', socket: 0 },
      { diagnosis: d } = inspect(m, move);
    expect(guideRepair(M, m, move, d).steps).toEqual([
      { operation: 'fit', part: 'trampoline', socket: 1 },
    ]);
  });
  it.each(orders.map((m) => [m.title, m]))('finds a one-part start for the open order %s', (_, m) => {
    const { diagnosis: d } = inspect(m);
    const ref = guideRepair(M, m, null, d);
    expect(ref.steps).toHaveLength(1);
    expect(ref.steps[0].operation).toBe('fit');
  });
});
