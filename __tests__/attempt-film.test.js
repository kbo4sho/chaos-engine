import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { certify } from '../one-part-missing/certify.js';
import { createRun, advance } from '../one-part-missing/machines.js';
import { snapshot } from '../one-part-missing/drawing.js';
import { recordAttempt, keepAttempts, compareAttempts } from '../one-part-missing/attempt-film.js';
function attempt(m, move) {
  const r = createRun(M, m, move),
    frames = [snapshot(r)];
  while (r.state === 'running') {
    advance(M, r);
    frames.push(snapshot(r));
  }
  return recordAttempt(m, r, move, frames);
}
describe('Synchronized attempt recordings', () => {
  it('finds a sustained radius of separation after a real bridge contact', () => {
    const m = campaign[0],
      blank = attempt(m, null),
      fixed = attempt(m, certify(M, m)[0]);
    const { first, end, contact } = compareAttempts(fixed, blank);
    expect(first.kind).toBe('marble');
    expect(contact).toMatchObject({ whose: 'Latest', kind: 'bridge' });
    expect(contact.tick).toBeLessThanOrEqual(first.tick);
    expect(first.tick).toBeLessThan(end);
    const indexA = fixed.actors.marble,
      indexB = blank.actors.marble;
    const space = (t) =>
      Math.hypot(
        ...fixed.frames[t].poses[indexA].slice(0, 2).map((n, i) => n - blank.frames[t].poses[indexB][i]),
      );
    expect(space(first.tick - 1)).toBeLessThan(12);
    for (const d of [0, 1, 2]) expect(space(first.tick + d)).toBeGreaterThanOrEqual(12);
  });
  it('retains the last distinct setup after an exact replay and starts over on a new machine', () => {
    const m = campaign[0],
      empty = attempt(m, null),
      fit = attempt(m, certify(M, m)[0]);
    const history = keepAttempts(keepAttempts(null, empty), fit);
    expect(keepAttempts(history, fit).previous).toBe(empty);
    expect(keepAttempts(history, attempt(campaign[1], null)).previous).toBeNull();
    expect(compareAttempts(fit, fit).first).toBeNull();
  });
  it('uses the parcel as the first changing body if the gold path stays the same', () => {
    const m = campaign[199],
      full = certify(M, m)[0],
      empty = attempt(m, null),
      solved = attempt(m, full);
    expect(compareAttempts(solved, empty).first.kind).toBe('cargo');
    expect(solved.items.some((it) => it.body)).toBe(false);
  });
});
