import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import {
  jobs,
  testLot,
  sheetLink,
  readSheet,
  legal,
  certificates,
  batchMachine,
} from '../one-part-missing/test-bay/station.js';
import { batchBenchmarks } from '../scripts/lib/batch-benchmarks.mjs';
describe('Production test bay', () => {
  it.each(jobs.map((job, i) => [job.title, job, batchBenchmarks[i]]))(
    '%s has exactly one common calibration',
    (_, j, b) => {
      expect(b.id).toBe(j.id);
      const settings =
        j.dials.length === 1
          ? Array.from({ length: 5 }, (_, i) => [i])
          : Array.from({ length: 25 }, (_, i) => [Math.floor(i / 5), i % 5]);
      const good = [],
        outcomes = new Set();
      for (const s of settings) {
        const lots = [0, 1, 2].map((i) => testLot(M, j, s, i));
        const flags = lots.map((r) => Number(r.ok)).join('');
        outcomes.add(flags);
        if (flags === '111') {
          good.push(s);
          expect(lots.map((r) => r.tick)).toEqual(b.ticks);
          for (const lot of lots) {
            expect(lot.tick).toBeGreaterThanOrEqual(12);
            for (const d of j.dials) expect(lot.uses.some((u) => u.item === d.station)).toBe(true);
          }
        }
      }
      expect(good).toEqual([b.settings]);
      expect([...outcomes].some((k) => k !== '111' && k !== '000')).toBe(true);
      expect(readSheet(sheetLink(j, b.settings))).toEqual({ job: j, settings: b.settings });
    },
  );
  it('restores a valid approval when browser storage is unavailable', () => {
    const c = certificates(() => {
        throw Error('blocked');
      }),
      j = jobs[0],
      b = batchBenchmarks[0];
    c.save(j, b.settings, [b.ticks[0], null, b.ticks[2]]);
    expect(c.read(j)).toBeNull();
    c.save(j, b.settings, b.ticks);
    expect(c.read(j)).toEqual({ settings: b.settings, ticks: b.ticks });
  });
  it('rejects abbreviated, excessive and out-of-range shared settings', () => {
    const j = jobs.at(-1);
    for (const s of ['', '0', '44.', '-1', '44~1', '99'])
      expect(readSheet('#' + j.id + '~' + s)).toBeNull();
    expect(legal(j, [0, 5])).toBe(false);
    expect(() => batchMachine(j, [4, 5], 0)).toThrow();
    expect(() => batchMachine(j, [0, 0], 3)).toThrow();
  });
  it('keeps each prepared test independent when changing an earlier lot', () => {
    const j = jobs[0],
      s = batchBenchmarks[0].settings,
      one = batchMachine(j, s, 0),
      three = batchMachine(j, s, 2);
    one.fixtures[0].x += 100;
    one.ball.x += 100;
    expect(batchMachine(j, s, 2)).toEqual(three);
    expect(one.ball.r).not.toBe(three.ball.r);
  });
});
