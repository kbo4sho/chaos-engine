import { describe, expect, it } from 'vitest';
import M from 'matter-js';
import { parts } from '../one-part-missing/machines.js';
import { exercises, prediction, predictionBook } from '../one-part-missing/predictions.js';
import { firstCross } from '../one-part-missing/prediction-measures.js';

describe('Physical predictions', () => {
  it('has an effect and an input experiment for every available part', () => {
    expect(exercises.map((e) => e.kind).sort()).toEqual(
      Object.keys(parts)
        .flatMap((k) => [k, k])
        .sort(),
    );
  });
  it.each(Object.keys(parts))('observes %s on the real position trace', (kind) => {
    const effect = prediction(M, kind, 'effect'),
      { a, b, end, axis } = effect;
    const d = a.path[end][axis] - b.path[end][axis];
    expect(effect.correct).toBe(d > 12 ? 2 : d < -12 ? 0 : 1);
    for (const sample of [a, b]) {
      const item =
        sample.run.items.find((i) => i.shape.track || (effect.delivery && i.shape.kind === 'cargo')) ||
        sample.run.items.find((i) => i.body === sample.run.ball);
      expect(sample.path[end][axis]).toBeCloseTo(
        sample.tape[end].poses[sample.run.items.indexOf(item)][axis],
        3,
      );
    }
    const input = prediction(M, kind, 'input');
    expect(input.labels[0]).not.toBe(input.labels[1]);
    const times = [input.a, input.b].map((run) =>
      firstCross(run.path, input.axis, input.line, input.dir),
    );
    expect(input.times).toEqual(times);
    expect(input.correct).toBe(
      times.every((t) => t === null)
        ? 3
        : times[0] === null
          ? 2
          : times[1] === null
            ? 0
            : Math.abs(times[0] - times[1]) <= 1
              ? 1
              : times[0] < times[1]
                ? 0
                : 2,
    );
  });
  it('a portal jump cannot trip a timing line between its mouths', () => {
    const path = [
      [10, 30],
      [90, 40, true],
      [110, 45],
      [35, 45],
      [64, 45],
    ];
    expect(firstCross(path, 0, 60, 1)).toBe(4);
    expect(firstCross(path, 0, 60, -1)).toBe(3);
    expect(firstCross(path, 0, 89, 1)).toBe(null);
  });
  it('keeps mastery after retries and combines tab progress without double-counting', () => {
    const data = new Map(),
      storage = () => ({ getItem: (k) => data.get(k), setItem: (k, v) => data.set(k, v) });
    const a = predictionBook(storage),
      b = predictionBook(storage);
    a.mark('fan', 'input', false);
    expect(b.counts()).toEqual({ correct: 0, tried: 1 });
    b.mark('fan', 'input', true);
    a.mark('fan', 'input', false);
    a.mark('magnet', 'effect', true);
    expect(b.counts()).toEqual({ correct: 2, tried: 2 });
    expect(a.next('fan', 'effect')).not.toEqual({ kind: 'fan', mode: 'input' });
  });
  it('works with storage unavailable', () => {
    const b = predictionBook(() => {
      throw Error('storage unavailable');
    });
    b.mark('sieve', 'effect', true);
    b.mark('sieve', 'effect', true);
    expect(b.counts()).toEqual({ correct: 1, tried: 1 });
  });
});
