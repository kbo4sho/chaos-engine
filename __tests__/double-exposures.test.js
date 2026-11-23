import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { rigs, doubleRun } from '../one-part-missing/discovery/double-rigs.js';
import { doubleRecords } from '../one-part-missing/discovery/double-records.js';
describe('paired shutter assignments', () => {
  it.each(rigs.map((r) => [r.id, r]))('%s requires both controls to pass on the same run', (_, rig) => {
    const accepted = [],
      partial = [];
    for (const [a] of rig.controls[0].values.entries())
      for (const [b] of rig.controls[1].values.entries()) {
        const settings = [a, b],
          tape = doubleRun(M, rig, settings);
        if (tape.count === 2) {
          accepted.push(settings);
          expect(rig.tools.every((k) => tape.run.uses.some((u) => u.kind === k))).toBe(true);
        }
        if (tape.count === 1) partial.push(settings);
      }
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).not.toEqual([0, 0]);
    expect(partial.length).toBeGreaterThan(0);
    for (const off of [-2, -1, 0, 1, 2]) expect(doubleRun(M, rig, accepted[0], off).count).toBe(2);
  });
  it('keeps the best simultaneous shutters with storage unavailable', () => {
    const b = doubleRecords(() => {
        throw Error('denied');
      }),
      rig = rigs[0];
    for (const s of [
      [0, 0],
      [2, 1],
    ])
      b.save(rig, s, doubleRun(M, rig, s));
    expect(b.best(rig)?.count).toBeLessThan(2);
    b.save(rig, [1, 1], doubleRun(M, rig, [1, 1]));
    expect(b.best(rig).settings).toEqual([1, 1]);
  });
});

import {
  capture,
  certifySheet,
  readSheet,
  readTake,
  sheetRoute,
  takeRoute,
} from '../one-part-missing/discovery/shutter-sheet.js';
describe('player-authored shutter marks', () => {
  const rig = rigs[0],
    fit = [1, 1],
    tape = doubleRun(M, rig, fit);
  const marks = rig.shots.map((s, i) => capture(tape, rig, i, s.tick));
  it('issues replayable targets with a genuinely losing starting fit', () => {
    const proof = certifySheet(M, rig, marks),
      custom = readSheet(proof.route).rig;
    expect(doubleRun(M, custom, proof.start).count).toBeLessThan(2);
    expect(doubleRun(M, custom, fit).count).toBe(2);
    expect(readTake(takeRoute(custom, fit))).toEqual({ route: proof.route, settings: fit });
    expect(readTake(proof.route + '/take/9.0').invalid).toBe(true);
  });
  it('rejects invalid bounds, reversed shutters and impossible spatial targets', () => {
    expect(readSheet(sheetRoute(rig, [marks[1], marks[0]]))).toBeNull();
    for (const changes of [{ tick: -1 }, { x: 721 }, { x: 0 }, { y: 391 }]) {
      expect(readSheet(sheetRoute(rig, [{ ...marks[0], ...changes }, marks[1]]))).toBeNull();
    }
    expect(certifySheet(M, rig, [{ ...marks[0], x: 35, y: 35 }, marks[1]]).route).toBeUndefined();
    const early = capture(tape, rig, 0, 0);
    expect(certifySheet(M, rig, [early, marks[1]]).route).toBeUndefined();
  });
  it('keeps an earned custom receipt separate from its official machine', () => {
    const book = doubleRecords(() => {
        throw Error('denied');
      }),
      custom = readSheet(sheetRoute(rig, marks)).rig;
    book.save(custom, fit, doubleRun(M, custom, fit));
    expect(book.best(rig)).toBeNull();
    expect(book.best(custom)?.count).toBe(2);
  });
});

it('finds two on-board moments in a charge exchange after an alternative load has left the frame', async () => {
  const { suggestShutters } = await import('../one-part-missing/discovery/shutter-sheet.js');
  const rig = rigs.find((r) => r.id === 'charge-exchange');
  expect(suggestShutters(M,rig,doubleRun(M,rig,[0,0]))).toBeNull();
  const tape = doubleRun(M, rig, [1, 1]),
    marks = suggestShutters(M, rig, tape);
  expect(marks).toHaveLength(2);
  expect(marks[0].tick).toBeLessThan(marks[1].tick);
  const proof = certifySheet(M, rig, marks);
  expect(proof.ways).toBe(1);
  expect(doubleRun(M, readSheet(proof.route).rig, [1, 1]).count).toBe(2);
});
