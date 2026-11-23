import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { fieldChapters, fieldCourse } from '../one-part-missing/field-course.js';
import { fieldPair, phaseFrames } from '../one-part-missing/fields.js';
import { createRun, trial, advance, parts } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { snapshot, atFrame } from '../one-part-missing/drawing.js';
describe('Field stations', () => {
  it.each(fieldCourse.map((m, i) => [m.title, m, i]))(
    '%s needs its equipment and electric partner',
    (_, m, i) => {
      const fit = certify(M, m);
      expect(fit).toHaveLength(1);
      for (const o of [-3, -1, 1, 3]) expect(trial(M, m, fit[0], o).state).toBe('won');
      for (const f of m.fixtures.filter((s) => parts[s.kind] || s.kind === 'electrode')) {
        const reduced = {
          ...m,
          fixtures: m.fixtures.flatMap((s) =>
            s !== f ? [s] : s.kind === 'electrode' ? [] : [{ ...s, disabled: true }],
          ),
        };
        expect(trial(M, reduced, fit[0]).state).toBe('miss');
      }
      if (i >= 20 && i < 30) {
        const free = {
          ...m,
          fixtures: m.fixtures.map((f) => (f.kind === 'cargo' ? { ...f, sign: 0 } : f)),
        };
        expect(trial(M, free, fit[0]).state).toBe('miss');
      }
    },
  );
  it('applies one equal-and-opposite force to two moving poles', () => {
    const m = fieldCourse[20],
      trial = {
        ...m,
        ball: { kind: 'marble', x: 210, y: 150, r: 9, sign: 1 },
        fixtures: [
          { kind: 'cargo', x: 275, y: 150, r: 15, sign: -1 },
          { ...parts.positive.shape, x: 600, y: 40 },
        ],
      };
    const r = createRun(M, trial);
    r.engine.gravity.y = 0;
    advance(M, r);
    expect(r.ball.velocity.x).toBeGreaterThan(0);
    expect(r.cargo.velocity.x).toBeLessThan(0);
    expect(r.ball.velocity.x * r.ball.mass + r.cargo.velocity.x * r.cargo.mass).toBeCloseTo(0, 9);
    expect(fieldPair({ x: 0, y: 0, sign: -1 }, { x: 65, y: 0, sign: -1 }).x).toBeLessThan(0);
    expect(fieldPair({ x: 0, y: 0, sign: 1 }, { x: 240, y: 0, sign: -1 })).toBeNull();
  });
  it('temporarily drops the original collision filter and records the countdown', () => {
    const m = fieldCourse[4],
      fit = certify(M, m)[0],
      r = createRun(M, m, fit);
    const mask = r.ball.collisionFilter.mask;
    let began = 0,
      ended = 0;
    for (let i = 0; i < 110; i++) {
      r.tick++;
      M.Engine.update(r.engine, 1000 / 60);
      const v = r.ball.render.phaseFrames || 0;
      if (v && !began) {
        began = r.tick;
        expect(v).toBe(phaseFrames);
        expect(r.ball.collisionFilter.mask).toBe(0);
        const f = snapshot(r);
        expect(atFrame(r, f).ball.render.phaseFrames).toBe(phaseFrames);
      }
      if (began && !v) {
        ended = r.tick;
        break;
      }
    }
    expect(ended - began).toBe(phaseFrames);
    expect(r.ball.collisionFilter.mask).toBe(mask);
  });
  it('records a real return to neutral after the grounding brush', () => {
    const m = fieldCourse.at(-1),
      r = createRun(M, m, certify(M, m)[0]),
      history = [];
    while (r.state === 'running') {
      advance(M, r);
      const item = r.items.findIndex((it) => it.body === r.cargo);
      const pose = snapshot(r).poses[item];
      history.push([r.tick, pose[4] || 0, pose[5] || 0]);
    }
    const charge = r.uses.find((e) => e.kind === 'positive').tick,
      ground = r.uses.find((e) => e.kind === 'ground').tick,
      phase = r.uses.find((e) => e.kind === 'phase').tick;
    expect(history[charge - 1][1]).toBe(1);
    expect(history[ground - 1][1]).toBe(0);
    expect(history[phase - 1][2]).toBe(21);
    expect(phase).toBeGreaterThan(ground);
    expect(r.hits.length).toBe(2);
  });
});
