import { expect, it } from 'vitest';
import { benchDrafts, draftPrefix } from '../one-part-missing/bench-drafts.js';
import { editHistory } from '../one-part-missing/bench-edits.js';

function memory() {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i],
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}
const machine = {
  id: 'sample-lesson',
  title: 'Sample lesson',
  capacity: 3,
  tray: ['bridge', 'domino', 'weight'],
  sockets: [{}, {}, {}],
};
const a = { part: 'bridge', socket: 0 },
  b = { part: 'domino', socket: 1 };
it('restores incomplete assemblies with a bounded, valid undo sequence', () => {
  const storage = memory(),
    desk = benchDrafts(() => storage);
  desk.save(
    machine,
    { ...a, second: b },
    [...Array(48).fill(null), a, { part: 'unknown', socket: 0 }],
    false,
    false,
  );
  const saved = benchDrafts(() => storage).read(machine);
  expect(saved.move).toEqual({ ...a, second: b });
  expect(saved.history.at(-1)).toEqual(a);
  expect(saved.history.length).toBe(31);
  const edits = editHistory();
  edits.restore(saved.history);
  expect(edits.undo()).toEqual(a);
  expect(edits.undo()).toBeNull();
});
it('clears only the revision completed in this tab', () => {
  const storage = memory(),
    left = benchDrafts(() => storage),
    right = benchDrafts(() => storage);
  const old = left.save(machine, a, [null], true, false);
  const newer = right.save(machine, b, [null], true, false);
  left.clear(machine.id, old);
  expect(left.read(machine).move).toEqual(b);
  right.clear(machine.id, newer);
  expect(left.list()).toEqual([]);
});
it('retains all numbered drafts while keeping up to 24 printed drafts', () => {
  const storage = memory(),
    desk = benchDrafts(() => storage);
  const saved = desk.save(machine, a, [], false, false);
  for (let n = 0; n < 31; n++) desk.save({ ...machine, id: 'sample-press-' + n }, a, [], false, true);
  expect(desk.list().filter((row) => row.printed)).toHaveLength(24);
  expect(desk.read(machine).revision).toBe(saved);
  expect(desk.read({ ...machine, id: 'sample-press-30' }).move).toEqual(a);
});
it('ignores obsolete spares, broken records and works with blocked storage', () => {
  const storage = memory();
  storage.setItem(draftPrefix + machine.id, '{broken');
  const desk = benchDrafts(() => storage);
  expect(desk.read(machine)).toBeNull();
  expect(desk.list()).toEqual([]);
  desk.save(machine, b, [], false, false);
  expect(desk.read({ ...machine, tray: ['bridge'] })).toBeNull();
  const blocked = benchDrafts(() => {
    throw Error('Blocked');
  });
  const v = blocked.save(machine, a, [null], true, false);
  expect(blocked.read(machine).move).toEqual(a);
  blocked.clear(machine.id, v);
  expect(blocked.list()).toEqual([]);
});
