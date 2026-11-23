import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import M from 'matter-js';
import {
  orders,
  orderById,
  fitCode,
  readOrderLink,
  orderLog,
  orderPrefix,
} from '../one-part-missing/work-orders.js';
import { advance, createRun, validMove, trial } from '../one-part-missing/machines.js';
import { possibilities } from '../one-part-missing/certify.js';
import { benchmarks } from '../scripts/lib/work-order-benchmarks.mjs';
describe('Open-ended work orders', () => {
  it.each(orders.map((m, i) => [m.title, m, i]))(
    '%s rewards two working, non-dominated delivery plans',
    (_, m, i) => {
      const [single, pair] = benchmarks[i];
      for (const offset of [-3, 0, 3]) {
        const times = [single, pair].map((move) => {
          expect(validMove(m, move)).toBe(true);
          const r = createRun(M, m, move, offset);
          while (r.state === 'running') advance(M, r);
          expect(r.state).toBe('won');
          expect(r.items.every((it, n) => !it.shape.fitted || r.uses.some((u) => u.item === n))).toBe(
            true,
          );
          return r.tick;
        });
        expect(times[0] - times[1]).toBeGreaterThanOrEqual(5);
        expect(trial(M, m, null, offset).state).toBe('miss');
      }
      const bestSingle = trial(M, m, single).tick,
        bestPair = trial(M, m, pair).tick;
      for (const candidate of [...possibilities({ ...m, capacity: 1 }), ...possibilities(m)]) {
        const r = trial(M, m, candidate);
        if (r.state === 'won')
          expect(r.tick).toBeGreaterThanOrEqual(candidate.second ? bestPair : bestSingle);
      }
    },
  );
  it('round-trips canonical shared fittings and rejects an invalid or partial URL', () => {
    for (const [i, m] of orders.entries()) {
      expect(orderById.get(m.id)).toBe(m);
      for (const move of benchmarks[i])
        expect(readOrderLink(m.id + '/build/' + fitCode(m, move))).toEqual({ machine: m, move });
      expect(readOrderLink(m.id)).toEqual({ machine: m, move: null });
      const code = fitCode(m, benchmarks[i][1]);
      for (const bad of [
        '',
        code.split('.').reverse().join('.'),
        code + '.' + code,
        'x-motor',
        code + '/build/',
      ])
        expect(readOrderLink(m.id + '/build/' + bad)).toBeNull();
    }
  });
  it('keeps fastest and fewest-parts plans independently across tabs and blocked storage', () => {
    const m = orders[0],
      [one, two] = benchmarks[0],
      s = new JSDOM('', { url: 'https://example.test' }).window.localStorage;
    const a = orderLog(() => s),
      b = orderLog(() => s);
    a.save(m, one, 100);
    b.save(m, two, 62);
    a.save(m, two, 91);
    expect(b.records(m).economy.move).toEqual(one);
    expect(a.records(m).speed.tick).toBe(62);
    s.setItem(orderPrefix + m.id + '/a-invalid', '1');
    s.setItem(orderPrefix + m.id + '/broken', '-4');
    expect(a.records(m)).toEqual(b.records(m));
    const fallback = orderLog(() => {
      throw Error('unavailable');
    });
    fallback.save(m, two, 80);
    fallback.save(m, one, 102);
    expect(fallback.records(m).speed.move).toEqual(two);
    expect(fallback.records(m).economy.move).toEqual(one);
  });
});
