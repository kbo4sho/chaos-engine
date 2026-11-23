import { describe, expect, it } from 'vitest';
import M from 'matter-js';
import { rigCourse } from '../one-part-missing/rig-course.js';
import { links } from '../one-part-missing/rigging.js';
import { instruments } from '../one-part-missing/devices.js';
import { createRun, advance, trial } from '../one-part-missing/machines.js';
import { certify } from '../one-part-missing/certify.js';
import { atFrame } from '../one-part-missing/drawing.js';
import { experiment } from '../one-part-missing/tool-lab.js';
describe('Connected machines', () => {
  it('requires every installed rig and instrument before delivery, across all four chapters', () => {
    expect(rigCourse).toHaveLength(40);
    const used = new Set();
    for (const m of rigCourse) {
      const move = certify(M, m)[0],
        r = createRun(M, m, move);
      while (r.state === 'running') advance(M, r);
      const deadline = r.hits.at(-1);
      for (const [i, it] of r.items.entries()) {
        const s = it.shape;
        if (!s.wire && !instruments[s.kind]) continue;
        expect(
          r.uses.some(
            (u) =>
              u.item === i && u.tick <= deadline && (s.kind !== 'breaklink' || u.action === 'snapped'),
          ),
          m.id + ' ' + s.kind,
        ).toBe(true);
        used.add(s.kind);
      }
      for (const s of m.fixtures.filter((f) => f.wire || instruments[f.kind])) {
        const altered = {
          ...m,
          fixtures: m.fixtures.map((x) => (x === s ? { ...x, disabled: true } : x)),
        };
        expect(trial(M, altered, move).state, m.id + ' ' + s.kind).toBe('miss');
      }
      for (const offset of [-3, -1, 1, 3])
        expect(trial(M, m, move, offset).state, m.id + ' ' + offset).toBe('won');
    }
    expect([...used]).toEqual(expect.arrayContaining(Object.keys(links)));
  }, 20000);
  it.each(Object.keys(links))('%s changes the path in its controlled lab comparison', (kind) => {
    const { powered, reference } = experiment(M, kind);
    expect(powered.run.uses.some((u) => u.kind === kind)).toBe(true);
    expect(reference.run.uses).toHaveLength(0);
    expect(
      powered.path.some(
        ([x, y], i) =>
          reference.path[i] && Math.hypot(x - reference.path[i][0], y - reference.path[i][1]) > 18,
      ),
    ).toBe(true);
  });
  it('shows the intact and snapped seam on opposite sides of the break frame', () => {
    const {
      powered: { run, tape },
    } = experiment(M, 'breaklink');
    const e = run.uses.find((u) => u.action === 'snapped');
    expect(atFrame(run, tape[e.tick - 1]).items[e.item].body.render.cableBroken).toBe(false);
    expect(atFrame(run, tape[e.tick]).items[e.item].body.render.cableBroken).toBe(true);
    expect(M.Composite.allConstraints(run.engine.world).find((l) => l.rig).stiffness).toBe(0);
  });
  it('reels the line through time and keeps the initial span when inspecting an earlier frame', () => {
    const {
        powered: { run, tape },
      } = experiment(M, 'winch'),
      i = run.items.findIndex((x) => x.shape.wire);
    const span = (n) => atFrame(run, tape[n]).items[i].body.render.cableLength;
    expect(span(24)).toBeLessThan(span(12));
    expect(span(12)).toBeLessThan(span(0));
  });
});
