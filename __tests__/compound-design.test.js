import { expect, it } from 'vitest';
import M from 'matter-js';
import { compoundKits } from '../one-part-missing/compound-design.js';
import {
  freshDesign,
  buildDesign,
  encodeDesign,
  readDesign,
  proveDesign,
  designFilm,
} from '../one-part-missing/blueprints.js';
import { advance, createRun, fittings } from '../one-part-missing/machines.js';
import { toolEvents } from '../one-part-missing/tool-evidence.js';
it('issues every stock compound template with all required spares acting and a canonical shared drawing', () => {
  const seen = new Set();
  for (const k of compoundKits) {
    const d = freshDesign(k.id),
      address = encodeDesign(d),
      proof = proveDesign(M, d);
    expect(readDesign(address)).toEqual(d);
    expect(proof.machine?.id, k.name + ' ' + proof.reason).toBe(address);
    const run = createRun(M, proof.machine, proof.intended);
    while (run.state === 'running') advance(M, run);
    const acts = toolEvents(proof.machine, proof.intended, run).filter((e) => e.grade === 'fitted');
    expect(acts.length).toBe(k.stations.length);
    for (const e of acts) seen.add(e.kind);
  }
  expect(seen.size).toBe(54);
  expect(compoundKits).toHaveLength(120);
}, 180000);
it('retains the exact initial form of every old single-station address', () => {
  for (let i = 0; i < 6; i++) {
    const d = freshDesign(i),
      address = encodeDesign(d);
    expect(address.startsWith('design-1-')).toBe(true);
    expect(readDesign(address)).toEqual(d);
  }
});
it('retains permanent hardware, remaps sockets and preserves earlier receivers when the final target moves', () => {
  const d = freshDesign(1520);
  d.hidden = [0, 2];
  d.missing = 0;
  const initial = buildDesign(d),
    last = initial.machine.goals.at(-1);
  d.target = [last.x + 1, last.y];
  const changed = buildDesign(d);
  expect(changed.machine.goals[0]).toEqual(initial.machine.goals[0]);
  expect(changed.machine.capacity).toBe(2);
  expect(fittings(changed.machine, changed.intended)).toHaveLength(2);
  expect(changed.machine.fixtures.some((s) => s.kind === changed.stations[1].kind)).toBe(true);
  expect(readDesign(encodeDesign(d))).toEqual(d);
});
it('does not issue duplicate or superfluous removable tools', () => {
  const c = compoundKits.find(
    (k) => k.stations.length === 2 && k.stations[0].options.includes(k.stations[1].kind),
  );
  expect(c).toBeTruthy();
  const d = freshDesign(c.id);
  d.edits[0].type = c.stations[0].options.indexOf(c.stations[1].kind);
  expect(proveDesign(M, d).reason).toMatch(/different spares/);
});
it('uses the actual domino when capturing the final receiver in a mixed-striker machine', () => {
  const d = freshDesign(1514),
    f = designFilm(M, d, true);
  expect(f.targetActor).toBe('domino');
  expect(f.run.items[f.actorIndex].shape.kind).toBe('tile');
});
it('rejects noncanonical masks, malformed calibrations and nonexistent stock', () => {
  const valid = encodeDesign(freshDesign(1501));
  for (const code of [
    valid.replace('-3-', '-0-'),
    valid.replace('-3-', '-7-'),
    valid.replace('0442', '0942'),
    valid.replace('dx', 'zz'),
    valid + '-0',
  ])
    expect(readDesign(code)).toBeNull();
});
