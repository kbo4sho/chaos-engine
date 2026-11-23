import { describe, it, expect } from 'vitest';
import M from 'matter-js';
import { driveCourse } from '../one-part-missing/drive-course.js';
import { transmissions, receiverOpen, acceptsReceiver } from '../one-part-missing/transmissions.js';
import { instruments } from '../one-part-missing/devices.js';
import { advance, createRun, trial } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { experiment } from '../one-part-missing/tool-lab.js';
describe('Power transmission and receiving windows', () => {
  it('uses and needs every installed coupling and field before delivery', () => {
    expect(driveCourse).toHaveLength(40);
    const seen = new Set();
    for (const [i, m] of driveCourse.entries()) {
      const fit = certify(M, m)[0],
        r = createRun(M, m, fit);
      while (r.state === 'running') {
        advance(M, r);
        const g = r.cargo.plugin.benchArm,
          slide = r.cargo.plugin.benchGuide;
        if (g) {
          expect(
            Math.abs(Math.hypot(r.cargo.position.x - g.cx, r.cargo.position.y - g.cy) - g.radius),
          ).toBeLessThan(0.001);
          expect(Math.abs(r.cargo.angularVelocity)).toBeLessThan(0.7);
        }
        if (slide) expect(Math.abs(r.cargo.position.y - slide.y)).toBeLessThan(0.001);
      }
      expect(r.state, m.id).toBe('won');
      expect(r.tick, m.id).toBeGreaterThanOrEqual(i < 10 ? 32 : 24);
      for (const [n, it] of r.items.entries()) {
        if (!it.shape.drive && !instruments[it.shape.kind]) continue;
        expect(
          r.uses.some((u) => u.item === n && u.tick <= r.hits.at(-1)),
          m.id + ' ' + it.shape.kind,
        ).toBe(true);
        seen.add(it.shape.kind);
      }
      for (const f of m.fixtures.filter((s) => s.drive || instruments[s.kind])) {
        expect(
          trial(
            M,
            { ...m, fixtures: m.fixtures.map((s) => (s === f ? { ...s, disabled: true } : s)) },
            fit,
          ).state,
          m.id + ' ' + f.kind,
        ).toBe('miss');
      }
      for (const scale of [0.99, 1.01])
        expect(trial(M, { ...m, ball: { ...m.ball, spin: m.ball.spin * scale } }, fit).state, m.id).toBe(
          'won',
        );
    }
    expect([...seen]).toEqual(expect.arrayContaining(Object.keys(transmissions)));
  }, 30000);
  it.each(Object.keys(transmissions))(
    '%s changes actual load travel in the lab at three drive speeds',
    (kind) => {
      for (const offset of [-24, 0, 24]) {
        const { powered: a, reference: b } = experiment(M, kind, offset);
        expect(a.run.uses.some((u) => u.kind === kind)).toBe(true);
        expect(b.run.uses.some((u) => u.kind === kind)).toBe(false);
        expect(
          a.path.some(([x, y], i) => b.path[i] && Math.hypot(x - b.path[i][0], y - b.path[i][1]) > 12),
        ).toBe(true);
      }
    },
  );
  it('opens periodically and accepts only an entry in the indicated direction', () => {
    const s = { window: { start: 10, duration: 5, period: 20 }, travel: -1 },
      body = { velocity: { x: -1 } };
    expect([9, 10, 14, 15, 30].map((t) => receiverOpen(s, t))).toEqual([false, true, true, false, true]);
    expect(acceptsReceiver(s, body, 12)).toBe(true);
    expect(acceptsReceiver(s, { velocity: { x: 1 } }, 12)).toBe(false);
    expect(acceptsReceiver({ ...s, travel: 0, turn: 1 }, { angularVelocity: -0.02 }, 12)).toBe(false);
    const m = driveCourse[22],
      r = createRun(M, m, certify(M, m)[0]);
    while (r.state === 'running') advance(M, r);
    expect(r.passes[0].reason).toBe('Receiver closed');
    expect(r.passes.at(-1).reason).toBe('Receiver accepted');
    expect(r.passes.every((p) => p.accepted === receiverOpen(m.goals[0], p.tick))).toBe(true);
  });
});
