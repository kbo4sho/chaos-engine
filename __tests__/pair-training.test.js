import { expect, it } from 'vitest';
import M from 'matter-js';
import { parts, createRun, advance } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { pairFinals } from '../one-part-missing/pair-training-index.js';
import {
  partnersFor,
  pairCourse,
  trainingRoute,
  readTraining,
  trainingFileRoute,
  contactReceipt,
  arrivalOrder,
  trainingBook,
} from '../one-part-missing/pair-training.js';

it('builds three distinct physical lessons in either order for all 54 tools and 141 pairings', () => {
  expect(Object.keys(pairFinals)).toHaveLength(141);
  for (const a of Object.keys(parts)) {
    const choices = partnersFor(a);
    expect(choices.length).toBeGreaterThan(0);
    for (const b of choices) {
      expect(partnersFor(b)).toContain(a);
      const variants = pairCourse(a, b).variants;
      for (let v = 0; v < variants; v++) {
        const c = pairCourse(a, b, v);
        expect(new Set(c.steps.map((s) => s.n)).size).toBe(3);
        expect(c.steps.map((s) => s.targets)).toEqual([[a], [b], [a, b]]);
        for (let i = 0; i < 3; i++) expect(readTraining(trainingRoute(c, i))?.step.n).toBe(c.steps[i].n);
      }
    }
  }
});
it('replays every offered machine and checks the required contacts on every certified solution', () => {
  const events = new Map();
  for (const name of Object.keys(pairFinals)) {
    const [a, b] = name.split('+');
    for (let variant = 0; variant < pairFinals[name].length; variant++) {
      for (const step of pairCourse(a, b, variant).steps) {
        const m = step.machine;
        if (!events.has(m.id))
          events.set(
            m.id,
            certify(M, m).map((move) => {
              const run = createRun(M, m, move);
              while (run.state === 'running') advance(M, run);
              return { run, move };
            }),
          );
        const runs = events.get(m.id);
        expect(runs.length).toBeGreaterThan(0);
        for (const { run, move } of runs)
          expect(contactReceipt(step, move, run)?.map((e) => e.kind)).toEqual(step.targets);
      }
    }
  }
}, 180000);
it('offers a fixed hatch observation before the player fits a working hatch in the combined machine', () => {
  const c = pairCourse('hatch', 'trampoline');
  expect(c.steps[0].grade).toBe('seen');
  expect(c.steps[2].grade).toBe('fitted');
});
it('an offline course opens its own alternate finals and rejects requests for another pack', () => {
  const c = pairCourse('conveyor', 'trampoline'),
    start = trainingRoute(c);
  expect(c.variants).toBeGreaterThan(1);
  expect(trainingFileRoute(start, trainingRoute(c, 2, 1))).toBe(trainingRoute(c, 2, 1));
  expect(trainingFileRoute(start, 'tool-pair/1/hatch/trampoline/3')).toBe(start);
  for (const bad of [
    'tool-pair/1/conveyor/trampoline/0',
    'tool-pair/1/conveyor/trampoline/3/1',
    'tool-pair/1/__proto__/fan/1',
    'tool-pair/1/fan/fan/1',
  ])
    expect(readTraining(bad)).toBeNull();
});
it('compares the fixed physics clock, including simultaneous first contacts', () => {
  const c = pairCourse('fan', 'cam'),
    r = [
      { kind: 'fan', tick: 22, actor: 'marble' },
      { kind: 'cam', tick: 22, actor: 'rig' },
    ];
  expect(arrivalOrder(r)).toBe('same');
  r[1].tick = 1;
  expect(arrivalOrder(r)).toBe('cam');
  const log = trainingBook(() => {
    throw Error('storage unavailable');
  });
  log.save(c, 2, r, 'cam');
  log.save(c, 2, r, 'fan');
  expect(log.get(c, 2)).toMatchObject({ called: true, contacts: r });
  expect(log.get(c, 1)).toBeNull();
});
