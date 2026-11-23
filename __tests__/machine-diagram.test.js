import { expect, it } from 'vitest';
import { campaign } from '../one-part-missing/campaign.js';
import { parts, LIMIT } from '../one-part-missing/machines.js';
import { receiverOpen } from '../one-part-missing/transmissions.js';
import { diagramEntries, receiverWindows, nearby, hitsAt } from '../one-part-missing/machine-diagram.js';

it('locates every installed body, mounting socket and receiver on all 520 release diagrams', () => {
  for (const m of campaign) {
    const entries = diagramEntries(m, null);
    expect(entries).toHaveLength(m.fixtures.length + 1 + m.sockets.length + m.goals.length);
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    expect(
      entries.every(
        (e) =>
          Number.isFinite(e.shape.x) &&
          Number.isFinite(e.shape.y) &&
          e.location &&
          !e.notes.includes(undefined),
      ),
    ).toBe(true);
    for (const e of entries.filter((e) => e.group === 'sockets'))
      expect(e.notes).toContain('Empty mounting point.');
  }
});
it('reads actual installed rail orientation and does not fill an empty socket', () => {
  const m = campaign.find((m) => m.reversible && m.tray.includes('bridge'));
  const e = diagramEntries(m, { part: 'bridge', socket: 0, flipped: true });
  expect(e.find((r) => r.id === 'socket-0').notes.join(' ')).toContain(
    parts.bridge.name + ' · rail reversed',
  );
  expect(e.find((r) => r.id === 'socket-1').notes).toContain('Empty mounting point.');
});
it('matches the physical open/closed receiver at every frame, including wrapped windows', () => {
  const goals = [
    ...campaign.flatMap((m) => m.goals).filter((s) => s.window),
    { window: { start: 8, period: 10, duration: 5 } },
  ];
  for (const g of goals) {
    const windows = receiverWindows(g);
    for (let t = 0; t <= LIMIT; t++)
      if (receiverOpen(g, t) !== windows.some(([a, b]) => t >= a && t <= b))
        throw Error('Frame mismatch ' + t);
  }
  expect(receiverWindows(goals.at(-1)).slice(0, 2)).toEqual([
    [0, 2],
    [8, 12],
  ]);
});
it('explains separate load, order, bin dwell, pace and direction constraints from the machine', () => {
  const relay = diagramEntries(campaign[513]).filter((e) => e.group === 'receivers');
  expect(relay[0].notes.join(' ')).toContain('Gold marble');
  expect(relay[1].notes.join(' ')).toContain('Domino');
  const m = campaign.find((m) => m.goals.some((s) => s.bin && s.hold > 1 && s.pace !== undefined));
  const bin = diagramEntries(m).find(
    (e) => e.shape.bin && e.shape.hold > 1 && e.shape.pace !== undefined,
  );
  expect(bin.notes.join(' ')).toContain(bin.shape.hold + ' consecutive frames');
  expect(bin.notes.join(' ')).toContain('Speed at most ' + bin.shape.pace);
  expect(bin.notes.join(' ')).toContain('either order');
});
it('picks the rotated silhouette, includes overlapping items, and measures actual nearest centers', () => {
  const rail = { shape: { x: 100, y: 100, w: 120, h: 8, a: Math.PI / 2 } },
    point = { shape: { x: 100, y: 145, r: 5 } };
  expect(hitsAt([rail, point], 100, 145, 1)).toEqual([point, rail]);
  expect(hitsAt([rail], 143, 100, 1)).toEqual([]);
  const entries = diagramEntries(campaign[0]);
  const start = entries[0],
    r = nearby(entries, start, 'receivers');
  expect(r.entry.index).toBe(0);
  expect(r.text).toContain(
    String(Math.round(Math.hypot(r.entry.shape.x - start.shape.x, r.entry.shape.y - start.shape.y))),
  );
});
