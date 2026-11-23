import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { pairCourse } from '../one-part-missing/pair-course.js';
import {
  assembly,
  validMove,
  fittings,
  packFittings,
  placePart,
  trial,
  advance,
  createRun,
} from '../one-part-missing/machines.js';
import { certify, possibilities } from '../one-part-missing/certify.js';
import { repairBook } from '../one-part-missing/repairs.js';
import { JSDOM } from 'jsdom';
describe('Two-part repairs', () => {
  it('lets players fit in either order, move a spare, remove it, or replace the tool in a socket', () => {
    const m = pairCourse[28],
      a = { part: m.tray[0], socket: 0 },
      b = { part: m.tray[1], socket: 1 };
    const v = placePart(m, placePart(m, null, a), b);
    expect(placePart(m, placePart(m, null, b), a)).toEqual(v);
    expect(validMove(m, a)).toBe(false);
    expect(assembly(m, a).filter((s) => s.fitted)).toHaveLength(1);
    expect(validMove(m, v)).toBe(true);
    expect(placePart(m, v, { part: m.tray[2], socket: 2 })).toBe(v);
    const replace = placePart(m, v, { part: m.tray[2], socket: 1 });
    expect(fittings(m, replace).map((x) => x.part)).toEqual([a.part, m.tray[2]]);
    expect(fittings(m, placePart(m, v, { ...a, socket: 1 }))).toEqual([{ ...a, socket: 1 }]);
    expect(packFittings([])).toBeNull();
    expect(validMove(m, { ...a, second: a })).toBe(false);
    expect(validMove(m, { ...a, second: { ...b, socket: 0 } })).toBe(false);
  });
  it('retains both fitted positions across a fresh book and rejects an incomplete pair as a repair', () => {
    const m = pairCourse[1],
      fit = certify(M, m)[0],
      d = new JSDOM('', { url: 'https://example.test' });
    try {
      const store = () => d.window.localStorage;
      repairBook(store).save(m.id, fit, 101);
      const loaded = repairBook(store).read()[m.id];
      expect(fittings(m, loaded)).toEqual(fittings(m, fit));
      expect(validMove(m, loaded)).toBe(true);
      expect(validMove(m, { ...loaded, second: undefined })).toBe(false);
    } finally {
      d.window.close();
    }
  });
  it('ramps the search space and requires a single physical pair for every job', () => {
    expect(pairCourse).toHaveLength(40);
    expect([...possibilities(pairCourse[0])]).toHaveLength(2);
    expect([...possibilities(pairCourse.at(-1))]).toHaveLength(72);
    const observed = new Set();
    for (const m of pairCourse) {
      const fits = certify(M, m);
      expect(fits, m.id).toHaveLength(1);
      const move = fits[0];
      const r = createRun(M, m, move);
      while (r.state === 'running') advance(M, r);
      for (const it of r.items.filter((x) => x.shape.fitted)) {
        expect(
          r.uses.some((u) => u.item === r.items.indexOf(it) && u.tick <= r.hits.at(-1)),
          m.id + ' ' + it.shape.kind,
        ).toBe(true);
        observed.add(it.shape.kind);
      }
      for (const f of fittings(m, move))
        for (const o of [-3, -2, 0, 2, 3]) expect(trial(M, m, f, o).state, m.id).toBe('miss');
      for (const o of [-3, 3]) expect(trial(M, m, move, o).state, m.id).toBe('won');
    }
    expect(observed.size).toBeGreaterThanOrEqual(18);
  }, 30000);
});
