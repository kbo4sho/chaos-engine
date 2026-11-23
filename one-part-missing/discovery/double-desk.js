import {setupAddress,readSetupAddress,sandboxAddress} from './setup-address.js';
import { pathReader, recordedPath } from '../path-reader.js';
import { stationFile } from '../station-file.js';
import { sheetMaker, copySheetLink } from './sheet-maker.js';
import { certifySheet, readSheet, takeRoute, readTake } from './shutter-sheet.js';
import { rigs, doubleRun, actorNames, position } from './double-rigs.js';
import { drawDouble, reading } from './double-drawing.js';
import { doubleRecords, doublePrefix } from './double-records.js';
import { clipControls } from '../clip-controls.js';
import { lessons } from './experiments.js';

const el = (id) => document.getElementById('double-' + id);
const canvas = el('scene'),
  ctx = canvas.getContext('2d'),
  book = doubleRecords(() => localStorage);
const seconds = (t) => (t / 60).toFixed(2) + ' s';
const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];
const partsLabel = (rig, settings) => settings.map((v, i) => rig.controls[i].labels[v]).join(' / ');
let viewOnly = false;
let rig,
  settings,
  tape,
  previous = null,
  lastRun = null,
  earned = null;
let t = 0,
  exposed = 0,
  raf = 0,
  origin,
  startFrame,
  completed = false;
let fileUrl = null,
  fileSession = 0;
function clearFile() {
  fileSession++;
  if (fileUrl) URL.revokeObjectURL(fileUrl);
  fileUrl = null;
  el('file').hidden = true;
  el('file').removeAttribute('href');
  el('make-file').disabled = false;
  el('file-status').textContent = '';
}
el('make-file').addEventListener('click', async () => {
  const session = ++fileSession,
    slug = rig.id,
    route = viewOnly ? takeRoute(rig, settings) : rig.sheet || slug;
  el('make-file').disabled = true;
  el('file-status').textContent = 'Packing the playable machine…';
  try {
    const blob = await stationFile('double', route, {
      page: 'double.html',
      script: 'double-desk.js',
      extraStyles: ['double.css'],
    });
    if (session !== fileSession) return;
    fileUrl = URL.createObjectURL(blob);
    const a = el('file');
    a.href = fileUrl;
    a.download = (viewOnly ? 'shutter-replay-' : 'double-exposure-') + slug + '.html';
    a.hidden = false;
    el('file-status').textContent = 'Ready to play offline.';
    a.focus({ preventScroll: true });
  } catch {
    if (session !== fileSession) return;
    el('make-file').disabled = false;
    el('file-status').textContent = 'The file could not be prepared. Try again.';
  }
});
const path=pathReader(el('path'),canvas,{frame:()=>t,seek:inspect,redraw:()=>{if(tape)paint();}});
function pathsFor(recording,label,dashed=false){
  const film={frames:recording.frames,items:recording.run.items,uses:recording.run.uses};
  return Object.entries(recording.indices).map(([kind,index])=>recordedPath(film,index,kind,label+' · '+actorNames[kind],dashed));
}
const maker = sheetMaker(el, inspect, paint);
const clips = clipControls(el('clip'), () => {
  if (!completed) return null;
  const captured = tape,
    machine = rig,
    labels = partsLabel(rig, settings),
    end = rig.shots.at(-1).tick;
  return {
    title: rig.title,
    label: 'DOUBLE EXPOSURE',
    filename: 'double-' + rig.id,
    end,
    highlights: rig.shots.map((s) => s.tick),
    legend: [labels],
    scene: (c, frame) => drawDouble(c, machine, captured, frame),
    caption: (frame) => {
      const i = frame >= machine.shots[1].tick ? 1 : frame >= machine.shots[0].tick ? 0 : -1;
      if (i < 0) return 'Two shutters on one run.';
      return 'Shutter ' + (i + 1) + ' / ' + reading(machine.shots[i], captured.receipts[i]) + '.';
    },
  };
});
for (const [i, r] of rigs.entries())
  el('select').add(new Option(String(i + 1).padStart(2, '0') + ' · ' + r.title, r.id));
function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
}
function result(text, solved = false) {
  el('result').textContent = text;
  el('result').dataset.solved = String(solved);
}
function renderBook() {
  earned = book.best(rig);
  let total = 0;
  for (const [i, r] of rigs.entries()) {
    const best = book.best(r);
    if (best?.count === 2) total++;
    el('select').options[i].textContent =
      String(i + 1).padStart(2, '0') + ' · ' + r.title + (best?.count === 2 ? ' ✓' : '');
  }
  el('progress').textContent = total + ' of ' + rigs.length + ' developed';
}
function refresh() {
  const busy = Boolean(raf);
  el('run').textContent = busy
    ? 'Pause'
    : t > 0 && t < rig.shots[1].tick
      ? 'Resume run'
      : completed
        ? 'Run again'
        : 'Run both shutters';
  for (const b of el('controls').querySelectorAll('button')) {
    b.disabled = busy || viewOnly;
    b.setAttribute(
      'aria-pressed',
      String(settings[Number(b.dataset.knob)] === Number(b.dataset.position)),
    );
  }
  for (const [i, b] of [...el('shots').children].entries()) {
    const seen = i < exposed,
      s = rig.shots[i],
      receipt = tape.receipts[i];
    b.disabled = !seen;
    b.setAttribute('aria-current', String(t === s.tick));
    b.dataset.hit = String(seen && receipt.hit);
    b.querySelector('small').textContent = seen
      ? reading(s, receipt)
      : 'Target (' + s.x + ', ' + s.y + ')';
    b.setAttribute(
      'aria-label',
      'Shutter ' +
        (i + 1) +
        ', ' +
        actorNames[s.kind] +
        ', ' +
        seconds(s.tick) +
        '. ' +
        b.querySelector('small').textContent,
    );
  }
  el('reference').hidden = !previous;
  el('film').hidden = !completed && !exposed;
  el('frame').max = completed ? rig.shots[1].tick : Math.max(t, rig.shots[0].tick);
  el('refit').hidden = viewOnly || !earned || same(earned.settings, settings);
  el('refit').disabled = busy;
  el('refit').textContent = 'Refit best · ' + (earned?.count || 0) + ' / 2';
  el('next').hidden = viewOnly || earned?.count !== 2;
  el('return-panel').hidden = !(completed && tape.count === 2 && !document.body.dataset.double);
  el('sandbox').hidden=Boolean(document.body.dataset.double);
  el('sandbox').href=sandboxAddress('shutters',viewOnly?takeRoute(rig,settings):setupAddress(rig.sheet||rig.id,settings));
  el('return-copy').hidden = viewOnly;
  el('try-sheet').hidden = !viewOnly;
  el('try-sheet').href = '#' + (rig.sheet || rig.id);
  el('make-file').textContent = viewOnly ? 'Make offline replay file' : 'Make offline puzzle file';
  const index = rigs.findIndex((r) => r.id === rig.id);
  el('next').href = rig.sheet
    ? '#' + rig.id
    : index === rigs.length - 1
      ? './'
      : '#' + rigs[index + 1].id;
  el('next').textContent = rig.sheet
    ? 'Original machine →'
    : index === rigs.length - 1
      ? 'Back to experiments →'
      : 'Next double exposure →';
  el('clip').hidden = !completed;
}
function paint() {
  const frame = tape.frames[Math.min(t, tape.frames.length - 1)];
  const draft = maker.preview;
  drawDouble(
    ctx,
    draft ? { ...rig, shots: draft } : rig,
    tape,
    t,
    el('overlay').checked ? previous?.tape : null,
  );
  path.draw(ctx,t);
  el('clock').value = seconds(t);
  el('frame').value = t;
  el('frame').setAttribute('aria-valuetext', seconds(t));
  el('phase').textContent = draft
    ? 'Framing shutter puzzle'
    : t === rig.shots[1].tick
      ? 'Shutter 2'
      : t === rig.shots[0].tick
        ? 'Shutter 1'
        : raf
          ? 'Running'
          : t
            ? 'Film paused'
            : 'Ready';
  canvas.setAttribute(
    'aria-label',
    Object.keys(tape.indices)
      .map((k) => {
        const [x, y] = position(tape, k, frame.tick);
        return actorNames[k] + ' at ' + Math.round(x) + ', ' + Math.round(y);
      })
      .join('. ') +
      '. Frame ' +
      frame.tick +
      '.',
  );
}
function finish() {
  stop();
  t = rig.shots[1].tick;
  exposed = 2;
  completed = true;
  lastRun = { settings: [...settings], tape };
  path.ready(()=>[...pathsFor(tape,'This run'),...(previous?pathsFor(previous.tape,'Previous',true):[])]);
  if (!viewOnly) {
    book.save(rig, settings, tape);
    maker.use(rig, tape);
  }
  renderBook();
  refresh();
  paint();
  const kept = tape.receipts[0].hit ? 'first' : 'second';
  result(
    viewOnly
      ? 'Returned take. Both shutters matched on the recorded run.'
      : tape.count === 2
        ? 'Both shutters matched on one run.'
        : tape.count === 1
          ? 'The ' + kept + ' shutter matched. Inspect the other shot, then change one control.'
          : 'Both shutters missed. Inspect a shot to see where the load landed.',
    tape.count === 2,
  );
}
function animate(now) {
  t = Math.min(
    rig.shots[1].tick,
    startFrame + Math.floor((Math.max(0, now - origin) * 60 * Number(el('rate').value)) / 1000),
  );
  if (t === rig.shots[1].tick) {
    finish();
    return;
  }
  if (!exposed && t >= rig.shots[0].tick) {
    exposed = 1;
    refresh();
    result('First shutter · ' + reading(rig.shots[0], tape.receipts[0]) + '.');
  }
  paint();
  raf = requestAnimationFrame(animate);
}
function play() {
  if (raf) {
    stop();
    refresh();
    paint();
    return;
  }
  if (completed && t === rig.shots[1].tick) {
    t = 0;
    exposed = 0;
    completed = false;
    clips.clear();
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
    return;
  }
  maker.reset();
  startFrame = t;
  origin = performance.now();
  raf = requestAnimationFrame(animate);
  result('Running both shutters.');
  refresh();
  paint();
}
function inspect(tick) {
  stop();
  t = tick;
  refresh();
  paint();
}
function prepare(values) {
  path.clear();
  stop();
  clips.clear();
  maker.reset();
  previous = lastRun && !same(lastRun.settings, values) ? lastRun : null;
  el('return-status').textContent = '';
  el('return-url').hidden = true;
  el('return-url').value = '';
  settings = [...values];
  tape = doubleRun(window.Matter, rig, settings);
  t = 0;
  exposed = 0;
  completed = false;
  result('Match both marked positions on the same run.');
  refresh();
  paint();
}
function route() {
  stop();
  clips.clear();
  clearFile();
  const setup=readSetupAddress(document.body.dataset.double||location.hash.slice(1));
  const address=readTake(setup.route);
  const requested = address.route;
  const parsed = readSheet(requested);
  const proof = parsed && certifySheet(window.Matter, parsed.base, parsed.rig.shots);
  const unknown = requested.includes('/sheet/') && !proof?.route;
  rig = proof?.route ? parsed.rig : rigs.find((r) => r.id === requested.split('/')[0]) || rigs[0];
  viewOnly = false;
  const hasTake = address.settings && !unknown && (!!proof?.route || requested === rig.id);
  if (hasTake) viewOnly = doubleRun(window.Matter, rig, address.settings).count === 2;
  lastRun = null;
  previous = null;
  el('select').value = rig.id;
  el('title').textContent = rig.title;
  document.title = rig.title + ' · Double exposures';
  el('number').textContent = viewOnly
    ? 'Returned take'
    : rig.sheet
      ? 'Player shutter puzzle'
      : 'Double exposure ' +
        String(rigs.findIndex((r) => r.id === rig.id) + 1).padStart(2, '0') +
        ' / ' +
        rigs.length;
  el('brief').textContent = rig.sheet
    ? 'Match the two shutter marks set by the puzzle maker.'
    : rig.brief;
  el('hint').textContent = rig.hint;
  el('help').open = false;
  el('practice').replaceChildren(
    ...rig.controls.map((c) => {
      const a = document.createElement('a');
      a.href = './#' + c.lesson;
      a.textContent = lessons.find((l) => l.id === c.lesson).title + ' →';
      return a;
    }),
  );
  el('controls').replaceChildren(
    ...rig.controls.map((knob, i) => {
      const f = document.createElement('fieldset'),
        title = document.createElement('legend');
      title.textContent = knob.name;
      f.append(title);
      for (const [j, label] of knob.labels.entries()) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiet';
        b.textContent = label;
        b.dataset.knob = i;
        b.dataset.position = j;
        b.addEventListener('click', () => {
          if (settings[i] !== j) {
            const changed = [...settings];
            changed[i] = j;
            prepare(changed);
          }
        });
        f.append(b);
      }
      return f;
    }),
  );
  el('shots').replaceChildren(
    ...rig.shots.map((s, i) => {
      const b = document.createElement('button'),
        n = document.createElement('span'),
        body = document.createElement('span'),
        name = document.createElement('b'),
        note = document.createElement('small'),
        time = document.createElement('time');
      b.type = 'button';
      n.className = 'shot-number';
      n.textContent = i + 1;
      name.textContent = actorNames[s.kind];
      time.textContent = seconds(s.tick);
      body.append(name, note);
      b.append(n, body, time);
      b.addEventListener('click', () => inspect(s.tick));
      return b;
    }),
  );
  el('overlay').checked = true;
  renderBook();
  const fit=setup.settings?.length===2&&setup.settings.every((v,i)=>v<rig.controls[i].values.length)&&!unknown?setup.settings:null;
  prepare(viewOnly?address.settings:fit||proof?.start||[0,0]);
  if (viewOnly) finish();
  else if (address.invalid || address.settings)
    result('This take could not be reproduced. Try the puzzle from its starting setup.');
  if (unknown) result('This sheet could not be reproduced. The original machine is ready.');
}
el('return-copy').addEventListener('click', () => {
  const source = tape;
  copySheetLink(
    takeRoute(rig, settings),
    el('return-url'),
    el('return-status'),
    'Return link copied. It opens both recorded shutters.',
    () => source === tape,
  );
});
el('run').addEventListener('click', play);
el('select').addEventListener('change', () => (location.hash = el('select').value));
el('frame').addEventListener('input', () => inspect(el('frame').valueAsNumber));
el('rate').addEventListener('change', () => {
  startFrame = t;
  origin = performance.now();
});
el('overlay').addEventListener('change', paint);
el('refit').addEventListener('click', () => {
  if (earned) prepare(earned.settings);
});
window.addEventListener('hashchange', () => {
  route();
  el('title').focus({ preventScroll: true });
  scrollTo(0, 0);
});
window.addEventListener('storage', (e) => {
  if (e.key === null || e.key.startsWith(doublePrefix)) {
    renderBook();
    refresh();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && raf) {
    stop();
    refresh();
    paint();
  }
});
new ResizeObserver(() => {
  const w = Math.round(canvas.clientWidth * Math.min(2, devicePixelRatio || 1));
  if (w && canvas.width !== w) {
    canvas.width = w;
    canvas.height = Math.round(w / 1.8);
    if (tape) paint();
  }
}).observe(canvas);
route();
