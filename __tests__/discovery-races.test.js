import { describe, expect, it } from 'vitest';
import M from 'matter-js';
import {
  lessons,
  exposures,
  simulate,
  measure,
  separation,
  radius,
} from '../one-part-missing/discovery/experiments.js';
import { raceRoute, readRace } from '../one-part-missing/friend-race.js';
import { orders } from '../one-part-missing/work-orders.js';
import { benchmarks } from '../scripts/lib/work-order-benchmarks.mjs';

describe('discovery exposures', () => {
  it.each(lessons.map((l) => [l.id, l]))(
    '%s teaches a visible effect and has exactly one measured transfer solution',
    (_, lesson) => {
      const [studyEnd, testEnd, targets] = exposures[lesson.id];
      for (const transfer of [false, true]) {
        const frames = transfer ? testEnd : studyEnd;
        const tapes = lesson.values.map((_, i) => simulate(M, lesson, transfer, i, frames));
        expect(tapes.every((t) => t.frames.at(-1).tick === frames)).toBe(true);
        for (const [i, tape] of tapes.entries()) {
          expect(tape.actors.every(({ index }) => index >= 0)).toBe(true);
          for (const prior of tapes.slice(0, i)) expect(separation(tape, prior)?.t).toBeGreaterThan(0);
        }
        if (transfer) {
          const scores = tapes.map((t) => measure(t, targets));
          expect(scores.filter((rows) => rows.every((r) => r.inside))).toHaveLength(1);
          for (const miss of scores.filter((rows) => rows.some((r) => !r.inside)))
            expect(Math.max(...miss.map((r) => Math.hypot(r.dx, r.dy)))).toBeGreaterThan(radius * 2);
        }
      }
    },
  );
});
describe('friend challenge addresses', () => {
  it.each(orders.map((m, i) => [m.id, m, benchmarks[i]]))(
    '%s reconstructs both verified deliveries with unsolved mounts',
    (_, m, [one, two]) => {
      const invite = raceRoute(m, one),
        reply = raceRoute(m, one, two);
      const blind = readRace(M, invite),
        result = readRace(M, reply);
      expect(blind.reply).toBeNull();
      expect(result.host.move).toEqual(one);
      expect(result.reply.move).toEqual(two);
      expect(result.reply.tick).toBeLessThan(result.host.tick);
      expect(result.host.film.frames.at(-1).hits.at(-1)).toBe(result.host.tick);
    },
  );
  it('rejects malformed, noncanonical and unsolved invitations', () => {
    const m = orders[0],
      route = raceRoute(m, benchmarks[0][0]);
    for (const bad of [
      route + '/',
      route + '/bad',
      route + '/1/1',
      route.replace('/1/', '/2/'),
      'race/1/' + m.id + '/00',
      'race/1/' + m.id + '/3.3',
      'race/1/' + m.id + '/zz',
      'race/1/order-unknown/1',
      route + '0'.repeat(130),
    ])
      expect(readRace(M, bad)).toBeNull();
    const losing = m.tray
      .flatMap((part) => m.sockets.map((_, socket) => raceRoute(m, { part, socket })))
      .filter(Boolean)
      .find((hash) => !readRace(M, hash));
    expect(losing).toBeTruthy();
  });
});

import { raceBook, racePrefix } from '../one-part-missing/race-book.js';
import { editHistory } from '../one-part-missing/bench-edits.js';
import { JSDOM } from 'jsdom';

describe('return visits to a challenge', () => {
  it('keeps invitations and replays separately, merges independent writes and trims only its own keys', () => {
    const storage = new JSDOM('', { url: 'https://example.test' }).window.localStorage;
    const a = raceBook(() => storage, 2),
      b = raceBook(() => storage, 2);
    const first = raceRoute(orders[0], benchmarks[0][0]),
      result = raceRoute(orders[0], ...benchmarks[0]);
    const second = raceRoute(orders[1], benchmarks[1][0]);
    storage.setItem('other', 'keep');
    a.keep(first, 'sent', 1);
    b.keep(result, 'returned', 2);
    a.keep(first, 'opened', 3);
    expect(b.recent().map((r) => r.source)).toEqual(['sent', 'returned']);
    b.keep(second, 'opened', 4);
    expect(a.recent().map((r) => r.route)).toEqual([second, first]);
    expect(storage.getItem(racePrefix + result)).toBeNull();
    expect(storage.getItem('other')).toBe('keep');
  });
  it('still keeps recent routes in a storage-restricted session', () => {
    const book = raceBook(() => {
      throw Error('storage denied');
    });
    const route = raceRoute(orders[0], benchmarks[0][0]);
    book.keep(route, 'opened', 10);
    expect(book.recent()[0].route).toBe(route);
  });
});
it('restores empty and multipart setups exactly and forgets them on navigation', () => {
  const history = editHistory(2),
    [one, two] = benchmarks[0];
  history.remember(null, one);
  history.remember(one, { ...one });
  history.remember(one, two);
  expect(history.undo()).toEqual(one);
  expect(history.undo()).toBe(null);
  expect(history.available).toBe(false);
  history.remember(null, two);
  history.clear();
  expect(history.available).toBe(false);
});
