import { campaign } from './campaign.js';
import { parts } from './machines.js';
import { practiceTargets } from './practice-targets.js';
import { observedStarts, pairFinals } from './pair-training-index.js';
import { toolEvents } from './tool-evidence.js';

const keyFor = (a, b) => [a, b].sort().join('+');
export const pairTrainingPrefix = 'chaos.one-part-missing.pair-practice.v1.';
export function partnersFor(kind) {
  return Object.keys(parts)
    .filter((other) => Object.hasOwn(pairFinals, keyFor(kind, other)))
    .sort((a, b) => parts[a].name.localeCompare(parts[b].name));
}
export function pairCourse(first, second, variant = 0) {
  if (!Object.hasOwn(parts, first) || !Object.hasOwn(parts, second)) return null;
  const options = pairFinals[keyFor(first, second)];
  if (!options || !Number.isInteger(variant) || variant < 0 || variant >= options.length) return null;
  const boards = [...options].sort(
    (a, b) => (campaign[a - 1].capacity ?? 1) - (campaign[b - 1].capacity ?? 1) || a - b,
  );
  function warmups(kind) {
    const solo = practiceTargets[kind][0];
    return (solo.length ? solo : observedStarts[kind]).map((n) => ({
      n,
      targets: [kind],
      grade: solo.length ? 'fitted' : 'seen',
    }));
  }
  const firstPicks = warmups(first),
    secondPicks = warmups(second);
  let warm;
  for (const a of firstPicks) {
    const b = secondPicks.find((x) => x.n !== a.n);
    if (b) {
      warm = [a, b];
      break;
    }
  }
  if (!warm) return null;
  const steps = [...warm, { n: boards[variant], targets: [first, second], grade: 'fitted' }].map(
    (s) => ({ ...s, machine: campaign[s.n - 1] }),
  );
  return { first, second, variant, variants: boards.length, steps };
}
export function trainingRoute(course, stage = 0, variant = course.variant) {
  return [
    'tool-pair',
    '1',
    course.first,
    course.second,
    String(stage + 1),
    ...(variant ? [String(variant + 1)] : []),
  ].join('/');
}
export function readTraining(route) {
  if (typeof route !== 'string' || route.length > 80) return null;
  const match = /^tool-pair\/1\/([a-z]+)\/([a-z]+)\/([123])(?:\/([2-9]))?$/.exec(route);
  if (!match) return null;
  const course = pairCourse(match[1], match[2], match[4] ? Number(match[4]) - 1 : 0);
  const stage = Number(match[3]) - 1;
  return course && trainingRoute(course, stage) === route
    ? { course, stage, step: course.steps[stage] }
    : null;
}
export function trainingFileRoute(packed, hash) {
  const origin = readTraining(packed),
    current = readTraining(hash);
  return origin &&
    current &&
    origin.course.first === current.course.first &&
    origin.course.second === current.course.second
    ? hash
    : packed;
}
export function contactReceipt(step, move, run) {
  if (run.state !== 'won') return null;
  const events = toolEvents(step.machine, move, run);
  const matched = step.targets.map((kind) =>
    events.find((e) => e.kind === kind && e.grade === step.grade),
  );
  return matched.every(Boolean) ? matched.map(({ kind, tick, actor }) => ({ kind, tick, actor })) : null;
}
export function arrivalOrder(contacts) {
  const [a, b] = contacts;
  return a.tick === b.tick ? 'same' : a.tick < b.tick ? a.kind : b.kind;
}
export function trainingBook(getStorage) {
  const memory = new Map();
  const key = (course, stage) =>
    pairTrainingPrefix + course.first + '.' + course.second + '.' + course.steps[stage].machine.id;
  function get(course, stage) {
    const id = key(course, stage);
    let raw = memory.get(id);
    try {
      raw ??= getStorage().getItem(id);
    } catch {}
    try {
      const r = JSON.parse(raw),
        step = course.steps[stage];
      return r &&
        Array.isArray(r.contacts) &&
        r.contacts.length === step.targets.length &&
        r.contacts.every(
          (e, i) =>
            e?.kind === step.targets[i] && Number.isInteger(e.tick) && e.tick >= 0 && e.tick <= 420,
        )
        ? r
        : null;
    } catch {
      return null;
    }
  }
  function save(course, stage, contacts, prediction) {
    const id = key(course, stage),
      seen = get(course, stage);
    const correct = stage === 2 && prediction === arrivalOrder(contacts);
    const value = JSON.stringify({ contacts, called: correct || Boolean(seen?.called) });
    memory.set(id, value);
    try {
      getStorage().setItem(id, value);
      memory.delete(id);
    } catch {}
  }
  return { get, save };
}
