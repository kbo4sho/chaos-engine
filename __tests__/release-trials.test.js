import M from 'matter-js';
import { expect, it } from 'vitest';
import {
  buildDesign,
  designFilm,
  designOffsets,
  proveDesign,
  readDesign,
  releaseTrials,
} from '../one-part-missing/blueprints.js';
import { fittings } from '../one-part-missing/machines.js';
import { pressRequest } from '../one-part-missing/workshop.js';

const mixed = 'design-2-e1-3-04420442-5o.40';
it('reports offsets and frames from the same physics as each of the fourteen films', () => {
  const d = readDesign(mixed),
    grid = releaseTrials(M, d);
  expect(grid.map((e) => e.offset)).toEqual(designOffsets);
  expect(grid.filter((e) => e.complete.state === 'miss').map((e) => e.offset)).toEqual([0]);
  const base = buildDesign(d).machine.ball.x;
  for (const row of grid)
    for (const view of ['complete', 'empty']) {
      const film = designFilm(M, d, view === 'complete', row.offset);
      expect([film.run.state, film.run.tick, film.run.hits]).toEqual([
        row[view].state,
        row[view].tick,
        row[view].hits,
      ]);
      const marble = film.run.items.findIndex((i) => i.shape.kind === 'marble');
      expect(film.tape[0].poses[marble][0]).toBe(base + row.offset);
    }
  expect(pressRequest(M, { releaseTrials: mixed })).toEqual(grid);
  expect(pressRequest(M, { releaseTrials: 'sample-invalid' })).toBeNull();
});
it.each([
  ['design-1-0-2-044204420442-8r.5d', 'empty', 'won'],
  ['design-2-dl-3-04420442-7n.3v', 'shorter', 'won'],
  [mixed, 'complete', 'miss'],
])('retains a reproducible physical counterexample for %s', (code, view, state) => {
  const d = readDesign(code),
    proof = proveDesign(M, d);
  expect(proof.machine).toBeUndefined();
  expect(proof.witness.view).toBe(view);
  const { offset, move } = proof.witness;
  if (view === 'shorter') {
    const layout = buildDesign(d);
    expect(fittings(layout.machine, move)).toHaveLength(1);
    expect(layout.machine.capacity).toBe(2);
  }
  expect(designFilm(M, d, view === 'complete', offset, move).run.state).toBe(state);
});
