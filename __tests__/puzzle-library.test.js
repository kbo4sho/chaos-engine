import { describe, it, expect } from 'vitest';
import { findLevels, startRoute } from '../one-part-missing/library.js';
import { campaign } from '../one-part-missing/campaign.js';
import { orders } from '../one-part-missing/work-orders.js';
import { parts } from '../one-part-missing/machines.js';
import { lessons } from '../one-part-missing/learning.js';
describe('Puzzle library', () => {
  it('introduces mixed tools on first entry and respects old campaign progress and route choice', () => {
    expect(startRoute(null, {})).toBe('learn/last-bell');
    const r = { 'last-bell': { part: 'bridge', socket: 0 } };
    expect(startRoute(null, r)).toBe(campaign[1].id);
    expect(startRoute({ route: 'learn', id: 'last-bell' }, r)).toBe('learn/' + lessons[1].machine.id);
    expect(startRoute({ route: 'orders', id: orders[12].id }, r)).toBe(orders[12].id);
    expect(startRoute({ route: 'numbered', id: campaign[302].id }, r)).toBe(campaign[302].id);
  });
  it('indexes the actual working tools on all boards and supports intersecting several terms', () => {
    const all = findLevels('', 'all', false);
    expect(all.length).toBe(campaign.length + orders.length);
    expect(new Set(all.flatMap((r) => r.tools))).toEqual(new Set(Object.keys(parts)));
    const pairs = findLevels('gearbox rack', 'all', false);
    expect(pairs.some((r) => r.machine === campaign[319])).toBe(true);
    expect(pairs.every((r) => r.tools.includes('gearbox') && r.tools.includes('rack'))).toBe(true);
    expect(findLevels('tether', 'campaign', false).some((r) => r.machine === campaign[200])).toBe(true);
    expect(findLevels('gearbox', 'campaign', false).some((r) => r.machine === campaign[280])).toBe(
      false,
    );
  });
  it('distinguishes campaign, lesson and order numbers and filters completed work', () => {
    expect(findLevels('level 303', 'all', false).map((r) => r.machine)).toEqual([campaign[302]]);
    expect(findLevels('3', 'lessons', false).map((r) => r.machine)).toEqual([lessons[2].machine]);
    expect(findLevels('order 24', 'all', false)[0].machine).toBe(orders[23]);
    expect(findLevels('LAST BELL', 'all', true, { 'last-bell': { part: 'bridge', socket: 0 } })).toEqual(
      [],
    );
    expect(findLevels('no such machine', 'all', false)).toEqual([]);
  });
});
