import { operatorFile } from './file.js';
import { createRun, STEP, WIDTH, HEIGHT } from '../machines.js';
import { draw, atFrame, snapshot } from '../drawing.js';
import {
  acts,
  commands,
  jobs,
  jobById,
  operatorBoard,
  stepConsole,
  cueLink,
  readCueLink,
  blankCues,
  validCues,
  time,
  performanceBook,
  recordPrefix,
} from './console.js';

let packaging = false;
const M = window.Matter,
  el = (id) => document.getElementById(id),
  canvas = el('op-diagram'),
  context = canvas.getContext('2d'),
  book = performanceBook(() => localStorage);
const packaged = document.body.dataset.shift;
const draftPrefix = 'chaos.one-part-missing.operator-draft.v1.';
const savedPosition = 'chaos.one-part-missing.operator-position.v1';
let job,
  run,
  tape = [],
  entry = [],
  plan = [],
  events = [],
  lastRun = null,
  phase = 'ready',
  paused = false,
  view = 0,
  raf = 0,
  previous = 0,
  debt = 0,
  speed = 0.5,
  changed = false,
  rangeEnd = 120;
const busy = () => phase === 'live' || phase === 'program';
const loadName = (j) => (j.actor === 'cargo' ? 'blue parcel' : 'gold marble');
const text = (id, value) => {
  const n = el(id);
  if (n.textContent !== value) n.textContent = value;
};
function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  previous = 0;
  debt = 0;
}
function nextSlot() {
  const tick = run.tick + 1;
  return job.slots.findIndex((s, i) => entry[i] === null && s.to >= tick);
}
function updateControls() {
  const active = busy(),
    isLive = phase === 'live',
    i = isLive ? nextSlot() : -1,
    s = job.slots[i],
    tick = run.tick + 1;
  el('op-live').textContent = active ? 'Reset' : 'Run live';
  el('op-pause').textContent = paused ? 'Resume' : 'Pause';
  el('op-pause').disabled = !active;
  el('op-step').disabled = !active || !paused;
  const armed = !!s && tick >= s.from && tick <= s.to;
  el('op-send').disabled = !armed;
  text('op-send', s ? 'Send ' + commands[s.kind].name.toLowerCase() : 'Send signal');
  text(
    'op-window',
    !isLive
      ? phase === 'program'
        ? 'Playing cue sheet'
        : phase === 'ready'
          ? commands[job.slots[0].kind].name +
            ' · ' +
            time(job.slots[0].from) +
            ' – ' +
            time(job.slots[0].to)
          : ''
      : !s
        ? 'No open calls'
        : armed
          ? 'Window open · ' + time(s.to - tick) + ' left'
          : 'Opens in ' + time(s.from - tick),
  );
  el('op-status').dataset.state = paused ? 'paused' : phase;
  text(
    'op-status',
    paused
      ? 'Paused'
      : { live: 'Live', program: 'Cue sheet', ready: 'Ready', won: 'Delivered', miss: 'Missed' }[phase],
  );
  for (const e of el('op-slots').querySelectorAll('input')) e.disabled = active;
  el('op-test').disabled = active || !plan.some((t) => t !== null);
  el('op-share').disabled = active;
  el('op-download').disabled = active || packaging;
  el('op-recording').hidden = active || !lastRun?.some((t) => t !== null);
  el('op-next').hidden = phase !== 'won';
  el('op-next').textContent = job.index === jobs.length - 1 ? 'Shift list →' : 'Next shift →';
  el('op-load').disabled = active;
  el('op-film').hidden = active || phase === 'ready';
  const sharing = lastRun && !changed && !active ? lastRun : plan;
  el('op-share').textContent = sharing.some((n) => n !== null)
    ? sharing === lastRun
      ? 'Copy run link'
      : 'Copy cue sheet link'
    : 'Copy shift link';
}
function arrow(x, y, v, color, dashed) {
  const speed = Math.hypot(...v.slice(0, 2));
  if (speed < 0.1) return;
  const len = Math.max(10, Math.min(55, speed * 5)),
    dx = v[0] / speed,
    dy = v[1] / speed,
    ex = x + dx * len,
    ey = y + dy * len;
  context.strokeStyle = color;
  context.setLineDash(dashed ? [4, 3] : []);
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(ex, ey);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(ex - dx * 7 + dy * 4, ey - dy * 7 - dx * 4);
  context.lineTo(ex, ey);
  context.lineTo(ex - dx * 7 - dy * 4, ey - dy * 7 + dx * 4);
  context.stroke();
}
function paint() {
  const frame = tape[Math.min(view, tape.length - 1)],
    shown = atFrame(run, frame);
  const actor = run.items.findIndex((it) => it.body === (job.actor === 'cargo' ? run.cargo : run.ball));
  const jumps = new Set(
    run.uses
      .filter(
        (u) => u.kind === 'portal' && u.actor === job.actor && u.tick <= view && u.tick > view - 45,
      )
      .map((u) => u.tick),
  );
  const trail = tape
    .slice(Math.max(0, view - 44), view + 1)
    .map((f) => [...f.poses[actor].slice(0, 2), jumps.has(f.tick)]);
  draw(context, shown, { [job.actor === 'cargo' ? 'cargoTrail' : 'trail']: trail });
  const e = events.findLast((x) => x.tick <= view && view - x.tick <= 12);
  if (e) {
    context.save();
    context.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    context.lineWidth = 2.3;
    arrow(e.x, e.y, e.before, '#b6cad4', true);
    arrow(e.x, e.y, e.after, '#ffd477', false);
    context.restore();
  }
  text('op-time', time(frame.tick));
  text('op-delivery', frame.hits.length + ' / ' + job.goals.length + ' received');
  el('op-head').style.left = Math.min(99.8, (100 * view) / rangeEnd) + '%';
  el('op-frame').value = view;
  el('op-frame').setAttribute('aria-valuetext', time(view));
  el('op-film-time').value = time(view);
  if (busy()) updateControls();
}
function timeline() {
  const fraction = (t) => (100 * t) / rangeEnd + '%';
  el('op-windows').replaceChildren(
    ...job.slots.map((s, i) => {
      const b = document.createElement('span');
      b.className = 'band';
      b.style.left = fraction(s.from);
      b.style.width = fraction(s.to - s.from + 1);
      b.textContent = i + 1;
      return b;
    }),
  );
  const cues = busy() || (!changed && (phase === 'won' || phase === 'miss')) ? entry : plan;
  el('op-needles').replaceChildren(
    ...cues
      .filter((t) => t !== null)
      .map((t) => {
        const n = document.createElement('i');
        n.className = 'sent';
        n.style.left = fraction(t);
        return n;
      }),
  );
}
function reset() {
  stop();
  phase = 'ready';
  paused = false;
  run = createRun(M, operatorBoard(job));
  tape = [snapshot(run)];
  entry = blankCues(job);
  events = [];
  view = 0;
  rangeEnd = Math.max(60, job.slots.at(-1).to + 25);
  el('op-readout').hidden = true;
  el('op-events').replaceChildren();
  el('op-result').textContent = '';
  el('op-link-box').hidden = true;
  el('op-frame').max = 0;
  timeline();
  updateControls();
  paint();
}
function records() {
  const best = book.best(job);
  el('op-best').value = best ? time(best.tick) : '—';
  el('op-load').hidden = !best;
  renderShelf();
}
function finish() {
  stop();
  paused = false;
  const actual = blankCues(job);
  for (const e of events) actual[e.index] = e.tick;
  entry = actual;
  const won = run.state === 'won' && events.length === job.slots.length;
  phase = won ? 'won' : 'miss';
  lastRun = [...entry];
  changed = false;
  rangeEnd = Math.max(rangeEnd, run.tick);
  el('op-frame').max = tape.length - 1;
  const sent = events.length,
    summary = sent + ' of ' + job.slots.length + ' signals sent.';
  if (won) {
    book.save(job, entry, run.tick);
    el('op-result').textContent = 'Delivered at ' + time(run.tick) + '. ' + summary;
  } else {
    const absent = entry.findIndex((t) => t === null);
    el('op-result').textContent =
      (absent >= 0
        ? 'The window for ' + commands[job.slots[absent].kind].name + ' passed. '
        : 'The ' + loadName(job) + ' missed the receiver. ') + summary;
  }
  el('op-events').replaceChildren(
    ...events.map((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiet';
      b.textContent = commands[e.kind].name + ' · ' + time(e.tick);
      b.addEventListener('click', () => inspect(e.tick));
      return b;
    }),
  );
  records();
  timeline();
  updateControls();
  paint();
}
function step() {
  stepConsole(M, run, job, entry, (e) => events.push(e));
  tape.push(snapshot(run));
  view = tape.length - 1;
  if (run.state !== 'running') {
    finish();
    return;
  }
  if (run.tick > rangeEnd) {
    rangeEnd += 40;
    timeline();
  }
}
function animate(now) {
  if (!previous) previous = now;
  debt += Math.min(80, now - previous) * speed;
  previous = now;
  while (debt >= STEP && busy() && !paused) {
    debt -= STEP;
    step();
  }
  if (busy() && !paused) {
    paint();
    raf = requestAnimationFrame(animate);
  }
}
function start(mode) {
  reset();
  phase = mode;
  entry = mode === 'program' ? [...plan] : blankCues(job);
  lastRun = null;
  timeline();
  updateControls();
  canvas.focus({ preventScroll: true });
  raf = requestAnimationFrame(animate);
}
function send() {
  if (phase !== 'live') return;
  const i = nextSlot(),
    tick = run.tick + 1;
  if (i < 0 || tick < job.slots[i].from || tick > job.slots[i].to) return;
  entry[i] = tick;
  timeline();
  updateControls();
}
function inspect(t) {
  if (busy()) return;
  view = Math.max(0, Math.min(tape.length - 1, t));
  paint();
  const e = events.find((e) => e.tick === view);
  const measure = (v) =>
    Math.hypot(v[0], v[1]).toFixed(1) +
    ' units/frame, spin ' +
    ((v[2] * 180) / Math.PI).toFixed(1) +
    '°/frame';
  el('op-readout').hidden = !e;
  if (e)
    el('op-readout').textContent =
      commands[e.kind].name +
      ' at ' +
      time(e.tick) +
      '. Dashed incoming arrow · ' +
      measure(e.before) +
      '. Gold outgoing arrow · ' +
      measure(e.after) +
      '.';
}
function saveDraft() {
  if (!packaged)
    try {
      localStorage.setItem(draftPrefix + job.id, JSON.stringify(plan));
    } catch {}
}
function loadDraft(j) {
  if (!packaged)
    try {
      const cues = JSON.parse(localStorage.getItem(draftPrefix + j.id));
      if (validCues(j, cues)) return cues;
    } catch {}
  return blankCues(j);
}
function rows() {
  el('op-slots').replaceChildren(
    ...job.slots.map((s, i) => {
      const row = document.createElement('section'),
        header = document.createElement('header'),
        strong = document.createElement('strong'),
        span = document.createElement('small'),
        desc = document.createElement('p'),
        controls = document.createElement('div'),
        label = document.createElement('label'),
        check = document.createElement('input'),
        slider = document.createElement('input'),
        out = document.createElement('output');
      row.className = 'op-slot';
      row.dataset.slot = i;
      strong.textContent = i + 1 + '. ' + commands[s.kind].name;
      span.textContent = time(s.from) + ' – ' + time(s.to);
      header.append(strong, span);
      desc.textContent = commands[s.kind].rule;
      check.type = 'checkbox';
      check.checked = plan[i] !== null;
      check.setAttribute('aria-label', 'Use cue ' + (i + 1) + ' ' + commands[s.kind].name);
      label.append(check, 'Set cue');
      slider.type = 'range';
      slider.min = s.from;
      slider.max = s.to;
      slider.step = 1;
      slider.value = plan[i] ?? Math.round((s.from + s.to) / 2);
      slider.setAttribute('aria-label', 'Time for cue ' + (i + 1) + ' ' + commands[s.kind].name);
      out.value = time(Number(slider.value));
      slider.setAttribute('aria-valuetext', out.value);
      controls.className = 'op-cue';
      controls.append(label, slider, out);
      function change() {
        plan[i] = check.checked ? Number(slider.value) : null;
        out.value = time(Number(slider.value));
        slider.setAttribute('aria-valuetext', out.value);
        changed = true;
        saveDraft();
        el('op-link-box').hidden = true;
        timeline();
        updateControls();
      }
      check.addEventListener('change', change);
      slider.addEventListener('input', () => {
        check.checked = true;
        change();
      });
      row.append(header, desc, controls);
      return row;
    }),
  );
}
function renderShelf() {
  const completed = book.completed();
  const act = Number(el('op-act').value);
  el('op-shelf').replaceChildren(
    ...jobs
      .filter((j) => j.act === act)
      .map((j) => {
        const a = document.createElement('a'),
          n = document.createElement('span'),
          name = document.createElement('strong'),
          mark = document.createElement('span');
        a.className = 'shelf-item';
        a.href = cueLink(j, blankCues(j));
        if (j === job) a.setAttribute('aria-current', 'step');
        n.className = 'shelf-num';
        n.textContent = String(j.index + 1).padStart(2, '0');
        name.textContent = j.title;
        mark.className = 'check';
        mark.textContent = completed.has(j.id) ? '✓' : '';
        a.append(n, name, mark);
        return a;
      }),
  );
  el('op-progress').textContent = completed.size + ' of ' + jobs.length + ' delivered';
}
function openJob(next, cues) {
  job = next;
  plan = cues || loadDraft(job);
  lastRun = null;
  changed = false;
  el('op-act').value = job.act;
  el('op-number').textContent =
    'Shift ' + String(job.index + 1).padStart(2, '0') + ' / ' + jobs.length + ' · ' + acts[job.act];
  el('op-title').textContent = job.title;
  document.title = job.title + ' · Control room';
  el('op-goal').textContent =
    'Send the ' +
    loadName(job) +
    ' through ' +
    (job.goals.length === 1 ? 'the receiver.' : job.goals.length + ' targets in order.');
  el('op-note').textContent =
    job.index === 0
      ? 'Send Brake during its window. Pause and step to choose an exact frame, or set a cue below.'
      : 'Send each signal in its window, or set the times below and test the cue sheet.';
  rows();
  reset();
  records();
  if (cues) el('op-result').textContent = 'Shared cue sheet loaded. Test it to see the delivery.';
  if (!packaged)
    try {
      localStorage.setItem(savedPosition, job.id);
    } catch {}
}
function route() {
  if (packaged) {
    const dest = readCueLink(packaged);
    if (dest) {
      openJob(dest.job, dest.cues);
      return;
    }
  }
  let dest = readCueLink(location.hash);
  if (!dest) {
    let j;
    try {
      j = jobById.get(localStorage.getItem(savedPosition));
    } catch {}
    j ??= jobs[0];
    dest = { job: j, cues: null };
    history.replaceState(null, '', '#' + j.id);
  }
  openJob(dest.job, dest.cues);
}
for (const [i, name] of acts.entries())
  el('op-act').add(new Option(String(i + 1).padStart(2, '0') + ' · ' + name, i));
el('op-live').addEventListener('click', () => (busy() ? reset() : start('live')));
el('op-test').addEventListener('click', () => {
  if (!busy() && plan.some((n) => n !== null)) start('program');
});
el('op-pause').addEventListener('click', () => {
  if (!busy()) return;
  paused = !paused;
  stop();
  if (!paused) raf = requestAnimationFrame(animate);
  updateControls();
});
el('op-step').addEventListener('click', () => {
  if (busy() && paused) {
    step();
    paint();
  }
});
el('op-send').addEventListener('click', send);
canvas.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && phase === 'live') {
    e.preventDefault();
    if (!e.repeat) send();
  }
});
el('op-rate').addEventListener('change', () => {
  speed = Number(el('op-rate').value);
  debt = 0;
  previous = 0;
});
el('op-frame').addEventListener('input', () => inspect(el('op-frame').valueAsNumber));
function loadSheet(cues) {
  plan = [...cues];
  changed = true;
  saveDraft();
  rows();
  reset();
}
el('op-recording').addEventListener('click', () => {
  if (lastRun) loadSheet(lastRun);
});
el('op-load').addEventListener('click', () => {
  const rec = book.best(job);
  if (rec) loadSheet(rec.cues);
});
el('op-share').addEventListener('click', async () => {
  const u = new URL(location.href);
  u.hash = cueLink(job, lastRun && !changed ? lastRun : plan);
  const saved = job;
  try {
    await navigator.clipboard.writeText(u.href);
    if (saved === job) text('op-result', 'Shift link copied.');
  } catch {
    if (saved === job) {
      el('op-link-box').hidden = false;
      el('op-link').value = u.href;
      el('op-link').focus();
      el('op-link').select();
    }
  }
});
el('op-download').addEventListener('click', async () => {
  if (packaging || busy()) return;
  const activeJob = job,
    sheet = [...(lastRun && !changed ? lastRun : plan)];
  packaging = true;
  updateControls();
  try {
    const blob = await operatorFile(cueLink(activeJob, sheet)),
      href = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = href;
    link.download = 'operator-' + activeJob.id + '.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 12000);
    if (job === activeJob) text('op-result', 'Playable shift ready.');
  } catch {
    if (job === activeJob) text('op-result', 'Could not save this shift. Try again when connected.');
  } finally {
    packaging = false;
    updateControls();
  }
});
el('op-act').addEventListener('change', renderShelf);
function shelf() {
  el('shifts').scrollIntoView({ block: 'start' });
  el('op-act').focus({ preventScroll: true });
}
el('shifts-link').addEventListener('click', (e) => {
  e.preventDefault();
  shelf();
});
el('op-next').addEventListener('click', () => {
  const next = jobs[job.index + 1];
  if (next) location.hash = next.id;
  else shelf();
});
window.addEventListener('hashchange', () => {
  route();
  el('op-title').tabIndex = -1;
  el('op-title').focus();
});
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith(recordPrefix) || e.key === null) records();
});
document.addEventListener('visibilitychange', () => {
  previous = 0;
  debt = 0;
});
let resizeFrame;
new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    const box = canvas.getBoundingClientRect(),
      w = Math.round(box.width * Math.min(devicePixelRatio || 1, 2)),
      h = Math.round((w * HEIGHT) / WIDTH);
    if (w && job && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      paint();
    }
  });
}).observe(canvas);
route();
