import { setupDrawingExchange } from './drawing-exchange.js';
import { compoundKits, compoundByMachine } from './compound-design.js';
import { chapters } from './campaign.js';
import { parts, WIDTH, HEIGHT } from './machines.js';
import { draw, atFrame } from './drawing.js';
import {
  designKits,
  getDesignKit,
  draftKey,
  freshDesign,
  readDesign,
  encodeDesign,
  buildDesign,
  tuning,
  targetInside,
  designFilm,
} from './blueprints.js';
import { usePress } from './press-client.js';

export function setupDesignBench(M, playMachine) {
  const el = (id) => document.getElementById(id),
    panel = el('design-bench'),
    kit = el('design-kit'),
    station = el('design-station'),
    part = el('design-part'),
    missing = el('design-missing'),
    view = el('design-view'),
    slider = el('design-frame'),
    canvas = el('design-diagram'),
    ctx = canvas.getContext('2d');
  const library = el('design-library');
  function selectLibrary(count) {
    const key = String(count || 'starter');
    if (kit.dataset.group === key) return;
    kit.dataset.group = key;
    library.value = key;
    kit.replaceChildren();
    if (!count) {
      for (const [i, k] of designKits.entries()) kit.add(new Option(k.name, i));
      return;
    }
    const groups = new Map();
    for (const item of compoundKits.filter((k) => k.stations.length === count)) {
      const chapter = chapters[Math.floor((item.level - 1) / 10)][0];
      if (!groups.has(chapter)) {
        const g = document.createElement('optgroup');
        g.label = chapter;
        kit.append(g);
        groups.set(chapter, g);
      }
      groups.get(chapter).append(new Option(item.level + ' · ' + item.name, item.id));
    }
  }
  let draft,
    selected = 0,
    current = null,
    film = null,
    layout = null,
    frame = 0,
    pending = null,
    raf = 0,
    origin = null;
  try {
    draft = readDesign(localStorage.getItem(draftKey));
  } catch {}
  draft ??= freshDesign();
  selectLibrary(getDesignKit(draft.kit).level ? getDesignKit(draft.kit).stations.length : 0);
  kit.value = draft.kit;
  let previous = [],
    following = [];
  const exchange = setupDrawingExchange(M, () => draft, next => {
    selected = 0;
    change(next);
    if (!layout) render();
    panel.open = true;
    panel.scrollIntoView({block:'start'});
    kit.focus({preventScroll:true});
  });
  const offset = (v, minus, plus) =>
    v === 0 ? 'Centered' : Math.abs(8 * v) + ' ' + (v < 0 ? minus : plus);
  const chosen = () => getDesignKit(draft.kit).stations[selected];
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    origin = null;
    el('design-play').textContent = 'Play preview';
  }
  function cancel() {
    pending?.abort();
    pending = null;
    el('design-prove').disabled = false;
  }
  function paint() {
    const sample = film.tape[frame],
      item = layout.stations[selected];
    draw(ctx, atFrame(film.run, sample));
    ctx.save();
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    ctx.strokeStyle = '#f3d783';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(item.point.x, item.point.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f3d783';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      'S' + (selected + 1),
      Math.min(WIDTH - 25, item.point.x + 18),
      Math.max(14, item.point.y - 18),
    );
    ctx.restore();
    slider.value = frame;
    const time = (frame / 60).toFixed(2) + ' s';
    slider.setAttribute('aria-valuetext', time);
    el('design-time').value = time;
    const xy = sample.poses[film.actorIndex].slice(0, 2).map(Math.round);
    const last = layout.machine.goals.at(-1);
    el('design-reading').textContent =
      film.targetActor +
      ' · x ' +
      xy[0] +
      ', y ' +
      xy[1] +
      (frame === film.tape.length - 1
        ? ' · ' + (film.run.state === 'won' ? 'Delivered' : 'Missed')
        : '');
    el('design-target').disabled =
      view.value !== 'intact' || !targetInside(last, xy) || (last.x === xy[0] && last.y === xy[1]);
  }
  function render(resetFrame = true) {
    stop();
    cancel();
    el('design-status').textContent = '';
    const k = getDesignKit(draft.kit);
    selectLibrary(k.level ? k.stations.length : 0);
    kit.value = draft.kit;
    selected = Math.min(selected, k.stations.length - 1);
    layout = buildDesign(draft);
    const names = layout.stations.map((s, i) => 'S' + (i + 1) + ' · ' + parts[s.kind].name);
    for (const menu of [station, missing])
      menu.replaceChildren(...names.map((n, i) => new Option(n, i)));
    station.value = selected;
    missing.value = draft.missing;
    el('design-one-label').hidden = Boolean(k.level);
    el('design-omissions').hidden = !k.level;
    if (k.level) {
      const list = el('design-hidden-stations');
      list.replaceChildren(
        ...names.map((name, i) => {
          const label = document.createElement('label'),
            box = document.createElement('input');
          box.type = 'checkbox';
          box.value = i;
          box.checked = draft.hidden.includes(i);
          box.disabled = box.checked && draft.hidden.length === 1;
          box.addEventListener('change', () => {
            patch((next) => {
              next.hidden = box.checked
                ? [...next.hidden, i].sort((a, b) => a - b)
                : next.hidden.filter((n) => n !== i);
              next.missing = next.hidden[0];
            });
            list.querySelector('input[value="' + i + '"]')?.focus({ preventScroll: true });
          });
          label.append(box, name);
          return label;
        }),
      );
    }
    const st = chosen(),
      e = draft.edits[selected],
      kind = st.options[e.type];
    part.replaceChildren(...st.options.map((id, i) => new Option(parts[id].name, i)));
    part.value = e.type;
    el('design-position').hidden = Boolean(
      parts[kind].shape.drive || (parts[kind].shape.wire && kind !== 'pulley'),
    );
    el('design-x').value = e.x;
    el('design-y').value = e.y;
    el('design-offset-x').value = offset(e.x, 'left', 'right');
    el('design-offset-y').value = offset(e.y, 'up', 'down');
    const tune = tuning(kind);
    el('design-calibration').hidden = !tune;
    el('design-tune-label').textContent = tune || '';
    el('design-tune').value = e.tune;
    el('design-setting').value = 100 + 15 * e.tune + '%';
    el('design-tune').setAttribute('aria-valuetext', el('design-setting').value);
    for (const axis of ['x', 'y'])
      el('design-' + axis).setAttribute('aria-valuetext', el('design-offset-' + axis).value);
    canvas.setAttribute(
      'aria-label',
      k.name +
        ' preview. Editing ' +
        names[selected] +
        '. Removed for the puzzle: ' +
        (draft.hidden || [draft.missing]).map((i) => names[i]).join(', ') +
        '.',
    );
    el('design-stock-target').hidden = !draft.target;
    el('design-undo').disabled = !previous.length;
    el('design-redo').disabled = !following.length;
    film = designFilm(M, draft, view.value === 'intact');
    slider.max = film.tape.length - 1;
    frame = resetFrame ? 0 : Math.min(frame, film.tape.length - 1);
    paint();
  }
  function save() {
    exchange.refresh();
    try {
      localStorage.setItem(draftKey, encodeDesign(draft));
    } catch {}
  }
  function change(next, reset = true) {
    const old = encodeDesign(draft);
    if (encodeDesign(next) === old) return;
    previous.push(old);
    if (previous.length > 40) previous.shift();
    following = [];
    draft = next;
    save();
    render(reset);
  }
  function patch(fn, reset = true) {
    const next = structuredClone(draft);
    fn(next);
    change(next, reset);
  }
  function travel(from, to) {
    if (!from.length) return;
    to.push(encodeDesign(draft));
    draft = readDesign(from.pop());
    save();
    render();
  }
  el('design-undo').addEventListener('click', () => travel(previous, following));
  el('design-redo').addEventListener('click', () => travel(following, previous));
  library.addEventListener('change', () => {
    selectLibrary(Number(library.value) || 0);
    selected = 0;
    change(freshDesign(Number(kit.value)));
  });
  kit.addEventListener('change', () => {
    selected = 0;
    change(freshDesign(Number(kit.value)));
  });
  station.addEventListener('change', () => {
    selected = Number(station.value);
    render(false);
  });
  part.addEventListener('change', () =>
    patch((d) => {
      const e = d.edits[selected],
        kind = chosen().options[Number(part.value)];
      e.type = Number(part.value);
      e.tune = 0;
      if (parts[kind].shape.drive || (parts[kind].shape.wire && kind !== 'pulley')) e.x = e.y = 0;
    }),
  );
  for (const field of ['x', 'y', 'tune']) {
    const input = el('design-' + field);
    // Each drag commits once. Keyboard arrows commit each discrete notch.
    input.addEventListener('input', () => {
      const n = input.valueAsNumber;
      if (field === 'tune') el('design-setting').value = 100 + 15 * n + '%';
      else
        el('design-offset-' + field).value =
          field === 'x' ? offset(n, 'left', 'right') : offset(n, 'up', 'down');
    });
    input.addEventListener('change', () =>
      patch((d) => {
        d.edits[selected][field] = input.valueAsNumber;
      }),
    );
  }
  missing.addEventListener('change', () =>
    patch((d) => {
      d.missing = Number(missing.value);
    }),
  );
  view.addEventListener('change', () => render());
  slider.addEventListener('input', () => {
    stop();
    frame = slider.valueAsNumber;
    paint();
  });
  function animate(now) {
    origin ??= now - (frame * 1000) / 60;
    frame = Math.min(film.tape.length - 1, Math.floor(((now - origin) * 60) / 1000 + 1e-5));
    paint();
    if (frame < film.tape.length - 1) raf = requestAnimationFrame(animate);
    else stop();
  }
  el('design-play').addEventListener('click', () => {
    if (raf) {
      stop();
      return;
    }
    if (frame === film.tape.length - 1) frame = 0;
    el('design-play').textContent = 'Pause preview';
    raf = requestAnimationFrame(animate);
  });
  el('design-target').addEventListener('click', () => {
    const xy = film.tape[frame].poses[film.actorIndex].slice(0, 2).map(Math.round);
    const g = getDesignKit(draft.kit).base.goals.at(-1);
    patch((d) => {
      d.target = xy[0] === g.x && xy[1] === g.y ? null : xy;
    }, false);
  });
  el('design-stock-target').addEventListener('click', () =>
    patch((d) => {
      d.target = null;
    }),
  );
  el('design-import').addEventListener('click', () => {
    if (current) {
      selected = 0;
      change(readDesign(current));
    }
  });
  el('design-prove').addEventListener('click', async () => {
    cancel();
    const controller = new AbortController();
    pending = controller;
    el('design-prove').disabled = true;
    el('design-status').textContent = 'Testing the complete machine, empty machine and spare drawer…';
    try {
      const result = await usePress(M, { design: encodeDesign(draft) }, controller.signal);
      if (controller.signal.aborted) return;
      if (result.machine) {
        panel.open = false;
        playMachine(result.machine);
      } else el('design-status').textContent = result.reason;
    } catch {
      if (!controller.signal.aborted)
        el('design-status').textContent = 'The trials stopped. Run the test again.';
    } finally {
      if (pending === controller) {
        pending = null;
        el('design-prove').disabled = false;
      }
    }
  });
  panel.addEventListener('toggle', () => {
    if (!panel.open) {
      stop();
      cancel();
      return;
    }
    if (!layout) render();
    else {
      frame = 0;
      paint();
    }
  });
  const navigate = (m) => {
    exchange.leave();
    current = m.designed ? m.id : null;
    el('design-import').hidden = !current;
    if (panel.open) {
      panel.open = false;
      stop();
      cancel();
    }
  };
  return {
    navigate,
    reviewDrawing: exchange.reviewCode,
    available: (m) => compoundByMachine.has(m.id),
    openMachine(m) {
      const k = compoundByMachine.get(m.id);
      if (!k) return;
      selected = 0;
      change(freshDesign(k.id));
      if (!layout) render();
      panel.open = true;
      panel.scrollIntoView({ block: 'start' });
      kit.focus({ preventScroll: true });
    },
  };
}
