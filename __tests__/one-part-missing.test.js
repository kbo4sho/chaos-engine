import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import { JSDOM } from 'jsdom';
import { repairBook, repairPrefix } from '../one-part-missing/repairs.js';
import {
  machines,
  createRun,
  advance,
  trial,
  assembly,
  validMove,
} from '../one-part-missing/machines.js';
import {
  certify,
  generate,
  resolveMachine,
  decodePrint,
  proveTarget,
  tuneTarget,
} from '../one-part-missing/workshop.js';

describe('One Part Missing', () => {
  it.each(machines.map((m) => [m.id, m]))(
    '%s misses without a part and accepts a physical repair across release offsets',
    (_, m) => {
      const solutions = certify(Matter, m);
      expect(solutions?.length).toBeGreaterThan(0);
      expect(solutions.length).toBeLessThan(m.tray.length * m.sockets.length);
      expect(trial(Matter, m, null).state).toBe('miss');
      for (const move of solutions) expect(trial(Matter, m, move).hits).toHaveLength(m.goals.length);
    },
  );
  it('credits the alternate rubber-drum solution on the return track', () => {
    expect(certify(Matter, machines[1]).map((r) => r.part)).toEqual(
      expect.arrayContaining(['bumper', 'chute']),
    );
  });
  it('moves the lever and plays the same contact times on replay', () => {
    const m = machines[0],
      move = { part: 'bridge', socket: 0 },
      r = createRun(Matter, m, move);
    const lever = r.items.find((i) => i.shape.pivot),
      start = lever.body.angle;
    let rotation = 0;
    while (r.state === 'running') {
      advance(Matter, r);
      rotation = Math.max(rotation, Math.abs(lever.body.angle - start));
    }
    expect(rotation).toBeGreaterThan(0.1);
    expect(trial(Matter, m, move)).toEqual({ state: 'won', tick: r.tick, hits: r.hits });
  });
  it('requires all notes in order, a single early note cannot finish the waltz', () => {
    const m = machines[5];
    expect(trial(Matter, m, null).hits).toHaveLength(1);
    const repaired = trial(Matter, m, { part: 'bridge', socket: 1 });
    expect(repaired.hits).toHaveLength(3);
    expect(repaired.hits).toEqual([...repaired.hits].sort((a, b) => a - b));
  });
  it('validates imported repairs and seed links without touching the machines', () => {
    const m = machines[0],
      count = assembly(m).length;
    for (const move of [
      { part: 'constructor', socket: 0 },
      { part: 'bridge', socket: 4 },
      { part: 'bridge', socket: '0' },
      null,
    ]) {
      expect(validMove(m, move)).toBe(false);
      expect(assembly(m, move)).toHaveLength(count);
    }
    for (const id of [
      'press-1-4294967296',
      'press-1--2',
      'press-1-1e3',
      'press-1-01',
      'press-1-4294967296~1.1',
      'last-bell~-0.0',
      'last-bell~10.0',
      'unknown',
    ])
      expect(resolveMachine(Matter, id)).toBeNull();
  });
  it('shares a re-certified edited target without changing the original blueprint', () => {
    const original = machines[0],
      before = structuredClone(original);
    const good = tuneTarget(original, -1, 0),
      bad = tuneTarget(original, 8, -8);
    expect(decodePrint(good.id)).toEqual({ base: original.id, x: -1, y: 0 });
    expect(proveTarget(Matter, bad).reason).toContain('No fitting');
    expect(resolveMachine(Matter, bad.id)).toBeNull();
    expect(resolveMachine(Matter, good.id)).toEqual(proveTarget(Matter, good).machine);
    expect(original).toEqual(before);
  });
  it('keeps concurrent repairs, survives a corrupt record, and preserves private-session replays', () => {
    const dom = new JSDOM('', { url: 'https://example.test' });
    try {
      const storage = dom.window.localStorage;
      const first = repairBook(() => storage),
        second = repairBook(() => storage);
      first.save('last-bell', { part: 'bridge', socket: 0 }, 279);
      second.save('switchback', { part: 'bumper', socket: 1 }, 359);
      storage.setItem(repairPrefix + 'old-demo', 'bad json');
      expect(Object.keys(first.read()).sort()).toEqual(['last-bell', 'switchback']);
      expect(second.read()['last-bell'].part).toBe('bridge');
      const privateBook = repairBook(() => {
        throw new Error('Storage disabled');
      });
      privateBook.save('last-bell', { part: 'bridge', socket: 0 }, 279);
      expect(privateBook.read()['last-bell'].tick).toBe(279);
    } finally {
      dom.window.close();
    }
  });
  it('regenerates distinct, reproducible workshop layouts with certified repairs', () => {
    const layouts = new Set();
    for (const seed of [0, 1, 77, 323, 13247, 987654321, 4294967295]) {
      const m = generate(Matter, seed);
      expect(resolveMachine(Matter, m.id)).toEqual(m);
      expect(certify(Matter, m)?.length).toBeGreaterThan(0);
      layouts.add(JSON.stringify([m.ball, m.fixtures, m.sockets, m.goals]));
    }
    expect(layouts.size).toBe(7);
  });
});

it('reopens a classic share as the same drawing after other prints are made', () => {
  const id = 'press-3-4067402332';
  const first = resolveMachine(Matter, id);
  expect(first.verifiedRepairs).toBeGreaterThan(0);
  resolveMachine(Matter, 'press-3-381');
  expect(resolveMachine(Matter, id)).toEqual(first);
});
