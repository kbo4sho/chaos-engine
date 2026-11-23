import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { JSDOM } from 'jsdom';
import {
  cards,
  matchRoute,
  readMatch,
  matchBook,
  featuredCard,
  compareScore,
  matchFileRoute,
} from '../one-part-missing/match-cards.js';
import { benchmarks } from '../scripts/lib/work-order-benchmarks.mjs';
import { stamp } from '../one-part-missing/fit-stamp.js';

describe('three-round match cards', () => {
  it('uses every work order once and rotates the featured card on UTC midnights', () => {
    expect(new Set(cards.flatMap((c) => c.rounds.map((m) => m.id))).size).toBe(24);
    const d = Date.UTC(2026, 0, 1);
    expect(featuredCard(new Date(d))).toEqual(featuredCard(new Date(d + 86399999)));
    expect(featuredCard(new Date(d + 86400000))).not.toEqual(featuredCard(new Date(d)));
    expect(featuredCard(new Date(d + 8 * 86400000))).toEqual(featuredCard(new Date(d)));
  });
  it.each(cards.map((c) => [c.id, c]))(
    '%s has three beatable house scores, an exact bell and proof for both players',
    (_, c) => {
      const challenge = readMatch(M, matchRoute(c, 0));
      const codes = c.rounds
        .map((m, i) =>
          benchmarks[m.orderIndex]
            .map((f) => stamp(m, f))
            .find((code) => code !== challenge.opponent[i].code),
        )
        .join('~');
      const reply = readMatch(M, matchRoute(c, 2, c.house, codes));
      expect(reply.returned.every((r, i) => compareScore(c, i, r, reply.opponent[i]) < 0)).toBe(true);
      expect(reply.returned[2].tick).toEqual(c.call);
      expect(readMatch(M, matchRoute(c, 1, codes)).returned).toBeNull();
    },
  );
  it('measures absolute timing, with symmetric early and late and fewer parts breaking a tie', () => {
    const c = cards[0],
      early = { tick: c.call - 4, count: 1 },
      late = { tick: c.call + 4, count: 1 };
    expect(compareScore(c, 2, early, late)).toEqual(0);
    expect(compareScore(c, 2, { ...late, count: 2 }, early)).toBeGreaterThan(0);
    expect(compareScore(c, 0, { tick: 300, count: 1 }, { tick: 10, count: 2 })).toBeLessThan(0);
  });
  it('merges per-fitting receipts from independent tabs and keeps the best physical result', () => {
    const c = cards[0],
      match = readMatch(M, matchRoute(c, 0)),
      store = new JSDOM('', { url: 'https://example.test' }).window.localStorage;
    const a = matchBook(() => store, M),
      b = matchBook(() => store, M);
    const m = c.rounds[0],
      [cheap, fast] = benchmarks[m.orderIndex];
    a.keep(match, cheap);
    b.keep(match, fast);
    expect(b.best(match, 0).code).toBe(stamp(m, cheap));
    expect(a.best(match, 1)).toBeNull();
    const other = readMatch(M, matchRoute(c, 0, c.house));
    expect(a.best(other, 0)).toBeNull();
    const blocked = matchBook(() => {
      throw Error('unavailable');
    }, M);
    blocked.keep(match, cheap);
    expect(blocked.best(match, 0).tick).toBe(a.best(match, 0).tick);
  });
  it('rejects invalid recordings and keeps an offline file inside its issued card', () => {
    const c = cards[0],
      packed = matchRoute(c, 0, c.house, c.house);
    expect(readMatch(M, matchRoute(c, 3))).toBeNull();
    expect(readMatch(M, matchRoute(c, 1, 'z~z~z'))).toBeNull();
    expect(readMatch(M, packed + '/0')).toBeNull();
    expect(readMatch(M, matchRoute(c, 0) + '//')).toBeNull();
    expect(matchFileRoute(packed, matchRoute(c, 2, c.house, c.house))).toBe(
      matchRoute(c, 2, c.house, c.house),
    );
    expect(matchFileRoute(packed, matchRoute(c, 2, c.house))).toBe(matchRoute(c, 2, c.house));
    expect(matchFileRoute(packed, matchRoute(cards[1], 2, c.house))).toBe(packed);
  });
});
