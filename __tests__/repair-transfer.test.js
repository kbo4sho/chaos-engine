import { expect, it } from 'vitest';
import M from 'matter-js';
import { repairBook } from '../one-part-missing/repairs.js';
import { benchDrafts } from '../one-part-missing/bench-drafts.js';
import { toolEvidence } from '../one-part-missing/tool-evidence.js';
import { campaign, campaignById } from '../one-part-missing/campaign.js';
import { orderLog, orderById, orders } from '../one-part-missing/work-orders.js';
import { qualificationCourse } from '../one-part-missing/qualification-course.js';
import {
  inspectNotebook,
  mergeNotebook,
  notebookFile,
  readNotebook,
  maxNotebookBytes,
} from '../one-part-missing/repair-notebook-file.js';

function device() {
  const entries = new Map();
  const storage = () => ({
    get length() {
      return entries.size;
    },
    key: (i) => [...entries.keys()][i],
    getItem: (k) => entries.get(k) ?? null,
    setItem: (k, v) => entries.set(k, v),
    removeItem: (k) => entries.delete(k),
  });
  const source = (id) => campaignById.get(id) || orderById.get(id);
  return {
    M,
    orders,
    orderById,
    source,
    known: (id) => Boolean(source(id)),
    printed: () => false,
    lesson: () => true,
    book: repairBook(storage),
    drafts: benchDrafts(storage),
    evidence: toolEvidence(storage),
    orderBook: orderLog(storage),
    signal: new AbortController().signal,
  };
}
const empty = () => notebookFile(device());
const first = campaign[0];
it('rejects unsupported versions, excess rows and files too large to preview', () => {
  expect(() => readNotebook(' '.repeat(maxNotebookBytes + 1))).toThrow();
  for (const update of [
    { version: 2 },
    { format: 'sample-ball' },
    { drafts: new Array(601).fill(null) },
    { contacts: null },
  ])
    expect(() => readNotebook(JSON.stringify({ ...empty(), ...update }))).toThrow();
});
it('validates each record against real physics and preserves the measured delivery time on repeat imports', async () => {
  const src = device(),
    dest = device();
  src.book.save(first.id, { part: 'bridge', socket: 0 }, 999);
  const file = notebookFile(src);
  file.repairs.push(
    { id: first.id, fit: '0.weight' },
    { id: 'sample-unknown', fit: '0.bridge' },
    { id: first.id, fit: '0.bridge~' },
  );
  const inspected = await inspectNotebook(file, dest);
  expect(inspected.skipped).toBe(3);
  expect(inspected.repairs).toHaveLength(1);
  const tick = inspected.repairs[0].tick;
  expect(tick).toBeLessThan(999);
  expect(mergeNotebook(inspected, dest)).toMatchObject({ repairs: 1, kept: 0 });
  expect(dest.book.read()[first.id].tick).toBe(tick);
  expect(mergeNotebook(inspected, dest)).toMatchObject({ repairs: 0, kept: 1, contacts: 0 });
});
it('restores a specific first-contact fitting and rejects invented tool marks', async () => {
  const dest = device(),
    m = qualificationCourse[0];
  const file = {
    ...empty(),
    contacts: [{ id: m.id, fit: '0.cam,1.fan', marks: ['fan.combined', 'bridge.seen'] }],
  };
  const result = await inspectNotebook(file, dest);
  expect(result.contacts[0].events.map((e) => e.kind + '.' + e.grade)).toEqual(['fan.combined']);
  mergeNotebook(result, dest);
  expect(dest.evidence.get('fan', 'combined').partner).toBe('cam');
  expect(dest.evidence.get('bridge', 'seen')).toBeNull();
  expect(Object.keys(dest.book.read())).toHaveLength(0);
});
it('keeps a borrowed fitting replayable without writing personal marks', async () => {
  const src = device(),
    dest = device();
  src.book.save(first.id, { part: 'bridge', socket: 0 }, 30, false);
  const data = notebookFile(src);
  const verified = await inspectNotebook(data, dest);
  expect(mergeNotebook(verified, dest).contacts).toBe(0);
  expect(dest.book.read()[first.id].evidenceEligible).toBe(false);
});
it('preserves orientation and undo when a partially fitted machine moves to another device', async () => {
  const src = device(),
    dest = device();
  const m = campaign.find((m) => m.reversible && m.tray.includes('bridge'));
  const normal = { part: 'bridge', socket: 0 },
    flipped = { ...normal, flipped: true };
  src.drafts.save(m, flipped, [null, normal], true, false);
  const checked = await inspectNotebook(notebookFile(src), dest);
  expect(mergeNotebook(checked, dest).unfinished).toBe(1);
  expect(dest.drafts.read(m)).toMatchObject({ move: flipped, history: [null, normal] });
  dest.drafts.save(m, normal, [null], true, false);
  expect(mergeNotebook(checked, dest).kept).toBe(1);
  expect(dest.drafts.read(m).move).toEqual(normal);
});
it('cancels a long review without leaving any partially merged repairs', async () => {
  const dest = device(),
    controller = new AbortController();
  const file = { ...empty(), repairs: [{ id: first.id, fit: '0.bridge' }] };
  await expect(
    inspectNotebook(file, { ...dest, signal: controller.signal, progress: () => controller.abort() }),
  ).rejects.toThrow();
  expect(dest.book.read()).toEqual({});
});
