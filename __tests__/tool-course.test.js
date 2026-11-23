import { describe, expect, it } from 'vitest';
import Matter from 'matter-js';
import { devices } from '../one-part-missing/devices.js';
import { createRun, advance, trial } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/workshop.js';
import { toolCourse } from '../one-part-missing/tool-course.js';
import { experiment } from '../one-part-missing/tool-lab.js';

describe('Powered workshop course', () => {
  it('gives each new fitting a lesson and asks for longer chains in the final chapters', () => {
    const fitted = new Set();
    for (const [i, machine] of toolCourse.entries()) {
      const [move] = certify(Matter, machine);
      fitted.add(move.part);
      const r = createRun(Matter, machine, move);
      while (r.state === 'running') {
        advance(Matter, r);
        expect(r.ball.position.x).toBeGreaterThan(12);
        expect(r.ball.position.x).toBeLessThan(708);
        expect(r.ball.position.y).toBeGreaterThan(12);
        expect(r.ball.position.y).toBeLessThan(386);
      }
      const instruments = r.items.filter((item) => Object.hasOwn(devices, item.shape.kind));
      expect(new Set(r.uses.map((use) => use.item)).size, machine.id).toBe(instruments.length);
      if (i >= 40) expect(instruments.length, machine.id).toBeGreaterThanOrEqual(i >= 50 ? 4 : 3);
      // Turn off each fixed device in isolation. A working force must matter to the win.
      for (const fixture of machine.fixtures.filter((s) => Object.hasOwn(devices, s.kind))) {
        const isolated = {
          ...machine,
          fixtures: machine.fixtures.map((s) => (s === fixture ? { ...s, disabled: true } : s)),
        };
        expect(trial(Matter, isolated, move).state, machine.id + ' ' + fixture.kind).toBe('miss');
      }
    }
    expect([...fitted].sort()).toEqual(Object.keys(devices).sort());
  });
  it.each(Object.keys(devices))('%s has an observable power-on versus power-off experiment', (kind) => {
    for (const offset of [-24, 0, 24]) {
      const { powered, reference } = experiment(Matter, kind, offset);
      expect(reference.path[0]).toEqual(powered.path[0]);
      expect(reference.run.uses).toHaveLength(0);
      expect(powered.run.uses[0]?.kind).toBe(kind);
      const diverged = powered.path.some(
        ([x, y], i) =>
          reference.path[i] && Math.hypot(x - reference.path[i][0], y - reference.path[i][1]) > 12,
      );
      expect(diverged).toBe(true);
    }
  });
});
