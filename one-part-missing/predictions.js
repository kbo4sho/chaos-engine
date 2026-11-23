import { flightParts, flightInput } from './flight.js';
import { firstCross } from './prediction-measures.js';
import { parts } from './machines.js';
import { transmissions } from './transmissions.js';
import { sortingParts } from './sorting.js';
import { experiment } from './tool-lab.js';
import { predictionPlans } from './prediction-plans.js';
export const exercises = Object.keys(predictionPlans).flatMap((kind) =>
  ['effect', 'input'].map((mode) => ({ kind, mode })),
);
export const clock = (t) => (t / 60).toFixed(2) + ' s';
function inputName(kind, offset) {
  const i = offset / 24 + 1;
  if (flightParts[kind]) return flightInput(kind).labels[i];
  return (
    sortingParts[kind]
      ? ['14-unit load', '26-unit load', '42-unit load']
      : transmissions[kind]
        ? ['Slow drive', 'Nominal drive', 'Fast drive']
        : ['Left release', 'Center release', 'Right release']
  )[i];
}
export function prediction(M, kind, mode) {
  const [offset, axis, frame, crossAxis, line, dir, hi, lo] = predictionPlans[kind];
  const normal = experiment(M, kind, mode === 'effect' ? offset : hi);
  const target = kind === 'domino' ? 'last domino' : normal.delivery ? 'blue parcel' : 'gold marble';
  const targetIndex = (sample) => {
    const track = sample.run.items.findIndex(
      (i) => i.shape.track || (normal.delivery && i.shape.kind === 'cargo'),
    );
    return track >= 0 ? track : sample.run.items.findIndex((i) => i.shape.kind === 'marble');
  };
  if (mode === 'effect') {
    const a = normal.powered,
      b = normal.reference,
      delta = a.path[frame][axis] - b.path[frame][axis],
      margin = 12;
    const answers = axis
      ? ['Higher', 'Within 12 units', 'Lower']
      : ['Farther left', 'Within 12 units', 'Farther right'];
    const correct = delta < -margin ? 0 : delta > margin ? 2 : 1;
    const labels = normal.unpowered ? ['Part fitted', 'Socket empty'] : ['Tool active', 'Tool disabled'];
    const displacement =
      correct === 1
        ? Math.abs(delta).toFixed(1) + ' units apart on this axis'
        : Math.round(Math.abs(delta)) + ' units ' + answers[correct].toLowerCase();
    return {
      kind,
      mode,
      a,
      b,
      target,
      refIndex: targetIndex(b),
      axis,
      end: frame,
      correct,
      answers,
      labels,
      delivery: normal.delivery,
      question:
        'At ' +
        clock(frame) +
        ', where will the ' +
        target +
        ' be with the ' +
        parts[kind].name.toLowerCase() +
        ' working, compared with the reference?',
      unit: axis ? 'Height' : 'Horizontal position',
      result:
        correct === 1
          ? 'The two readings differ by ' +
            Math.abs(delta).toFixed(1) +
            ' units at ' +
            clock(frame) +
            '.'
          : 'With the tool fitted, the ' + target + ' is ' + displacement + ' at ' + clock(frame) + '.',
    };
  }
  const a = normal.powered,
    b = experiment(M, kind, lo).powered;
  const labels = [inputName(kind, hi), inputName(kind, lo)],
    times = [a, b].map((r) => firstCross(r.path, crossAxis, line, dir));
  const [first, second] = times,
    correct =
      first === null && second === null
        ? 3
        : first === null
          ? 2
          : second === null
            ? 0
            : Math.abs(first - second) <= 1
              ? 1
              : first < second
                ? 0
                : 2;
  const end = times.every((t) => t !== null)
    ? Math.max(...times)
    : Math.max(a.path.length, b.path.length) - 1;
  return {
    kind,
    mode,
    a,
    b,
    target,
    refIndex: targetIndex(b),
    axis: crossAxis,
    line,
    dir,
    times,
    end,
    correct,
    answers: [labels[0] + ' first', 'Together', labels[1] + ' first', 'Neither crosses'],
    labels,
    delivery: normal.delivery,
    question:
      'Which ' +
      target +
      ' crosses the marked line first when you change the ' +
      (flightParts[kind]
        ? flightInput(kind).name
        : sortingParts[kind]
          ? 'load diameter'
          : transmissions[kind]
            ? 'input speed'
            : 'release position') +
      '?',
    unit: 'First crossing',
    result:
      labels
        .map((s, i) => s + ' · ' + (times[i] === null ? 'no crossing' : clock(times[i])))
        .join(' / ') + '.',
  };
}
export const predictionPrefix = 'chaos.one-part-missing.predict.v1.';
export function predictionBook(getStorage) {
  const memory = new Set();
  const key = (k, m, status) => predictionPrefix + k + '/' + m + '/' + status;
  const has = (k) => {
    try {
      return memory.has(k) || getStorage().getItem(k) === '1';
    } catch {
      return memory.has(k);
    }
  };
  function mark(kind, mode, correct) {
    for (const s of correct ? ['studied', 'correct'] : ['studied']) {
      const k = key(kind, mode, s);
      memory.add(k);
      try {
        getStorage().setItem(k, '1');
        memory.delete(k);
      } catch {}
    }
  }
  const learned = (k, m) => has(key(k, m, 'correct'));
  const counts = () => ({
    correct: exercises.filter(({ kind, mode }) => learned(kind, mode)).length,
    tried: exercises.filter(({ kind, mode }) => has(key(kind, mode, 'studied'))).length,
  });
  function next(k, m) {
    const i = exercises.findIndex((e) => e.kind === k && e.mode === m);
    const ordered = exercises.slice(i + 1).concat(exercises.slice(0, i + 1));
    return ordered.find((e) => !learned(e.kind, e.mode)) || ordered[0];
  }
  return { mark, counts, next, learned };
}
