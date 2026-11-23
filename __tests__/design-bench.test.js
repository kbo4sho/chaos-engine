import { describe, expect, it } from 'vitest';
import M from 'matter-js';
import {
  buildDesign,
  designKits,
  encodeDesign,
  readDesign,
  freshDesign,
  proveDesign,
  designOffsets,
  designFilm,
} from '../one-part-missing/blueprints.js';
import { decodePrint, resolveMachine } from '../one-part-missing/workshop.js';
import { trial } from '../one-part-missing/machines.js';
describe('Player-built machines', () => {
  it.each(designKits.map((k, i) => [k.name, i]))(
    '%s starts as a playable and reproducible drawing',
    (_, i) => {
      const d = freshDesign(i),
        id = encodeDesign(d);
      expect(readDesign(id)).toEqual(d);
      expect(decodePrint(id)).toMatchObject({ base: id });
      const value = resolveMachine(M, id),
        fit = buildDesign(d).intended;
      expect(value.verifiedRepairs).toBeGreaterThan(0);
      for (const n of designOffsets) {
        expect(trial(M, value, null, n).state).toBe('miss');
        expect(trial(M, value, fit, n).state).toBe('won');
      }
    },
  );
  it('lets a player replace an installed belt, remove it and capture a new target from the real run', () => {
    const d = freshDesign();
    d.missing = 0;
    d.edits[0].type = 1;
    const stale = proveDesign(M, d);
    expect(stale.machine).toBeUndefined();
    const f = designFilm(M, d, true);
    d.target = f.tape[101].poses[f.actorIndex].slice(0, 2).map(Math.round);
    const proof = proveDesign(M, d),
      machine = proof.machine;
    expect(d.target).toEqual([694, 162]);
    expect(proof.intended.part).toBe('trampoline');
    expect(machine.fixtures.map((s) => s.kind)).toContain('fan');
    expect(resolveMachine(M, encodeDesign(d))).toEqual(machine);
    expect(designKits[0].base.fixtures[0].kind).toBe('conveyor');
  });
  it('rejects an unneeded part and gives the designer a usable diagnosis', () => {
    const d = freshDesign();
    d.missing = 1;
    expect(proveDesign(M, d).reason).toMatch(/delivers with the station missing/);
  });
  it('changing the motor setting changes the actual arrival time', () => {
    const d = freshDesign(4),
      a = designFilm(M, d, true);
    d.edits.at(-1).tune = 2;
    const b = designFilm(M, d, true);
    expect(a.run.state).toBe('won');
    expect(b.run.state).toBe('won');
    expect(b.run.tick).toBeLessThan(a.run.tick);
  });
  it.each([
    'design-1-0-2-044204420442-01.28',
    'design-1-0-2-044204420442-zz.zz',
    'design-1-0-2-044204420442-hw.73',
    'design-1-0-2-044204420442-S',
    'design-1-9-2-044204420442-s',
    'design-1-0-2-944204420442-s',
    'design-1-4-0-08420442-s',
    'design-1-0-2-044304420442-s',
    'design-1-1-8-0442044204420442-s',
  ])('rejects a damaged or ambiguous drawing %s', (id) => {
    expect(readDesign(id)).toBeNull();
    expect(resolveMachine(M, id)).toBeNull();
  });
});
