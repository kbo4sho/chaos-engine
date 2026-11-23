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
import { advance, assembly, createRun, fittings, trial } from '../one-part-missing/machines.js';
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

it('keeps mounted tools in their original working order and reproduces published drawings', () => {
  for (const [kit, hidden] of [
    [1431, [0]],
    [1431, [0, 2]],
    [1513, [0]],
  ]) {
    const original = buildDesign(freshDesign(kit));
    const d = freshDesign(kit);
    d.hidden = hidden;
    d.missing = hidden[0];
    const address = encodeDesign(d),
      legacy = address.replace('design-3-', 'design-2-');
    expect(address).toMatch(/^design-3-/);
    expect(encodeDesign(readDesign(legacy))).toBe(legacy);
    expect(proveDesign(M, readDesign(legacy)).machine).toBeUndefined();
    const built = proveDesign(M, readDesign(address));
    expect(built.machine?.id).toBe(address);
    for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
      expect(trial(M, built.machine, built.intended, offset)).toEqual(
        trial(M, original.machine, original.intended, offset),
      );
    }
  }
  const published = 'design-2-eg-5-044304420442-s',
    old = readDesign(published);
  expect(encodeDesign(old)).toBe(published);
  expect(proveDesign(M, old).machine?.id).toBe(published);
});

it('keeps the working hardware sequence for every choice of permanent and removable stations', () => {
  const physical = ({ fitted, mountOrder, ...hardware }) => hardware;
  let choices = 0;
  for (const k of compoundKits) {
    const stock = buildDesign(freshDesign(k.id));
    const expected = assembly(stock.machine, stock.intended).map(physical);
    for (let mask = 1; mask < 1 << k.stations.length; mask++) {
      const drawing = freshDesign(k.id);
      drawing.hidden = drawing.hidden.filter((i) => mask & (1 << i));
      drawing.missing = drawing.hidden[0];
      const built = buildDesign(drawing);
      expect(assembly(built.machine, built.intended).map(physical), built.machine.id).toEqual(expected);
      choices++;
    }
  }
  expect(choices).toBe(552);
});
