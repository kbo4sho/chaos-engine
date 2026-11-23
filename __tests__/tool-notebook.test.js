import { expect, it } from 'vitest';
import M from 'matter-js';
import { campaign } from '../one-part-missing/campaign.js';
import { parts, createRun, advance } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { practiceTargets } from '../one-part-missing/practice-targets.js';
import { toolEvents, toolEvidence } from '../one-part-missing/tool-evidence.js';
function run(machine, move) {
  const r = createRun(M, machine, move);
  while (r.state === 'running') advance(M, r);
  return r;
}
it('records the first active fitted body even when a fixed copy acts earlier', () => {
  const m = campaign[400],
    move = certify(M, m)[0],
    simulation = run(m, move),
    first = simulation.uses.find((e) => simulation.items[e.item]?.shape.fitted);
  const fixed = simulation.items.findIndex((it) => !it.shape.fitted);
  const extra = { ...first, item: fixed, tick: 0 };
  simulation.uses.unshift(extra);
  simulation.uses.push({ ...first, kind: 'bridge', tick: simulation.hits.at(-1) + 15 });
  const rows = toolEvents(m, move, simulation),
    of = (g) => rows.find((r) => r.kind === first.kind && r.grade === g);
  expect(of('seen').tick).toBe(0);
  expect(of('fitted').tick).toBe(first.tick);
  expect(of('combined').partner).not.toBe(first.kind);
  expect(rows.some((r) => r.kind === 'bridge')).toBe(false);
});
it('does not record idle spares or a missed delivery', () => {
  const m = campaign[400],
    move = certify(M, m)[0];
  expect(
    toolEvents(m, move, run(m, move.part ? { part: move.part, socket: move.socket } : null)),
  ).toEqual([]);
  const r = run(m, move);
  r.uses = r.uses.filter((e) => !r.items[e.item]?.shape.fitted);
  expect(toolEvents(m, move, r).filter((x) => x.grade !== 'seen')).toEqual([]);
});
it('preserves the first witness for each grade across storage outages', () => {
  const db = toolEvidence(() => {
      throw Error('storage blocked');
    }),
    m = campaign[400],
    move = certify(M, m)[0];
  db.record(m, move, run(m, move));
  const kind = move.part;
  expect(db.get(kind, 'fitted').machine).toBe(m.id);
  expect(db.processed(m.id, { ...move, tick: 150, savedAt: 1 })).toBe(true);
  const n = { ...m, id: 'sample-lesson' };
  db.record(n, move, run(n, move));
  expect(db.get(kind, 'fitted').machine).toBe(m.id);
  expect(db.get('unknown', 'seen')).toBeNull();
});
it('lists only recommendations where every certified setup activates the named fitting', () => {
  expect(Object.keys(practiceTargets).sort()).toEqual(Object.keys(parts).sort());
  for (const [kind, pair] of Object.entries(practiceTargets)) {
    expect(pair.flat().length).toBeGreaterThan(0);
    for (const [index, levels] of pair.entries()) {
      const grade = index ? 'combined' : 'fitted';
      for (const n of levels.slice(0, 1)) {
        const m = campaign[n - 1];
        for (const move of certify(M, m))
          expect(
            toolEvents(m, move, run(m, move)).some((r) => r.kind === kind && r.grade === grade),
            kind + ' in ' + n,
          ).toBe(true);
      }
    }
  }
}, 120000);
