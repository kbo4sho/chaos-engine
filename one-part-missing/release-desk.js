import { buildDesign, designFilm, encodeDesign } from './blueprints.js';
import { draw, atFrame } from './drawing.js';
import { parts, fittings } from './machines.js';
import { usePress } from './press-client.js';

const offsetName = (n) => (n === 0 ? 'Center' : Math.abs(n) + (n < 0 ? ' left' : ' right'));
const viewName = { complete: 'Complete', empty: 'Stripped', shorter: 'Shorter repair' };
export function setupReleaseDesk(M, getDraft) {
  const el = (id) => document.getElementById(id),
    panel = el('design-trials'),
    rows = el('release-rows'),
    inspect = el('design-witness'),
    slider = el('release-frame');
  let pending = null,
    current = '',
    witness = null,
    samples = null,
    film = null,
    selected = null,
    requested = null;
  function clear() {
    pending?.abort();
    pending = null;
    samples = null;
    film = null;
    selected = null;
    requested = null;
    rows.replaceChildren();
    el('release-jumps').replaceChildren();
    el('release-screen').hidden = true;
    el('release-observation').textContent = '';
  }
  function paint() {
    const n = slider.valueAsNumber,
      frame = film.tape[n],
      xy = frame.poses[film.actorIndex];
    draw(el('release-canvas').getContext('2d'), atFrame(film.run, frame));
    const time = 'Frame ' + n + ' of ' + (film.tape.length - 1);
    slider.setAttribute('aria-valuetext', time);
    el('release-time').value = time;
    el('release-position').textContent =
      film.targetActor + ' at x ' + Math.round(xy[0]) + ', y ' + Math.round(xy[1]);
  }
  function select(view, offset, move, follow = false) {
    selected = { view, offset, move };
    const d = getDraft();
    film = designFilm(M, d, view === 'complete', offset, move);
    el('release-screen').hidden = false;
    slider.max = film.tape.length - 1;
    slider.value = slider.max;
    const title = viewName[view] + ' · ' + offsetName(offset);
    const names =
      view === 'shorter'
        ? fittings(buildDesign(d).machine, move)
            .map(
              (f) =>
                parts[f.part].name +
                ' at ' +
                String.fromCharCode(65 + f.socket) +
                (f.flipped ? ' reversed' : ''),
            )
            .join(', ')
        : '';
    el('release-selected').textContent = title + (names ? ' · ' + names : '');
    const delivered = film.run.state === 'won';
    el('release-observation').textContent =
      (delivered ? 'Delivered' : 'Missed') +
      ' at frame ' +
      film.run.tick +
      ' · ' +
      film.run.hits.length +
      ' of ' +
      film.run.goals.length +
      (film.run.goals.length === 1 ? ' receiver.' : ' receivers.');
    for (const b of rows.querySelectorAll('button'))
      b.setAttribute(
        'aria-pressed',
        String(b.dataset.view === view && Number(b.dataset.offset) === offset),
      );
    const events = [],
      seen = new Set();
    for (const use of film.run.uses) {
      if (!film.run.items[use.item]?.shape.fitted || seen.has(use.item) || !parts[use.kind]) continue;
      seen.add(use.item);
      events.push([use.tick, parts[use.kind].name]);
    }
    film.run.hits.forEach((tick, i) => events.push([tick, 'Receiver ' + (i + 1)]));
    el('release-jumps').replaceChildren(
      ...events
        .sort((a, b) => a[0] - b[0])
        .map(([frame, name]) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'quiet';
          b.textContent = name + ' · frame ' + frame;
          b.addEventListener('click', () => {
            slider.value = frame;
            paint();
          });
          return b;
        }),
    );
    paint();
    if (follow) {
      el('release-selected').focus({ preventScroll: true });
      el('release-screen').scrollIntoView({ block: 'start' });
    }
  }
  function table(data) {
    rows.replaceChildren(
      ...data.map((row) => {
        const tr = document.createElement('tr'),
          th = document.createElement('th');
        th.scope = 'row';
        th.textContent = offsetName(row.offset);
        tr.append(th);
        for (const view of ['complete', 'empty']) {
          const td = document.createElement('td'),
            b = document.createElement('button'),
            r = row[view];
          b.type = 'button';
          b.dataset.view = view;
          b.dataset.offset = row.offset;
          b.className = 'quiet';
          b.textContent = (r.state === 'won' ? 'Delivered' : 'Missed') + ' · ' + r.tick;
          b.setAttribute(
            'aria-label',
            offsetName(row.offset) +
              ', ' +
              viewName[view] +
              ', ' +
              (r.state === 'won' ? 'delivered' : 'missed') +
              ' at frame ' +
              r.tick,
          );
          b.addEventListener('click', () => select(view, row.offset, undefined, true));
          td.append(b);
          tr.append(td);
        }
        return tr;
      }),
    );
  }
  function showSelection() {
    const sample = requested ||
      selected || {
        view: 'complete',
        offset: samples.find((r) => r.complete.state === 'miss')?.offset ?? 0,
      };
    const follow = Boolean(requested);
    requested = null;
    select(sample.view, sample.offset, sample.move, follow);
  }
  async function load() {
    if (!panel.open) return;
    if (samples) {
      if (requested) showSelection();
      return;
    }
    if (pending) return;
    const controller = new AbortController();
    pending = controller;
    el('release-observation').textContent = 'Running fourteen physical trials…';
    try {
      const data = await usePress(M, { releaseTrials: encodeDesign(getDraft()) }, controller.signal);
      if (controller.signal.aborted) return;
      samples = data;
      table(data);
      showSelection();
    } catch {
      if (!controller.signal.aborted)
        el('release-observation').textContent = 'The trials stopped. Reopen the release table to retry.';
    } finally {
      if (pending === controller) pending = null;
    }
  }
  el('release-back').addEventListener('click', () => {
    if (!selected) return;
    const view = selected.view === 'shorter' ? 'complete' : selected.view;
    rows.querySelector('[data-view="' + view + '"][data-offset="' + selected.offset + '"]')?.focus();
  });
  slider.addEventListener('input', paint);
  panel.addEventListener('toggle', () => (panel.open ? load() : clear()));
  inspect.addEventListener('click', () => {
    if (!witness) return;
    requested = witness;
    panel.open = true;
    load();
  });
  return {
    edit(draft) {
      const address = encodeDesign(draft);
      if (address === current) return;
      current = address;
      witness = null;
      inspect.hidden = true;
      clear();
      if (panel.open) load();
    },
    proof(result) {
      witness = result?.witness || null;
      inspect.hidden = !witness;
    },
    leave() {
      panel.open = false;
      clear();
      witness = null;
      inspect.hidden = true;
    },
  };
}
