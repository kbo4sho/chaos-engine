import { pathReader, recordedPath } from '../path-reader.js';
import { instrumentReading, instrumentEvents } from './instruments.js';
import {
  lessons,
  exposures,
  radius,
  simulate,
  measure,
  separation,
  displacement,
  framing,
} from './experiments.js';
import { draw, atFrame } from '../drawing.js';

const el = (id) => document.getElementById('discovery-' + id);
const surface = el('scene'),
  display = surface.getContext('2d');
const image = document.createElement('canvas');
image.width = 1440;
image.height = 800;
const ctx = image.getContext('2d');
let closeUp = true;
const narrow = matchMedia('(max-width:640px)');
const filmNotes = ['film', 'path', 'events'].map((id) => {
  const node = el(id),
    anchor = document.createComment(id);
  node.before(anchor);
  return { node, anchor };
});
function arrange() {
  for (const { node, anchor } of filmNotes) {
    if (narrow.matches) el('phone-notes').append(node);
    else anchor.after(node);
  }
}
arrange();
narrow.addEventListener('change', arrange);
const prefix = 'chaos.one-part-missing.discovery.v1.';
const memory = new Set();
const seconds = (t) => (t / 60).toFixed(2) + ' s';
const nameOf = (kind) => (kind === 'cargo' ? 'Blue parcel' : 'Gold marble');
const mark = (lesson, stage) => prefix + lesson.id + '.' + stage;
function stamped(lesson, stage) {
  const key = mark(lesson, stage);
  try {
    return memory.has(key) || localStorage.getItem(key) === '1';
  } catch {
    return memory.has(key);
  }
}
function earn(stage) {
  memory.add(mark(lesson, stage));
  try {
    localStorage.setItem(mark(lesson, stage), '1');
  } catch {}
}
const select = el('select');
for (const group of new Set(lessons.map((l) => l.family))) {
  const g = document.createElement('optgroup');
  g.label = group;
  for (const l of lessons.filter((l) => l.family === group)) g.append(new Option(l.title, l.id));
  select.append(g);
}
let lesson, transfer, setting, tape, reference, priorSetting, lastExposure;
let eventTick, divergence;
let frame = 0,
  attempted = false,
  raf = 0,
  clockStart,
  anchorFrame;
const camera=()=>{
  if(!closeUp)return [0,0,720,400];
  const [left,top,width]=framing[lesson.id][Number(transfer)];
  return [left,top,width,width/1.8];
};
const path=pathReader(el('path'),surface,{frame:()=>frame,seek:inspect,redraw:()=>{if(tape)paint();},view:camera});
function pathsFor(tape,name,dashed=false){
  const film={frames:tape.frames,items:tape.run.items,uses:tape.run.uses};
  return tape.actors.map(({kind,index})=>recordedPath(film,index,kind,name+' · '+nameOf(kind),dashed));
}
function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
}
function updateControls() {
  for (const [i, b] of [...el('settings').children].entries()) {
    b.setAttribute('aria-pressed', String(i === setting));
    b.disabled = !!raf;
  }
  el('run').textContent = raf
    ? 'Pause'
    : frame > 0 && frame < tape.frames.length - 1
      ? 'Resume'
      : attempted
        ? 'Run again'
        : 'Run machine';
  el('film').hidden = !attempted;
  el('changes').hidden = lastExposure?.tape !== tape;
  el('events').hidden = !attempted || (eventTick == null && !divergence);
  el('contact').hidden = eventTick == null;
  el('first').hidden = !divergence;
  el('reading').hidden = !attempted || !reference;
  el('contrast').hidden = !reference;
  el('progress').textContent =
    lessons.filter((l) => stamped(l, 'solved')).length + ' of ' + lessons.length + ' solved';
  for (const o of select.options) {
    const l = lessons.find((l) => l.id === o.value);
    o.textContent = l.title + (stamped(l, 'solved') ? ' ✓' : '');
  }
  const seen = lesson.values.filter((v, i) => stamped(lesson, 'seen-' + i)).length;
  const next = el('next'),
    i = lessons.indexOf(lesson);
  next.hidden = transfer ? !stamped(lesson, 'solved') : seen < 2 && !stamped(lesson, 'solved');
  next.textContent = transfer
    ? i === lessons.length - 1
      ? 'Try double exposures →'
      : 'Next experiment →'
    : 'Try the new machine →';
  next.href = transfer
    ? i === lessons.length - 1
      ? 'double.html'
      : '#' + lessons[i + 1].id
    : '#' + lesson.id + '/test';
  el('back').hidden = !transfer;
  el('back').href = '#' + lesson.id;
}
function trace(t, dashed) {
  for (const { kind, index } of t.actors) {
    ctx.strokeStyle = dashed ? '#c5d0d7' : kind === 'cargo' ? '#8bd8ff' : '#ffc857';
    ctx.lineWidth = dashed ? 2.5 : 2;
    ctx.setLineDash(dashed ? [7, 5] : []);
    ctx.beginPath();
    for (let i = 0; i <= frame; i++) {
      const [x, y] = t.frames[i].poses[index];
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    if (dashed) {
      const [x, y] = t.frames[frame].poses[index];
      ctx.beginPath();
      ctx.arc(x, y, t.run.items[index].shape.r + 2, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
}
function paint() {
  const f = tape.frames[frame];
  if (lesson.instruments) {
    const current=instrumentReading(lesson,tape,frame);
    el('state').textContent=current.state;el('motion').textContent=current.motion;
    for(const link of el('transitions').children)link.setAttribute('aria-current',String(Number(link.dataset.frame)===frame));
  }
  draw(ctx, atFrame(tape.run, f));
  ctx.save();
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  trace(tape, false);
  if (reference && el('overlay').checked) trace(reference, true);
  ctx.setLineDash([]);
  if (lesson.kind === 'hatch') {
    ctx.fillStyle = '#dffcff';
    ctx.font = 'bold 19px monospace';
    for (const { shape: s } of tape.run.items.filter((it) => it.shape.kind === 'switch'))
      ctx.fillText(s.link, s.x + 24, s.y + 6);
  }
  if (transfer)
    for (const [i, [x, y]] of exposures[lesson.id][2].entries()) {
      const blue = tape.actors[i].kind === 'cargo';
      ctx.strokeStyle = blue ? '#8bd8ff' : '#ffc857';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      if (blue) {
        ctx.moveTo(x, y - radius - 4);
        ctx.lineTo(x + radius + 4, y);
        ctx.lineTo(x, y + radius + 4);
        ctx.lineTo(x - radius - 4, y);
        ctx.closePath();
      } else ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * 25, y + dy * 25);
        ctx.lineTo(x + dx * 31, y + dy * 31);
        ctx.stroke();
      }
    }
  ctx.restore();
  path.draw(ctx,frame);
  const [left, top, width] = camera();
  display.drawImage(
    image,
    left * 2,
    top * 2,
    width * 2,
    (width * 2) / 1.8,
    0,
    0,
    surface.width,
    surface.height,
  );
  if (reference && attempted) {
    el('reading').textContent = tape.actors
      .map(({ kind, index }) => {
        const [x, y] = f.poses[index],
          [a, b] = reference.frames[frame].poses[index];
        return (
          nameOf(kind) +
          ' ' +
          displacement(x - a, y - b) +
          ' compared with ' +
          lesson.labels[priorSetting] +
          '.'
        );
      })
      .join(' ');
  }
  el('clock').value = seconds(frame);
  el('frame').value = frame;
  el('frame').setAttribute('aria-valuetext', seconds(frame));
  el('scene').setAttribute(
    'aria-label',
    tape.actors
      .map(({ kind, index }) => {
        const [x, y] = f.poses[index];
        return nameOf(kind) + ' at ' + Math.round(x) + ', ' + Math.round(y);
      })
      .join('. ') +
      '. Frame ' +
      frame +
      '.',
  );
}
function result(text, won = false) {
  el('result').textContent = text;
  el('result').dataset.won = String(won);
}
function finish() {
  stop();
  lastExposure = { setting, tape };
  path.ready(()=>[...pathsFor(tape,lesson.labels[setting]),...(reference?pathsFor(reference,lesson.labels[priorSetting],true):[])]);
  if (!transfer) {
    earn('seen-' + setting);
    const seen = lesson.values.filter((_, i) => stamped(lesson, 'seen-' + i)).length;
    result(
      seen >= 2
        ? 'Two settings observed. Try the new machine when you’re ready.'
        : 'Change the setting and run again. The dashed path will show this exposure.',
    );
  } else {
    const readings = measure(tape, exposures[lesson.id][2]);
    const win = readings.every((r) => r.inside);
    if (win) earn('solved');
    result(
      readings
        .map((r) => {
          if (r.inside) return nameOf(r.kind) + ' in frame.';
          const side = Math.abs(r.dx) >= Math.abs(r.dy);
          return (
            nameOf(r.kind) +
            ' landed ' +
            Math.round(Math.abs(side ? r.dx : r.dy)) +
            ' units ' +
            (side ? (r.dx > 0 ? 'right of' : 'left of') : r.dy > 0 ? 'below' : 'above') +
            ' center.'
          );
        })
        .join(' ') + (win ? ' Exposure recorded.' : ' Adjust and try again.'),
      win,
    );
  }
  updateControls();
}
function animate(now) {
  frame = Math.min(
    tape.frames.length - 1,
    anchorFrame + Math.floor((Math.max(0, now - clockStart) * 60 * Number(el('rate').value)) / 1000),
  );
  paint();
  if (frame === tape.frames.length - 1) finish();
  else raf = requestAnimationFrame(animate);
}
function prepare(i, navigating = false) {
  path.clear();
  stop();
  if (!navigating && lastExposure && lastExposure.setting !== i) {
    reference = lastExposure.tape;
    priorSetting = lastExposure.setting;
  } else if (priorSetting === i) reference = null;
  setting = i;
  attempted = false;
  frame = 0;
  tape = simulate(window.Matter, lesson, transfer, setting, exposures[lesson.id][transfer ? 1 : 0]);
  const focus=lesson.contactKind?.(lesson.values[i])||lesson.kind;
  const event = tape.run.uses.find((e) => e.kind === focus);
  el('instruments').hidden=!lesson.instruments;
  el('changes').open=false;
  el('transitions').replaceChildren(...(lesson.instruments?instrumentEvents(tape):[]).map(({tick,name})=>{
    const button=document.createElement('button');button.type='button';button.className='quiet';
    button.textContent=name+' · '+seconds(tick);button.dataset.frame=tick;
    button.addEventListener('click',()=>inspect(tick));return button;
  }));
  el('changes').hidden=true;
  eventTick = event?.tick;
  if (event) el('contact').textContent = 'First ' + focus + ' contact · ' + seconds(eventTick);
  divergence = separation(tape, reference);
  if (divergence) el('first').textContent = 'Paths separate · ' + seconds(divergence.t);
  el('frame').max = tape.frames.length - 1;
  el('limit').textContent = 'Exposure ' + seconds(tape.frames.length - 1);
  if (reference) el('overlay-label').textContent = 'Compare with ' + lesson.labels[priorSetting];
  result(
    transfer
      ? 'Set the control, then run to the marked exposure.'
      : 'Run two different settings to compare their paths.',
  );
  paint();
  updateControls();
}
function start() {
  if (raf) {
    stop();
    updateControls();
    return;
  }
  if (frame === tape.frames.length - 1) frame = 0;
  attempted = true;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    frame=tape.frames.length-1;paint();finish();return;
  }
  clockStart = performance.now();
  anchorFrame = frame;
  result('Running at ' + lesson.labels[setting] + '.');
  raf = requestAnimationFrame(animate);
  updateControls();
}
function inspect(t) {
  stop();
  frame = t;
  paint();
  updateControls();
}
function route() {
  stop();
  const [id, stage] = location.hash.slice(1).split('/');
  lesson = lessons.find((l) => l.id === id) || lessons[0];
  transfer = stage === 'test';
  reference = null;
  priorSetting = null;
  lastExposure = null;
  const index = lessons.indexOf(lesson);
  document.title = lesson.title + ' · Change one thing';
  select.value = lesson.id;
  el('family').textContent =
    lesson.family + ' · ' + String(index + 1).padStart(2, '0') + ' / ' + lessons.length;
  el('mode').textContent = transfer ? 'New machine' : 'Experiment';
  el('title').textContent = lesson.title;
  el('brief').textContent = transfer ? lesson.transfer : lesson.question;
  el('receivers').hidden = !transfer;
  if (transfer)
    el('receivers').textContent = exposures[lesson.id][2]
      .map(([x, y], i) => {
        const kind = lesson.actor === 'both' ? (i ? 'cargo' : 'marble') : lesson.actor || 'marble';
        return (kind === 'cargo' ? 'Blue diamond' : 'Gold ring') + ' at (' + x + ', ' + y + ')';
      })
      .join(' · ');
  el('control').textContent = lesson.control;
  el('cue').textContent = lesson.cue;
  el('hint').open = false;
  el('overlay').checked = true;
  el('lens').hidden = framing[lesson.id][Number(transfer)][2] >= 690;
  el('settings').replaceChildren(
    ...lesson.labels.map((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiet';
      b.textContent = label;
      b.addEventListener('click', () => {
        if (i !== setting) prepare(i);
      });
      return b;
    }),
  );
  prepare(0, true);
}
el('lens').addEventListener('click', () => {
  closeUp = !closeUp;
  el('lens').setAttribute('aria-pressed', String(closeUp));
  paint();
});
new ResizeObserver(() => {
  const width = Math.round(surface.clientWidth * Math.min(devicePixelRatio || 1, 2));
  if (width && width !== surface.width) {
    surface.width = width;
    surface.height = Math.round(width / 1.8);
    if (tape) paint();
  }
}).observe(surface);
el('run').addEventListener('click', start);
el('rate').addEventListener('change', () => {
  clockStart = performance.now();
  anchorFrame = frame;
});
el('frame').addEventListener('input', () => inspect(el('frame').valueAsNumber));
el('contact').addEventListener('click', () => inspect(eventTick));
el('first').addEventListener('click', () => inspect(divergence.t));
el('end').addEventListener('click', () => inspect(tape.frames.length - 1));
el('overlay').addEventListener('change', paint);
select.addEventListener('change', () => {
  location.hash = select.value;
});
window.addEventListener('hashchange', () => {
  route();
  el('title').focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
window.addEventListener('storage', updateControls);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && raf) {
    stop();
    updateControls();
  }
});
route();
