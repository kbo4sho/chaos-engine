import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { assemblyCourse } from '../one-part-missing/assembly-course.js';
import { campaign } from '../one-part-missing/campaign.js';
import {
  fittings,
  packFittings,
  placePart,
  validMove,
  createRun,
  advance,
  trial,
} from '../one-part-missing/machines.js';
import { certify, possibilities } from '../one-part-missing/certify.js';
import { fitCode, decodeFitting, readOrderLink } from '../one-part-missing/work-orders.js';
import { inspectMiss, guideRepair } from '../one-part-missing/repair-coach.js';
import { recordAttempt } from '../one-part-missing/attempt-film.js';
import { snapshot } from '../one-part-missing/drawing.js';
describe('Three-part repairs', () => {
  it.each(assemblyCourse.map((m) => [m.title, m]))(
    '%s needs three working fittings and all its active hardware',
    (_, m) => {
      const moves = certify(M, m);
      expect(moves).toHaveLength(1);
      const fit = moves[0],
        placed = fittings(m, fit);
      expect(placed).toHaveLength(3);
      const r = createRun(M, m, fit);
      while (r.state === 'running') advance(M, r);
      for (const [n, it] of r.items.entries())
        if (it.shape.fitted) expect(r.uses.some((u) => u.item === n)).toBe(true);
      for (const fixed of m.fixtures.filter(
        (s) => m.tray.includes(s.kind) || r.uses.some((u) => u.kind === s.kind),
      )) {
        const reduced = {
          ...m,
          fixtures: m.fixtures.map((s) => (s === fixed ? { ...s, disabled: true } : s)),
        };
        expect(trial(M, reduced, fit).state).toBe('miss');
      }
      expect([-3, -1, 1, 3].every((o) => trial(M, m, fit, o).state === 'won')).toBe(true);
      expect(fittings(m, decodeFitting(m, fitCode(m, fit)))).toEqual(placed);
      expect(readOrderLink(m.id + '/build/' + fitCode(m, fit)).move).toEqual(fit);
    },
  );
  it('preserves the first two valid placements and rejects corrupt or over-capacity entries', () => {
    const m = assemblyCourse.at(-1),
      [a, b, c] = fittings(m, certify(M, m)[0]),
      first = placePart(m, null, c),
      pair = placePart(m, first, a),
      all = placePart(m, pair, b);
    expect(validMove(m, pair)).toBe(false);
    expect(validMove(m, all)).toBe(true);
    expect(fittings(m, all)).toEqual([a, b, c]);
    expect(fittings(m, { ...a, third: c })).toEqual([]);
    expect(fittings(m, { ...a, second: a, third: c })).toEqual([]);
    expect(fittings(m, { ...a, second: { ...b, third: c } })).toEqual([]);
    expect(fittings(campaign[240], { ...a, second: b, third: c })).toEqual([]);
    const extra = m.tray.find((k) => ![a.part, b.part, c.part].includes(k)),
      unused = m.sockets.findIndex((_, k) => ![a.socket, b.socket, c.socket].includes(k));
    expect(placePart(m, all, { part: extra, socket: unused })).toBe(all);
    expect(fittings(m, placePart(m, all, { ...a, part: extra })).some((f) => f.part === extra)).toBe(
      true,
    );
  });
  it('the coach keeps the two correct stations on a missed assembly', () => {
    const m = assemblyCourse[0],
      fit = certify(M, m)[0],
      placed = fittings(m, fit),
      two = packFittings(placed.slice(0, 2));
    const r = createRun(M, m, two),
      frames = [snapshot(r)];
    while (r.state === 'running') {
      advance(M, r);
      frames.push(snapshot(r));
    }
    const film = recordAttempt(m, r, two, frames),
      which = inspectMiss(m, film, r.passes),
      ref = guideRepair(M, m, two, which);
    expect(ref.steps).toEqual([{ operation: 'fit', ...placed[2] }]);
  });
  it('enumerates combinations once in canonical socket order', () => {
    const m = assemblyCourse[0],
      moves = [...possibilities(m)];
    expect(new Set(moves.map((f) => JSON.stringify(f))).size).toBe(moves.length);
    expect(moves).toHaveLength(6);
  });
});
