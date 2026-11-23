import { WIDTH, HEIGHT, STEP, createRun, advance } from '../machines.js';
import { draw, atFrame, snapshot } from '../drawing.js';
import { stationFile } from '../station-file.js';
import {
  lines,
  jobs,
  positions,
  legal,
  batchMachine,
  stationName,
  variables,
  units,
  inputNames,
  sheetLink,
  readSheet,
  certificates,
  stampPrefix,
} from './station.js';

const el = (id) => document.getElementById(id),
  canvas = el('bay-diagram'),
  ctx = canvas.getContext('2d'),
  M = window.Matter;
const clock = (t) => (t / 60).toFixed(2) + ' s',
  packaged = document.body.dataset.batch,
  book = certificates(() => localStorage);
const draftPrefix = 'chaos.one-part-missing.batch-draft.v1.',
  lastPosition = 'chaos.one-part-missing.batch-position.v1';
const colors = ['#73dfe1', '#ffc857', '#ff997e'],
  dashes = [[], [7, 5], [2, 4]];
let job,
  setting,
  lot = 0,
  run,
  frames = [],
  view = 0,
  reports = [],
  queue = [],
  busy = false,
  paused = false,
  packing = false,
  speed = 1,
  raf = 0,
  last = 0,
  debt = 0,
  session = 0;
const setText = (id, t) => {
  if (el(id).textContent !== t) el(id).textContent = t;
};
function cancel() {
  cancelAnimationFrame(raf);
  raf = 0;
  last = 0;
  debt = 0;
}
function bodyIndex(r) {
  return r.items.findIndex((it) => it.body === (job.actor === 'cargo' ? r.cargo : r.ball));
}
function paint() {
  if (!run) return;
  const f = frames[view],
    shown = atFrame(run, f),
    index = bodyIndex(run),
    jumps = new Set(
      run.uses.filter((u) => u.kind === 'portal' && u.actor === job.actor).map((u) => u.tick),
    );
  const trail = frames
    .slice(Math.max(0, view - 52), view + 1)
    .map((s) => [...s.poses[index].slice(0, 2), jumps.has(s.tick)]);
  draw(ctx, shown, { [job.actor === 'cargo' ? 'cargoTrail' : 'trail']: trail });
  ctx.save();
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  if (!busy && el('bay-overlay').checked && reports.filter(Boolean).length >= 2) {
    for (const [k, report] of reports.entries())
      if (report) {
        const path = report.path;
        ctx.strokeStyle = colors[k];
        ctx.setLineDash(dashes[k]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (const [i, v] of path.entries()) {
          if (!i || v[2]) ctx.moveTo(v[0], v[1]);
          else ctx.lineTo(v[0], v[1]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const goal = job.lots[k].goals.at(-1);
        ctx.strokeRect(goal.x - goal.w / 2, goal.y - goal.h / 2, goal.w, goal.h);
        ctx.fillStyle = colors[k];
        ctx.font = 'bold 12px monospace';
        ctx.fillText(inputNames[k][0], goal.x + goal.w / 2 + 3, goal.y);
      }
  }
  if (!busy && frames.length === 1) {
    for (const [i, d] of job.dials.entries()) {
      const point = run.items[d.station].shape;
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 1.7;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors[i];
      ctx.font = 'bold 13px monospace';
      ctx.fillText(String.fromCharCode(65 + i), point.x + 19, point.y - 18);
    }
  }
  ctx.restore();
  setText('bay-receivers', f.hits.length + ' / ' + job.lots[lot].goals.length + ' contacts');
  el('bay-time').value = clock(f.tick);
  el('bay-frame').value = view;
  el('bay-frame').setAttribute('aria-valuetext', clock(f.tick));
  el('bay-film-time').value = clock(f.tick);
}
function showLot(i) {
  lot = i;
  if (!busy && reports[i]) {
    const r = reports[i];
    run = r.run;
    frames = r.frames;
    view = frames.length - 1;
    setText('bay-diagnosis', r.note);
  } else {
    run = createRun(M, batchMachine(job, setting, i));
    frames = [snapshot(run)];
    view = 0;
    setText('bay-diagnosis', '');
  }
  el('bay-frame').max = frames.length - 1;
  flags();
  paint();
}
function flags() {
  const certified = reports.length === 3 && reports.every((r) => r?.ok),
    passed = reports.filter((r) => r?.ok).length;
  setText(
    'bay-phase',
    busy
      ? paused
        ? 'Paused'
        : 'Testing ' + inputNames[lot].toLowerCase()
      : reports[lot]
        ? reports[lot].ok
          ? 'Accepted'
          : 'Missed'
        : 'Ready',
  );
  el('bay-phase').dataset.state = busy
    ? paused
      ? 'paused'
      : 'running'
    : reports[lot]
      ? reports[lot].ok
        ? 'pass'
        : 'miss'
      : 'ready';
  el('bay-one').hidden = busy;
  el('bay-all').hidden = busy;
  el('bay-pause').hidden = !busy;
  el('bay-stop').hidden = !busy;
  setText('bay-pause', paused ? 'Resume' : 'Pause');
  el('bay-film').hidden = busy || frames.length < 2;
  el('bay-overlay-row').hidden = busy || reports.filter(Boolean).length < 2;
  el('bay-share').disabled = busy;
  el('bay-download').disabled = busy || packing;
  for (const input of el('bay-dials').querySelectorAll('input')) input.disabled = busy;
  for (const [k, b] of [...el('bay-lots').children].entries()) {
    b.disabled = busy;
    b.setAttribute('aria-pressed', String(k === lot));
    const r = reports[k];
    b.dataset.result = busy && k === lot ? 'testing' : r ? (r.ok ? 'pass' : 'miss') : 'untested';
    b.querySelector('output').textContent =
      busy && k === lot ? 'Testing…' : r ? (r.ok ? '✓ ' + clock(r.tick) : 'Miss') : 'Untested';
  }
  el('bay-next').hidden = !certified;
  setText('bay-next', job.index === jobs.length - 1 ? 'Job list →' : 'Next job →');
  el('bay-recall').hidden = !book.read(job);
  el('bay-recall').disabled = busy;
  const tested = reports.filter(Boolean).length;
  setText(
    'bay-summary',
    busy
      ? 'Testing ' + inputNames[lot].toLowerCase() + ' input.'
      : certified
        ? 'Line approved. All three loads passed with these settings.'
        : tested
          ? passed + ' of 3 loads accepted.'
          : 'One setup must pass all three loads.',
  );
}
function note(r, index) {
  const lotSpec = job.lots[lot];
  if (r.state === 'won')
    return (
      inputNames[lot] +
      ' input reached ' +
      (lotSpec.goals.length > 1 ? 'both targets' : 'the receiver') +
      ' at ' +
      clock(r.tick) +
      '.'
    );
  const missed = r.goals[r.hits.length].shape;
  const rejected = r.passes.findLast(
    (p) => p.reason === 'Receiver closed' || p.reason === 'Entry direction missed',
  );
  if (rejected) return rejected.reason + ' at ' + clock(rejected.tick) + '.';
  const start = r.hits.at(-1) || 0;
  let closest = { gap: Infinity, t: 0 };
  for (const f of frames)
    if (f.tick >= start) {
      const [x, y] = f.poses[index],
        dx = Math.max(0, Math.abs(x - missed.x) - missed.w / 2),
        dy = Math.max(0, Math.abs(y - missed.y) - missed.h / 2),
        gap = Math.hypot(dx, dy);
      if (gap < closest.gap) closest = { gap, t: f.tick };
    }
  return (
    'Closest approach to target ' +
    (r.hits.length + 1) +
    ' · ' +
    Math.round(closest.gap) +
    ' units from the load center to the receiver at ' +
    clock(closest.t) +
    '.'
  );
}
function finish() {
  const index = bodyIndex(run),
    jumps = new Set(
      run.uses.filter((u) => u.kind === 'portal' && u.actor === job.actor).map((u) => u.tick),
    );
  reports[lot] = {
    ok: run.state === 'won',
    tick: run.tick,
    frames,
    run,
    note: note(run, index),
    path: frames.map((f) => [...f.poses[index].slice(0, 2), jumps.has(f.tick)]),
  };
  if (queue.length) {
    showLot(queue.shift());
    return;
  }
  busy = false;
  paused = false;
  cancel();
  if (reports.length === 3 && reports.every((r) => r?.ok)) {
    book.save(
      job,
      setting,
      reports.map((r) => r.tick),
    );
    renderShelf();
  }
  showLot(lot);
}
function step() {
  advance(M, run);
  frames.push(snapshot(run));
  view = frames.length - 1;
  if (run.state !== 'running') finish();
}
function animate(now) {
  if (!busy || paused) return;
  if (!last) last = now;
  debt += Math.min(90, now - last) * speed;
  last = now;
  while (debt >= STEP && busy && !paused) {
    debt -= STEP;
    step();
  }
  if (busy && !paused) {
    paint();
    raf = requestAnimationFrame(animate);
  }
}
function start(indices) {
  if (busy) return;
  cancel();
  session++;
  queue = [...indices];
  for (const i of queue) reports[i] = null;
  busy = true;
  paused = false;
  showLot(queue.shift());
  raf = requestAnimationFrame(animate);
}
function stop() {
  cancel();
  queue = [];
  busy = false;
  paused = false;
  session++;
  showLot(lot);
}
function saveDraft() {
  if (packaged) return;
  try {
    localStorage.setItem(draftPrefix + job.id, JSON.stringify(setting));
  } catch {}
}
function recalledDraft(j) {
  try {
    const p = JSON.parse(localStorage.getItem(draftPrefix + j.id));
    if (legal(j, p)) return p;
  } catch {}
  return positions(j);
}
function changeSetup(next) {
  if (busy) return;
  setting = [...next];
  session++;
  reports = [null, null, null];
  el('bay-overlay').checked = false;
  el('bay-copy').hidden = true;
  saveDraft();
  renderDials();
  showLot(lot);
}
function renderDials() {
  const nodes = job.dials.map((d, i) => {
    const c = document.createElement('section'),
      h = document.createElement('header'),
      name = document.createElement('label'),
      out = document.createElement('output'),
      detail = document.createElement('small'),
      range = document.createElement('input'),
      ends = document.createElement('footer');
    c.className = 'bay-dial';
    c.dataset.dial = i;
    range.id = 'bay-dial-' + i;
    range.type = 'range';
    range.min = 0;
    range.max = d.values.length - 1;
    range.step = 1;
    range.value = setting[i];
    name.htmlFor = range.id;
    name.textContent = String.fromCharCode(65 + i) + ' · ' + stationName(job, d);
    out.setAttribute('for', range.id);
    out.value = units(d.key, d.values[setting[i]]);
    range.setAttribute('aria-label', name.textContent + ' ' + variables[d.key].name);
    range.setAttribute('aria-valuetext', out.value);
    detail.textContent = variables[d.key].name;
    for (const v of [d.values[0], d.values.at(-1)]) {
      const span = document.createElement('span');
      span.textContent = units(d.key, v);
      ends.append(span);
    }
    range.addEventListener('input', () => {
      if (busy) return;
      setting[i] = Number(range.value);
      out.value = units(d.key, d.values[setting[i]]);
      range.setAttribute('aria-valuetext', out.value);
      session++;
      reports = [null, null, null];
      el('bay-overlay').checked = false;
      el('bay-copy').hidden = true;
      saveDraft();
      showLot(lot);
    });
    h.append(name, out);
    c.append(h, detail, range, ends);
    return c;
  });
  el('bay-dials').replaceChildren(...nodes);
}
function renderLots() {
  el('bay-lots').replaceChildren(
    ...job.lots.map((r, i) => {
      const b = document.createElement('button'),
        name = document.createElement('strong'),
        value = document.createElement('span'),
        out = document.createElement('output');
      b.type = 'button';
      b.className = 'bay-lot quiet';
      b.dataset.lot = i;
      name.textContent = inputNames[i];
      value.textContent = units(job.feed.key, r.value);
      b.append(name, value, out);
      b.addEventListener('click', () => {
        if (!busy) showLot(i);
      });
      return b;
    }),
  );
}
function renderShelf() {
  const done = new Set(jobs.filter((j) => book.read(j)).map((j) => j.id));
  const group = Number(el('bay-act').value);
  el('bay-shelf').replaceChildren(
    ...jobs
      .filter((j) => j.chapter === group)
      .map((j) => {
        const a = document.createElement('a'),
          num = document.createElement('span'),
          name = document.createElement('strong'),
          mark = document.createElement('span');
        a.className = 'shelf-item';
        a.href = '#' + j.id;
        if (j === job) a.setAttribute('aria-current', 'step');
        num.className = 'shelf-num';
        num.textContent = String(j.index + 1).padStart(2, '0');
        name.textContent = j.title;
        mark.className = 'check';
        mark.textContent = done.has(j.id) ? '✓' : '';
        a.append(num, name, mark);
        return a;
      }),
  );
  setText('bay-progress', done.size + ' of ' + jobs.length + ' approved');
}
function open() {
  cancel();
  busy = false;
  paused = false;
  queue = [];
  let dest = readSheet(packaged || location.hash);
  if (!dest) {
    let saved;
    try {
      saved = localStorage.getItem(lastPosition);
    } catch {}
    const j = jobs.find((j) => j.id === saved) || jobs[0];
    dest = { job: j, settings: null };
    if (!packaged) history.replaceState(null, '', '#' + j.id);
  }
  job = dest.job;
  setting = dest.settings || (packaged ? positions(job) : recalledDraft(job));
  reports = [null, null, null];
  session++;
  el('bay-act').value = job.chapter;
  setText(
    'bay-number',
    'Job ' + String(job.index + 1).padStart(2, '0') + ' / ' + jobs.length + ' · ' + lines[job.chapter],
  );
  setText('bay-title', job.title);
  document.title = job.title + ' · Test bay';
  setText(
    'bay-goal',
    job.dials.length === 1
      ? 'Adjust one station to deliver three different loads.'
      : 'Find one setting for both stations that delivers every load.',
  );
  const source =
    job.feed.station === -1
      ? 'Gold'
      : batchMachine(job, setting, 0).fixtures[job.feed.station].kind === 'cargo'
        ? 'Blue parcel'
        : 'Input station';
  setText(
    'bay-feed',
    source + ' · ' + variables[job.feed.key].name + '. Each target is marked on the bench.',
  );
  if (!packaged)
    try {
      localStorage.setItem(lastPosition, job.id);
    } catch {}
  el('bay-overlay').checked = false;
  el('bay-copy').hidden = true;
  renderDials();
  renderLots();
  renderShelf();
  showLot(0);
}
for (const [i, name] of lines.entries())
  el('bay-act').add(new Option(String(i + 1).padStart(2, '0') + ' · ' + name, i));
el('bay-one').addEventListener('click', () => start([lot]));
el('bay-all').addEventListener('click', () => start([0, 1, 2]));
el('bay-stop').addEventListener('click', stop);
el('bay-pause').addEventListener('click', () => {
  if (!busy) return;
  paused = !paused;
  cancel();
  flags();
  if (!paused) raf = requestAnimationFrame(animate);
});
el('bay-rate').addEventListener('change', () => {
  speed = Number(el('bay-rate').value);
  last = 0;
  debt = 0;
});
el('bay-frame').addEventListener('input', () => {
  if (!busy) {
    view = Number(el('bay-frame').value);
    paint();
  }
});
el('bay-overlay').addEventListener('change', paint);
el('bay-recall').addEventListener('click', () => {
  const b = book.read(job);
  if (b) changeSetup(b.settings);
});
el('bay-share').addEventListener('click', async () => {
  const n = session,
    u = new URL(location.href);
  u.hash = sheetLink(job, setting);
  try {
    await navigator.clipboard.writeText(u.href);
    if (n === session) setText('bay-summary', 'Setup link copied.');
  } catch {
    if (n === session) {
      el('bay-copy').hidden = false;
      el('bay-url').value = u.href;
      el('bay-url').focus();
      el('bay-url').select();
    }
  }
});
el('bay-download').addEventListener('click', async () => {
  if (busy || packing) return;
  const j = job,
    n = session;
  packing = true;
  flags();
  try {
    const blob = await stationFile('batch', sheetLink(j, setting)),
      href = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = href;
    link.download = 'test-bay-' + j.id + '.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 12000);
    if (n === session) setText('bay-summary', 'Playable job ready.');
  } catch {
    if (n === session) setText('bay-summary', 'Could not save this job. Try again when connected.');
  } finally {
    packing = false;
    el('bay-download').disabled = busy;
  }
});
const shelf = () => {
  el('jobs').scrollIntoView({ block: 'start' });
  el('bay-act').focus({ preventScroll: true });
};
el('bay-jobs-link').addEventListener('click', (e) => {
  e.preventDefault();
  shelf();
});
el('bay-act').addEventListener('change', renderShelf);
el('bay-next').addEventListener('click', () => {
  const n = jobs[job.index + 1];
  if (n) location.hash = n.id;
  else shelf();
});
window.addEventListener('hashchange', () => {
  open();
  el('bay-title').tabIndex = -1;
  el('bay-title').focus();
});
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith(stampPrefix) || e.key === null) {
    renderShelf();
    flags();
  }
});
document.addEventListener('visibilitychange', () => {
  last = 0;
  debt = 0;
});
let resize;
new ResizeObserver(() => {
  cancelAnimationFrame(resize);
  resize = requestAnimationFrame(() => {
    const w = Math.round(canvas.getBoundingClientRect().width * Math.min(2, devicePixelRatio || 1)),
      h = Math.round((w * HEIGHT) / WIDTH);
    if (w > 0 && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      paint();
    }
  });
}).observe(canvas.parentElement);
open();
