// Choose readable observation frames and checkpoint lines from real lab experiments.
// Store only the observation. The browser measures the answer from its own two runs.
import fs from 'node:fs';
import { firstCross } from '../one-part-missing/prediction-measures.js';
import M from 'matter-js';
import { parts } from '../one-part-missing/machines.js';
import { experiment } from '../one-part-missing/tool-lab.js';
const plans = {};
const visible = ([x, y]) => x > 12 && x < 708 && y > 10 && y < 382;
for (const kind of Object.keys(parts)) {
  const offset = kind === 'sieve' ? -24 : 0;
  const probe = experiment(M, kind, offset),
    a = probe.powered,
    b = probe.reference,
    max = Math.min(a.path.length, b.path.length) - 1;
  const contact = a.run.uses.find((u) => u.kind === kind)?.tick ?? 0;
  const candidates = [];
  for (let t = Math.max(8, contact + 2); t <= max; t++) {
    if (!visible(a.path[t]) || !visible(b.path[t])) continue;
    for (const axis of [0, 1]) {
      const d = a.path[t][axis] - b.path[t][axis];
      // A frame just past a conspicuous separation keeps the handoff in view.
      candidates.push({ axis, t, d, score: Math.min(66, Math.abs(d)) - 0.14 * (t - contact) });
    }
  }
  if (!candidates.length) throw Error('No shared observation for ' + kind);
  const preferredAxis = {
    conveyor: 0,
    fan: 1,
    piston: 0,
    trampoline: 1,
    syrup: 0,
    rack: 0,
    motor: 0,
    ratchet: 0,
    zipline: 0,
  }[kind];
  const ranked = candidates.sort((a, b) => b.score - a.score);
  let effect = ranked.find((s) => s.axis === preferredAxis && Math.abs(s.d) > 20) || ranked[0];
  if (['switch', 'tether'].includes(kind)) {
    const t = Math.max(1, contact - 3);
    effect = { axis: 1, t, d: a.path[t][1] - b.path[t][1] };
  }
  if (kind === 'sieve') {
    const t = Math.min(max, contact + 6);
    effect = { axis: 1, t, d: a.path[t][1] - b.path[t][1] };
  }
  const gates = [];
  for (const [hi, lo] of [
    [24, -24],
    [24, 0],
    [0, -24],
  ]) {
    const A = experiment(M, kind, hi).powered,
      B = experiment(M, kind, lo).powered;
    const ticks = [A, B].map((r) => r.run.uses.find((u) => u.kind === kind)?.tick ?? null);
    for (const axis of [0, 1])
      for (let line = axis ? 45 : 65; line < (axis ? 355 : 655); line += 10)
        for (const dir of [-1, 1]) {
          if ([A, B].some((r) => (r.path[0][axis] - line) * dir > -21)) continue;
          const times = [A, B].map((r) => firstCross(r.path, axis, line, dir));
          const reached = times.filter((t) => t != null);
          if (!reached.length || reached.some((t) => t < 12)) continue;
          if (!reached.some((t) => ticks.some((on) => on != null && t >= on + 3))) continue;
          if (times.some((t, i) => t != null && !visible([A, B][i].path[t]))) continue;
          const gap = times.some((t) => t === null) ? 30 : Math.abs(times[0] - times[1]);
          const score =
            Math.min(gap, 24) +
            (reached.length === 2 ? 12 : 0) -
            Math.min(...reached) * 0.065 +
            (axis === 1 ? 1 : 0);
          gates.push({
            axis,
            line,
            dir,
            score: score + (hi - lo === 48 ? 1 : 0) + (ticks.every((t) => t != null) ? 3 : 0),
            times,
            hi,
            lo,
          });
        }
  }
  let checkpoint = gates.sort((a, b) => b.score - a.score)[0];
  if (!checkpoint) {
    // A one-way stop can hold both drives. Use a reachable checkpoint from the disengaged reference.
    const hi = 24,
      lo = -24,
      runs = [experiment(M, kind, hi).powered, experiment(M, kind, lo).powered];
    for (const axis of [0, 1])
      for (let line = axis ? 45 : 65; line < (axis ? 355 : 655); line += 10)
        for (const dir of [-1, 1]) {
          if (checkpoint || runs.some((r) => (r.path[0][axis] - line) * dir > -25)) continue;
          const t = firstCross(b.path, axis, line, dir);
          if (
            t !== null &&
            visible(b.path[t]) &&
            runs.every((r) => firstCross(r.path, axis, line, dir) === null)
          )
            checkpoint = { axis, line, dir, hi, lo, times: [null, null] };
        }
  }
  if (!checkpoint) throw Error('No observable checkpoint for ' + kind);
  plans[kind] = [
    offset,
    effect.axis,
    effect.t,
    checkpoint.axis,
    checkpoint.line,
    checkpoint.dir,
    checkpoint.hi,
    checkpoint.lo,
  ];
  console.log(
    kind,
    'effect',
    effect.axis,
    effect.t,
    Math.round(effect.d),
    'gate',
    checkpoint.axis,
    checkpoint.line,
    checkpoint.times,
  );
}
fs.writeFileSync(
  new URL('../one-part-missing/prediction-plans.js', import.meta.url),
  '// Observation frame, axis and timing-line geometry. Measured answers are calculated during play.\nexport const predictionPlans={\n' +
    Object.entries(plans)
      .map(([k, v]) => '  ' + k + ':' + JSON.stringify(v) + ',\n')
      .join('') +
    '};\n',
);
