// The timing desk runs the same workbench and the same Matter bodies as a repair.
// Scheduled cues and live button presses enter on an identical simulation frame.
import { assembly, createRun, advance } from '../machines.js';
import { campaignById } from '../campaign.js';
import { controlScores } from '../control-scores.js';
export const commands = {
  brake: {
    name: 'Brake',
    rule: 'Stop the load’s travel and spin. Gravity still acts on the next frame.',
  },
  reverse: { name: 'Reverse', rule: 'Reverse the load’s travel and spin without moving its center.' },
  punch: {
    name: 'Punch upward',
    rule: 'Add an upward impulse to the load while preserving its sideways travel.',
  },
  right: {
    name: 'Curve right',
    rule: 'Turn the incoming velocity clockwise by a quarter-turn. Speed stays the same.',
  },
  left: {
    name: 'Curve left',
    rule: 'Turn the incoming velocity counterclockwise by a quarter-turn. Speed stays the same.',
  },
  bank: {
    name: 'Bank',
    rule: 'Reflect travel across the load’s facing axis. The angle of the body sets the outgoing path.',
  },
  relay: {
    name: 'Relay motion',
    rule: 'Exchange the gold and blue loads’ velocities and spin. Both bodies remain at their own positions.',
  },
  trim: {
    name: 'Trim spin',
    rule: 'Stop the load’s spin while keeping its travel. Any attached thruster keeps following its nose.',
  },
};
export const acts = ['First signals', 'Change the line', 'Two calls', 'Relay desk', 'Final dispatch'];
export const time = (t) => (t / 60).toFixed(2) + ' s';
export function operatorBoard(design) {
  const source = campaignById.get(design.source),
    fixtures = assembly(source, design.fit)
      .slice(0, -source.goals.length - 1)
      .map((s) => {
        const copy = { ...s };
        delete copy.fitted;
        return copy;
      });
  return {
    id: design.id,
    title: design.title,
    ball: source.ball,
    fixtures,
    goals: design.goals,
    sockets: [],
    tray: [],
    striker: design.actor,
  };
}
export const jobs = controlScores.map((s, i) => ({ ...s, act: Math.floor(i / 6), index: i }));
export const jobById = new Map(jobs.map((j) => [j.id, j]));
export function pulse(M, run, kind, actor) {
  const b = actor === 'cargo' ? run.cargo : run.ball;
  if (!b) return;
  const v = { ...b.velocity },
    w = b.angularVelocity,
    apply = (vx, vy) => M.Body.setVelocity(b, { x: vx, y: vy });
  if (kind === 'brake') {
    apply(0, 0);
    M.Body.setAngularVelocity(b, 0);
  } else if (kind === 'reverse') {
    apply(-v.x, -v.y);
    M.Body.setAngularVelocity(b, -w);
  } else if (kind === 'punch') apply(v.x, v.y - 7.4);
  else if (kind === 'right') apply(-v.y, v.x);
  else if (kind === 'left') apply(v.y, -v.x);
  else if (kind === 'bank') {
    const x = Math.cos(b.angle),
      y = Math.sin(b.angle),
      along = v.x * x + v.y * y;
    apply(2 * x * along - v.x, 2 * y * along - v.y);
  } else if (kind === 'trim') M.Body.setAngularVelocity(b, 0);
  else if (kind === 'relay') {
    const other = b === run.ball ? run.cargo : run.ball;
    if (!other) return;
    apply(other.velocity.x, other.velocity.y);
    M.Body.setAngularVelocity(b, other.angularVelocity);
    M.Body.setVelocity(other, v);
    M.Body.setAngularVelocity(other, w);
  }
}
export const blankCues = (job) => job.slots.map(() => null);
export function validCues(job, cues, partial = true) {
  return (
    Array.isArray(cues) &&
    cues.length === job.slots.length &&
    cues.every(
      (t, i) =>
        (t === null && partial) ||
        (Number.isInteger(t) && t >= job.slots[i].from && t <= job.slots[i].to),
    )
  );
}
export function stepConsole(M, run, job, cues, onCue) {
  const tick = run.tick + 1;
  for (const [i, t] of cues.entries())
    if (t === tick) {
      const s = job.slots[i],
        actor = s.actor || job.actor,
        b = actor === 'cargo' ? run.cargo : run.ball;
      const before = onCue ? [b.velocity.x, b.velocity.y, b.angularVelocity] : null;
      pulse(M, run, s.kind, actor);
      if (onCue)
        onCue({
          index: i,
          tick,
          kind: s.kind,
          actor,
          x: b.position.x,
          y: b.position.y,
          before,
          after: [b.velocity.x, b.velocity.y, b.angularVelocity],
        });
    }
  advance(M, run);
}
export function consoleTrial(M, job, cues, offset = 0) {
  const r = createRun(M, operatorBoard(job), null, offset);
  while (r.state === 'running') stepConsole(M, r, job, cues);
  return { state: r.state, tick: r.tick, hits: r.hits, uses: r.uses };
}
export function cueLink(job, cues) {
  if (!validCues(job, cues)) throw Error('Invalid cue sheet');
  return (
    '#' +
    job.id +
    (cues.some((t) => t !== null)
      ? '~' + cues.map((t) => (t === null ? '_' : t.toString(36))).join('.')
      : '')
  );
}
export function readCueLink(hash) {
  if (typeof hash !== 'string' || hash.length > 100) return null;
  const [id, encoded, ...extra] = hash.replace(/^#/, '').split('~'),
    job = jobById.get(id);
  if (!job || extra.length) return null;
  if (encoded === undefined) return { job, cues: null };
  const cues = encoded
    .split('.')
    .map((s) => (s === '_' ? null : /^[0-9a-z]{1,2}$/.test(s) ? parseInt(s, 36) : NaN));
  return validCues(job, cues) && cueLink(job, cues) === '#' + id + '~' + encoded ? { job, cues } : null;
}
export const recordPrefix = 'chaos.one-part-missing.operator.v1.';
export function performanceBook(storage) {
  const memory = new Map();
  function read(job) {
    const best = new Map();
    function add(rec) {
      const j = jobById.get(rec?.id);
      if (
        !j ||
        (job && job !== j) ||
        !validCues(j, rec.cues, false) ||
        !Number.isInteger(rec.tick) ||
        rec.tick < 1 ||
        rec.tick > 420
      )
        return;
      if (!best.has(j.id) || rec.tick < best.get(j.id).tick) best.set(j.id, rec);
    }
    const prefix = recordPrefix + (job ? job.id + '/' : '');
    try {
      const s = storage();
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(prefix))
          try {
            const r = JSON.parse(s.getItem(k));
            if (k === recordPrefix + r.id + '/' + r.tick) add(r);
          } catch {}
      }
    } catch {}
    for (const rec of memory.values()) add(rec);
    return best;
  }
  const best = (job) => read(job).get(job.id) || null;
  function save(job, cues, tick) {
    if (!validCues(job, cues, false) || !Number.isInteger(tick) || tick < 1 || tick > 420) return;
    const stored = best(job);
    if (stored && stored.tick <= tick) return;
    const rec = { id: job.id, cues: [...cues], tick },
      key = recordPrefix + job.id + '/' + tick;
    memory.set(key, rec);
    try {
      const s = storage();
      s.setItem(key, JSON.stringify(rec));
      memory.delete(key);
      // Different times have independent keys, so simultaneous finishes cannot overwrite a faster record.
      const prefix = recordPrefix + job.id + '/';
      for (let i = s.length - 1; i >= 0; i--) {
        const k = s.key(i);
        if (k?.startsWith(prefix) && Number(k.slice(prefix.length)) > tick) s.removeItem(k);
      }
    } catch {}
  }
  return { best, save, completed: () => new Set(read().keys()) };
}
