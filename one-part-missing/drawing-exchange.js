import {
  buildDesign,
  designFilm,
  encodeDesign,
  getDesignKit,
  readDesign,
  tuning,
} from './blueprints.js';
import { parts } from './machines.js';
import { atFrame, draw } from './drawing.js';

const format = 'one-part-missing-drawing';
export function drawingFile(draft) {
  return JSON.stringify({ format, version: 1, drawing: encodeDesign(draft) }) + '\n';
}
export function readDrawingFile(text) {
  if (typeof text !== 'string' || text.length > 1024) return null;
  try {
    const file = JSON.parse(text);
    return file?.format === format && file.version === 1 ? readDesign(file.drawing) : null;
  } catch {
    return null;
  }
}

export function setupDrawingExchange(M, getDraft, adopt) {
  const el = (id) => document.getElementById(id),
    modal = el('drawing-review'),
    panel = el('drawing-exchange'),
    note = el('drawing-feedback'),
    fallback = el('drawing-address'),
    slider = el('drawing-frame');
  let incoming = null,
    film = null,
    fileURL = null,
    revision = 0,
    closeAction = null;
  function refresh() {
    fallback.hidden = true;
    note.textContent = '';
    if (fileURL) URL.revokeObjectURL(fileURL);
    fileURL = null;
    if (!panel.open) return;
    const draft = getDraft(),
      kit = getDesignKit(draft.kit),
      file = el('drawing-download');
    fileURL = URL.createObjectURL(new Blob([drawingFile(draft)], { type: 'application/json' }));
    file.href = fileURL;
    file.download = 'one-part-missing-drawing-' + (kit.level || 'starter-' + (draft.kit + 1)) + '.json';
    el('drawing-copy').hidden = location.protocol === 'file:';
  }
  panel.addEventListener('toggle', refresh);
  el('drawing-copy').addEventListener('click', async () => {
    const address = new URL(location.href);
    address.search = '';
    address.hash = 'drawing/' + encodeDesign(getDraft());
    try {
      await navigator.clipboard.writeText(address.href);
      note.textContent = 'Editable drawing link copied.';
    } catch {
      fallback.hidden = false;
      fallback.value = address.href;
      fallback.focus();
      fallback.select();
      note.textContent = 'Copy the selected drawing link.';
    }
  });
  function paint() {
    const n = slider.valueAsNumber,
      frame = film.tape[n],
      xy = frame.poses[film.actorIndex];
    draw(el('drawing-diagram').getContext('2d'), atFrame(film.run, frame));
    const time = 'Frame ' + n + ' of ' + (film.tape.length - 1);
    slider.setAttribute('aria-valuetext', time);
    el('drawing-time').value = time;
    el('drawing-outcome').textContent =
      film.targetActor +
      ' at x ' +
      Math.round(xy[0]) +
      ', y ' +
      Math.round(xy[1]) +
      (n === film.tape.length - 1 ? (film.run.state === 'won' ? ' · Delivered' : ' · Missed') : '');
  }
  function preview() {
    if (!incoming) return;
    film = designFilm(M, incoming, el('drawing-view').value === 'intact');
    slider.max = film.tape.length - 1;
    slider.value = slider.max;
    paint();
  }
  el('drawing-view').addEventListener('change', preview);
  slider.addEventListener('input', paint);
  function review(draft, onClose) {
    const valid = Boolean(draft),
      kit = valid && getDesignKit(draft.kit);
    incoming = draft;
    closeAction = onClose;
    el('drawing-preview').hidden = !valid;
    el('drawing-use').hidden = !valid;
    el('drawing-name').textContent = valid ? kit.name : 'Drawing unavailable';
    el('drawing-verdict').textContent = valid
      ? 'Working drawing · ready to edit'
      : 'Ask the author for a fresh drawing link or file.';
    el('drawing-view').value = 'intact';
    if (valid) {
      const missing = new Set(draft.hidden || [draft.missing]),
        layout = buildDesign(draft);
      el('drawing-stations').replaceChildren(
        ...layout.stations.map((station, i) => {
          const row = document.createElement('li'),
            edit = draft.edits[i],
            kind = station.kind;
          const details = [
            'S' + (i + 1) + ' · ' + parts[kind].name,
            missing.has(i) ? 'remove for play' : 'keep installed',
          ];
          if (edit.x || edit.y) details.push('mount ' + edit.x * 8 + ', ' + edit.y * 8);
          if (edit.tune) details.push(tuning(kind) + ' ' + (100 + 15 * edit.tune) + '%');
          row.textContent = details.join(' · ');
          return row;
        }),
      );
      const receiver = layout.machine.goals.at(-1);
      el('drawing-receiver').textContent =
        'Final receiver at x ' + receiver.x + ', y ' + receiver.y + '.';
      preview();
    }
    if (!modal.open) modal.showModal();
    el('drawing-name').focus();
  }
  function dismiss(finish = true) {
    const cb = closeAction;
    closeAction = null;
    incoming = null;
    film = null;
    if (modal.open) modal.close();
    if (finish) cb?.();
  }
  el('drawing-keep').addEventListener('click', () => dismiss());
  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    dismiss();
  });
  el('drawing-use').addEventListener('click', () => {
    const next = incoming;
    dismiss();
    if (next) adopt(next);
  });
  const picker = el('drawing-file');
  picker.addEventListener('change', async () => {
    const file = picker.files[0],
      own = ++revision;
    picker.value = '';
    if (!file) return;
    let draft = null;
    try {
      if (file.size <= 1024) draft = readDrawingFile(await file.text());
    } catch {}
    if (own === revision) review(draft);
  });
  return {
    refresh,
    reviewCode: (code, cb) => review(readDesign(code), cb),
    leave() {
      revision++;
      dismiss(false);
    },
  };
}
