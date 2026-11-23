import { fittings, packFittings, parts } from './machines.js';
import { recordSimulation } from './attempt-film.js';
const clock = (t) => (t / 60).toFixed(2) + ' s';
const visible = ([x, y]) => x >= 8 && x <= 712 && y >= 8 && y <= 392;
const tracked = ['marble', 'cargo', 'tile'];
function actors(record, kind) {
  const matches = record.run.items.flatMap((it, i) =>
    it.shape.kind === kind && (kind !== 'tile' || !it.shape.fitted) ? [i] : [],
  );
  return kind === 'tile' ? matches.at(-1) : matches[0];
}
function position(record, index, t) {
  return record.frames[t].poses[index];
}
export function compareSpare(M, m, move, slot, complete = null) {
  const fit = fittings(m, move),
    removed = fit.find((s) => s.socket === slot);
  if (!removed) return null;
  const fitted = complete || recordSimulation(M, m, move),
    bare = recordSimulation(
      M,
      m,
      packFittings(fit.filter((f) => f.socket !== slot)),
    );
  if (fitted.run.state !== 'won') return null;
  const end = Math.min(fitted.run.tick, bare.run.tick);
  let witness = null;
  for (const kind of tracked) {
    const a = actors(fitted, kind),
      b = actors(bare, kind);
    if (a === undefined || b === undefined) continue;
    // Losing the fitted domino changes the number of tiles. Identify the same fixed
    // end tile by its original coordinates in both runs before comparing positions.
    const shape = fitted.run.items[a].shape,
      other = bare.run.items[b].shape;
    if (shape.x !== other.x || shape.y !== other.y) continue;
    const threshold = Math.max(8, Math.round(shape.r || 10));
    for (let t = 2; t + 2 <= end && (!witness || t < witness.onset); t++) {
      const A = position(fitted, a, t),
        B = position(bare, b, t);
      if (!visible(A) || !visible(B)) continue;
      const axis = Math.abs(B[0] - A[0]) >= Math.abs(B[1] - A[1]) ? 0 : 1;
      const dir = Math.sign(B[axis] - A[axis]);
      const clear = [0, 1, 2].every((step) => {
        const X = position(fitted, a, t + step),
          Y = position(bare, b, t + step);
        return (
          visible(X) && visible(Y) && (Y[axis] - X[axis]) * dir > threshold + 3
        );
      });
      if (!clear) continue;
      witness = { kind, a, b, axis, onset: t, tick: t + 2, threshold };
      break;
    }
  }
  const common = { removed, fitted, bare, end };
  if (!witness) {
    // Some counterweights change a receiver without separating two on-screen
    // moving centers. Ask about actual accepted contacts at a common observation time.
    const done = Math.max(fitted.run.tick, bare.run.tick),
      hits = bare.run.hits.length;
    return {
      ...common,
      end: done,
      tick: done,
      kind: 'contacts',
      answers: m.goals.map((_, i) => String(i)).concat(String(m.goals.length)),
      correct: hits,
      question:
        'By the end of the run, how many receivers will register with this spare removed?',
      result:
        'The working machine recorded ' +
        fitted.run.hits.length +
        ' of ' +
        m.goals.length +
        ' contacts. Removing the spare produced ' +
        hits +
        '.',
    };
  }
  const { a, b, axis, tick, kind, threshold } = witness,
    first = position(fitted, a, tick),
    second = position(bare, b, tick),
    difference = second[axis] - first[axis];
  const name =
    kind === 'cargo'
      ? 'blue parcel'
      : kind === 'tile'
        ? 'end domino'
        : fitted.run.items[a].shape.flywheel
          ? 'input shaft'
          : 'gold marble';
  const answers =
    axis === 0
      ? ['Farther left', 'Within ' + threshold + ' units', 'Farther right']
      : ['Higher', 'Within ' + threshold + ' units', 'Lower'];
  const correct = difference < -threshold ? 0 : difference > threshold ? 2 : 1;
  return {
    ...common,
    ...witness,
    name,
    answers,
    correct,
    question:
      'At ' +
      clock(tick) +
      ', where will the ' +
      name +
      ' be without the ' +
      parts[removed.part].name.toLowerCase() +
      '?',
    result:
      'Without the spare, the ' +
      name +
      ' is ' +
      Math.round(Math.abs(difference)) +
      ' units ' +
      answers[correct].toLowerCase() +
      ' at ' +
      clock(tick) +
      '.',
  };
}
export function studyKey(m, move, slot) {
  return (
    'chaos.one-part-missing.study.v1.' +
    m.id +
    '/' +
    fittings(m, move)
      .map((f) => f.socket + '-' + f.part + (f.flipped ? '-flipped' : ''))
      .join('.') +
    '/' +
    slot
  );
}
