import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { operatorBenchmarks } from '../scripts/lib/operator-benchmarks.mjs';
import {
  jobs,
  commands,
  blankCues,
  validCues,
  stepConsole,
  consoleTrial,
  operatorBoard,
  performanceBook,
  cueLink,
  readCueLink,
} from '../one-part-missing/control-room/console.js';
import { createRun } from '../one-part-missing/machines.js';

describe('Control room', () => {
  it('introduces single commands, then sequences and three-call dispatches', () => {
    expect(jobs).toHaveLength(30);
    expect(new Set(jobs.flatMap((j) => j.slots.map((s) => s.kind)))).toEqual(
      new Set(Object.keys(commands)),
    );
    expect(jobs.map((j) => j.slots.length)).toEqual([
      ...Array(12).fill(1),
      ...Array(12).fill(2),
      ...Array(6).fill(3),
    ]);
  });
  it.each(jobs.map((job, i) => [job.title, job, operatorBenchmarks[i]]))(
    'requires every operator on %s',
    (_, j, b) => {
      expect(j.id).toBe(b.id);
      const play = (c, o = 0) => consoleTrial(M, j, c, o);
      const win = play(b.cues);
      expect(win.state).toBe('won');
      expect(win.tick).toBe(b.tick);
      expect(win.hits).toHaveLength(j.goals.length);
      expect(play(blankCues(j)).state).toBe('miss');
      for (let i = 0; i < b.cues.length; i++) {
        expect(play(b.cues.map((t, k) => (k === i ? null : t))).state).toBe('miss');
        for (const delta of [-2, 2])
          expect(play(b.cues.map((t, k) => t + (k === i ? delta : 0))).state).toBe('won');
      }
      expect([-2, 2].every((o) => play(b.cues, o).state === 'won')).toBe(true);
      expect(
        [
          j.slots.map((s) => s.from),
          j.slots.map((s) => s.to),
          j.slots.map((s, k) => (k % 2 ? s.from : s.to)),
        ].some((s) => play(s).state === 'miss'),
      ).toBe(true);
      for (const kind of new Set(b.critical)) {
        const board = operatorBoard(j);
        board.fixtures = board.fixtures.map((s) => (s.kind === kind ? { ...s, disabled: true } : s));
        const r = createRun(M, board);
        while (r.state === 'running') stepConsole(M, r, j, b.cues);
        expect(r.state).toBe('miss');
      }
      for (const c of [b.cues, blankCues(j), b.cues.map((t, k) => (k ? null : t))]) {
        const v = readCueLink(cueLink(j, c));
        expect(v.job).toBe(j);
        expect(v.cues ?? blankCues(j)).toEqual(c);
      }
    },
  );
  it('records the signal on the same physics frame for live and scheduled operators', () => {
    const j = jobs.at(-1),
      b = operatorBenchmarks.at(-1),
      scheduled = createRun(M, operatorBoard(j)),
      live = createRun(M, operatorBoard(j));
    const calls = blankCues(j),
      events = [];
    while (scheduled.state === 'running') {
      const i = b.cues.indexOf(live.tick + 1);
      if (i >= 0) calls[i] = live.tick + 1;
      stepConsole(M, live, j, calls, (e) => events.push(e));
      stepConsole(M, scheduled, j, b.cues);
      expect(live.cargo.position).toEqual(scheduled.cargo.position);
    }
    expect(events.map((e) => e.tick)).toEqual(b.cues);
    expect(events.every((e) => e.before.some((v, i) => v !== e.after[i]))).toBe(true);
    expect(live.state).toBe('won');
  });
  it('rejects out-of-window data, noncanonical links and extra calls', () => {
    const j = jobs[0];
    for (const s of ['~_', '~01', '~0', '~zzz', '~24._', '~1!.', '~~', '#extra'])
      expect(readCueLink('#' + j.id + s)).toBeNull();
    expect(validCues(j, [j.slots[0].from - 1])).toBe(false);
  });
  it('keeps the fastest valid record, including when storage is unavailable', () => {
    const j = jobs[0],
      c = operatorBenchmarks[0].cues;
    const data = new Map(),
      s = {
        get length() {
          return data.size;
        },
        key: (i) => [...data.keys()][i],
        getItem: (k) => data.get(k),
        setItem: (k, v) => data.set(k, v),
        removeItem: (k) => data.delete(k),
      };
    for (const storage of [
      () => s,
      () => {
        throw Error('unavailable');
      },
    ]) {
      const b = performanceBook(storage);
      b.save(j, c, 90);
      b.save(j, c, 83);
      b.save(j, c, 87);
      b.save(j, [null], 1);
      expect(b.best(j).tick).toBe(83);
      expect(b.completed()).toEqual(new Set([j.id]));
    }
    expect(performanceBook(() => s).best(j).tick).toBe(83);
  });
});
