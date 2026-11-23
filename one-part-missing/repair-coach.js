import { advance, createRun, fittings, parts, trial } from './machines.js';
import { offsets, possibilities } from './certify.js';

const clock = (t) => (t / 60).toFixed(2) + ' s';
const sign = (a, b) =>
  a.part === b.part && a.socket === b.socket && Boolean(a.flipped) === Boolean(b.flipped);
const unit = (n) => Math.round(n) + (Math.round(n) === 1 ? ' unit' : ' units');
function gapToReceiver(g, x, y) {
  const dx = x - g.x,
    dy = y - g.y,
    c = Math.cos(g.a || 0),
    s = Math.sin(g.a || 0);
  return Math.hypot(
    Math.max(0, Math.abs(dx * c + dy * s) - g.w / 2),
    Math.max(0, Math.abs(-dx * s + dy * c) - g.h / 2),
  );
}
function actorName(kind, shape) {
  return kind === 'cargo'
    ? 'blue parcel'
    : kind === 'tile'
      ? 'domino'
      : kind === 'weight'
        ? 'drop weight'
        : shape.flywheel
          ? 'input rim'
          : 'gold marble';
}
function nextGoals(m, film) {
  const final = film.frames.at(-1);
  return m.sorting
    ? m.goals.map((_, i) => i).filter((i) => final.binTicks[i] === null)
    : [Math.min(final.hits.length, m.goals.length - 1)];
}
export function inspectMiss(m, film, passes = []) {
  const last = film.frames.at(-1);
  const candidates = nextGoals(m, film)
    .map((index) => {
      const g = m.goals[index],
        kind = g.striker || m.striker || 'marble';
      const actors = film.items.flatMap((it, i) => (it.shape.kind === kind ? [i] : []));
      if (!actors.length) {
        const actor = film.items.findIndex((it) => it.shape.kind === 'marble');
        if (actor < 0) return null;
        const target = m.goals.length > 1 ? 'target ' + (index + 1) : 'the receiver',
          required = kind === 'weight' ? 'drop weight' : kind === 'tile' ? 'domino' : 'blue parcel';
        const tick = index ? last.hits[index - 1] || 0 : 0;
        return {
          index,
          kind: 'marble',
          actor,
          source: film.items[actor].shape,
          name: actorName('marble', film.items[actor].shape),
          target,
          tick,
          distance: Infinity,
          hold: 0,
          priority: 3,
          detail:
            target[0].toUpperCase() +
            target.slice(1) +
            ' needs a ' +
            required +
            '. This run has no ' +
            required +
            ' to strike it.',
        };
      }
      const start = m.sorting || index === 0 ? 0 : last.hits[index - 1],
        first = film.frames.findIndex((f) => f.tick >= start);
      let distance = Infinity,
        tick = 0,
        bestActor = actors[0],
        hold = 0,
        heldAt = 0;
      for (let t = Math.max(0, first); t < film.frames.length; t++) {
        const frame = film.frames[t];
        for (const n of actors) {
          const [x, y] = frame.poses[n],
            d = gapToReceiver(g, x, y);
          if (d < distance) {
            distance = d;
            tick = t;
            bestActor = n;
          }
        }
        if (frame.binHolds?.[index] > hold) {
          hold = frame.binHolds[index];
          heldAt = t;
        }
      }
      const name = actorName(kind, film.items[bestActor].shape),
        target = g.bin
          ? g.bin === 'blue'
            ? 'the blue diamond'
            : 'the gold ring'
          : m.goals.length > 1
            ? 'target ' + (index + 1)
            : 'the receiver';
      const refused = passes.find((p) => !p.accepted && p.tick >= start);
      let detail;
      if (refused) {
        const correctFrame = film.frames.findIndex((f) => f.tick >= refused.tick);
        if (correctFrame >= 0) tick = correctFrame;
        detail =
          refused.reason === 'Receiver closed'
            ? 'The ' + name + ' reached ' + target + ' while it was closed.'
            : 'The ' + name + ' reached ' + target + ' from the wrong direction.';
      } else if (g.hold && hold) {
        tick = heldAt;
        detail =
          'The ' +
          name +
          ' stayed inside for ' +
          hold +
          ' of the ' +
          g.hold +
          ' consecutive frames ' +
          target +
          ' needs.';
      } else if (distance < 0.5) {
        detail =
          'The center of the ' +
          name +
          ' entered ' +
          target +
          (g.hold ? ' before it could settle.' : '. Inspect the order and direction of this approach.');
      } else {
        detail =
          'At its closest, the center of the ' +
          name +
          ' was ' +
          unit(distance) +
          ' outside ' +
          target +
          '.';
      }
      return {
        index,
        kind,
        actor: bestActor,
        source: film.items[bestActor].shape,
        name,
        target,
        tick,
        distance,
        hold,
        detail,
        priority: refused ? 2 : hold ? 1 : 0,
      };
    })
    .filter(Boolean);
  return candidates.sort((a, b) => b.priority - a.priority || a.distance - b.distance)[0] || null;
}
function possibleRepairs(m) {
  const full = [...possibilities(m)];
  if (!m.contract) return full;
  return [...possibilities({ ...m, capacity: 1 }), ...full];
}
export function guideRepair(M, m, current, which) {
  const installed = fittings(m, current);
  const options = possibleRepairs(m)
    .map((move) => {
      const fit = fittings(m, move),
        kept = fit.filter((f) => installed.some((a) => sign(a, f))).length;
      const repeated = fit.filter((f) => installed.some((a) => a.part === f.part)).length;
      return { move, fit, kept, edits: installed.length + fit.length - 2 * kept, repeated };
    })
    .sort((a, b) => a.edits - b.edits || b.kept - a.kept || b.repeated - a.repeated);
  const plan = options.find(({ move }) => offsets.every((n) => trial(M, m, move, n).state === 'won'));
  if (!plan) return null;
  const needed = plan.fit.filter((f) => !installed.some((done) => sign(done, f)));
  // A redundant extra fitting on an open order can be the sole cause of failure.
  const removals =
    !(m.capacity > 1)
      ? []
      : installed.filter(
          (f) =>
            !plan.fit.some((p) => sign(p, f)) &&
            plan.fit.every((p) => p.socket !== f.socket && p.part !== f.part),
        );
  const r = createRun(M, m, plan.move);
  const watch = r.items
    .flatMap((it, i) => (it.shape.kind === which.kind ? [{ it, i }] : []))
    .sort(
      (a, b) =>
        Math.hypot(a.it.shape.x - which.source.x, a.it.shape.y - which.source.y) -
        Math.hypot(b.it.shape.x - which.source.x, b.it.shape.y - which.source.y),
    )[0];
  if (!watch) return null;
  const path = [],
    poses = () => [watch.it.body.position.x, watch.it.body.position.y, watch.it.body.angle];
  path.push(poses());
  while (r.state === 'running') {
    advance(M, r);
    const jumped = r.uses.some(
      (e) => e.tick === r.tick && e.kind === 'portal' && e.actor === which.kind,
    );
    path.push([...poses(), jumped]);
  }
  const fits = r.items.filter((it) => it.shape.fitted);
  const meetings = needed.map((f) => {
    const n = plan.fit.findIndex((p) => sign(p, f)),
      item = r.items.indexOf(fits[n]);
    return { fit: f, cue: r.uses.find((e) => e.item === item), place: m.sockets[f.socket] };
  });
  meetings.sort((a, b) => (a.cue?.tick ?? Infinity) - (b.cue?.tick ?? Infinity));
  const first = meetings[0];
  const advice = first
    ? parts[first.fit.part].description + '.'
    : 'Remove the extra fitting and preserve the existing handoff.';
  const changed = first?.cue?.tick;
  return {
    path,
    advice,
    contact: changed ?? null,
    hintTime: changed === undefined ? '' : 'The working station first acts at ' + clock(changed) + '.',
    steps: [
      ...removals.map((f) => ({ operation: 'remove', ...f })),
      ...meetings.map((s) => ({ operation: 'fit', ...s.fit })),
    ],
  };
}
export function compareHandoff(film, diagnosis, reference) {
  const sent = film.frames.map((f) => f.poses[diagnosis.actor]),
    count = Math.min(sent.length, reference.path.length),
    radius = diagnosis.source.r || Math.max(6, (diagnosis.source.w || 12) / 2);
  const distance = (i) => {
    const a = sent[i],
      b = reference.path[i];
    return Math.max(
      Math.hypot(a[0] - b[0], a[1] - b[1]),
      diagnosis.source.flywheel ? 2 * radius * Math.abs(Math.sin((a[2] - b[2]) / 2)) : 0,
    );
  };
  let first = null;
  for (let i = 0; i + 2 < count; i++)
    if ([i, i + 1, i + 2].every((t) => distance(t) >= radius)) {
      first = i;
      break;
    }
  const frame = Math.min(count - 1, first === null ? (reference.contact ?? diagnosis.tick) : first + 8);
  return { sent, end: count - 1, first, frame, distance };
}
