import { cases } from './cases.js';
import {
  inspectionLine,
  fieldMachine,
  tapeFor,
  firstDifference,
  scopes,
  stationReading,
} from './physics.js';
import { campaignById } from '../campaign.js';
import { atFrame, draw } from '../drawing.js';
import { WIDTH, HEIGHT } from '../machines.js';
import { stationFile } from '../station-file.js';
const el = (id) => document.getElementById(id),
  canvas = el('case-diagram'),
  c = canvas.getContext('2d'),
  portable = document.body.dataset.fault;
const seconds = (n) => (n / 60).toFixed(2) + ' s',
  stamp = 'chaos.one-part-missing.fault.v1.';
const acts = [
  'Find the first change',
  'Trace the handoff',
  'Inspect the whole line',
];
const briefs = [
  'Compare the failed run with the dashed working reference. Inspect a station, then service it and test the delivery.',
  'A missed contact can be downstream of the fault. Compare when each station first acted.',
  'Find the single fault in a complete line. Follow the earliest change in the load or machinery.',
];
const fixes = {
  offline: 'restored its action',
  reverse: 'restored its direction',
  shift: 'restored its mounting position',
  slack: 'restored its cable span',
  rate: 'restored its drive speed',
  wide: 'restored its clearance',
};
let job,
  reference,
  failed,
  recording,
  difference,
  line,
  points,
  selected = null,
  checked = new Set(),
  solved = false,
  service = null,
  frame = 0,
  raf = 0,
  origin = null,
  credit = 0,
  session = 0,
  packing = false;
const memory = new Map();
function countFor(j) {
  for (let n = 1; n <= j.indices.length; n++) {
    const key = stamp + j.id + '.' + n;
    let saved = memory.get(key);
    try {
      saved = localStorage.getItem(key) || saved;
    } catch {}
    if (saved && /^[1-9]\d*$/.test(saved)) return n;
  }
  return null;
}
function refreshShelf() {
  el('case-progress').textContent =
    cases.filter((j) => countFor(j) !== null).length +
    ' of ' +
    cases.length +
    ' diagnosed';
  for (const [i, o] of [...el('case-select').options].entries()) {
    const j = cases[i];
    o.textContent =
      String(i + 1).padStart(2, '0') +
      ' · ' +
      j.title +
      (countFor(j) ? ' ✓' : '');
  }
}
function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
  origin = null;
  credit = 0;
  el('case-play').textContent = 'Play film';
}
function visible(tape, t) {
  return tape.frames[Math.min(t, tape.frames.length - 1)];
}
let badges=[];
function positionBadges(){
  const size=Math.max(18,14*WIDTH/Math.max(290,canvas.clientWidth));
  const placed=[];
  for(const station of points){
    const s=recording.run.items[station.item].shape;
    const ax=s.x,ay=s.y-(s.r||s.h/2||12)-size/2;
    const choices=[[0,0],[size,0],[-size,0],[0,-size],[size,-size],[-size,-size],[2*size,0],[-2*size,0],[0,-2*size],[0,size]];
    let best=null,clearance=-1;
    for(const [dx,dy] of choices){
      const x=Math.max(size/2+2,Math.min(WIDTH-size/2-2,ax+dx)),y=Math.max(size/2+2,Math.min(HEIGHT-size/2-2,ay+dy));
      const distance=Math.min(...placed.map(b=>Math.max(Math.abs(b.x-x),Math.abs(b.y-y))));
      if(distance>clearance){best={...station,x,y,ax,ay,size};clearance=distance;}
      if(distance>=size+2)break;
    }
    placed.push(best);
  }
  badges=placed;
}
function render() {
  if (!recording) return;
  const sample = visible(recording, frame),
    ref = visible(reference, frame);
  draw(c, atFrame(recording.run, sample));
  c.save();
  c.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
  let gap = 0,
    actor = 'Gold',
    rim = false;
  for (const [kind, index] of Object.entries(recording.film.actors)) {
    const [x, y] = sample.poses[index],
      [rx, ry] = ref.poses[index],
      shape = line[index] || recording.run.items[index].shape;
    const displacement = Math.hypot(rx - x, ry - y),
      rimTravel = shape.flywheel
        ? 2 *
          shape.r *
          Math.abs(Math.sin((ref.poses[index][2] - sample.poses[index][2]) / 2))
        : 0;
    const d = Math.max(displacement, rimTravel);
    if (d > gap) {
      gap = d;
      actor = kind === 'cargo' ? 'Blue' : 'Gold';
      rim = rimTravel > displacement;
    }
    if (!el('case-overlay').checked) continue;
    c.strokeStyle = '#efbfe7';
    c.lineWidth = 2;
    c.setLineDash([5, 4]);
    c.beginPath();
    const jumps = new Set(
        reference.run.uses
          .filter((e) => e.kind === 'portal' && e.actor === kind)
          .map((e) => e.tick),
      ),
      start = Math.max(0, ref.tick - 55);
    for (let t = start; t <= ref.tick; t++) {
      const [px, py] = reference.frames[t].poses[index];
      if (t === start || jumps.has(t)) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    c.beginPath();
    const r = shape.r || 10;
    if (kind === 'cargo') {
      c.moveTo(rx, ry - r);
      c.lineTo(rx + r, ry);
      c.lineTo(rx, ry + r);
      c.lineTo(rx - r, ry);
      c.closePath();
    } else c.arc(rx, ry, r + 2, 0, Math.PI * 2);
    c.stroke();
  }
  c.setLineDash([]);
  c.textAlign='center';c.textBaseline='middle';
  for(const station of badges){
    const {x,y,ax,ay,size}=station;
    c.font='bold '+Math.round(size*.68)+'px monospace';
    if(Math.hypot(ax-x,ay-y)>size/2){c.strokeStyle='#648e9b';c.lineWidth=1.4;c.beginPath();c.moveTo(ax,ay);c.lineTo(x,y);c.stroke();}
    c.fillStyle = selected === station.item ? '#a2f3ef' : '#122028';
    c.strokeStyle = '#77ccd0';
    c.fillRect(x - size/2,y - size/2,size,size);
    c.strokeRect(x - size/2,y - size/2,size,size);
    c.fillStyle = selected === station.item ? '#0a1519' : '#cdebf1';
    c.fillText(station.letter, x, y);
  }
  c.restore();
  el('case-measure').textContent =
    actor +
    (rim ? ' rim' : '') +
    ' · ' +
    Math.round(gap) +
    ' units from reference at ' +
    seconds(frame) +
    '.';
  el('case-clock').value = seconds(frame);
  el('case-frame').value = frame;
  el('case-frame').setAttribute('aria-valuetext', seconds(frame));
  canvas.setAttribute(
    'aria-label',
    el('case-film-label').textContent + '. ' + el('case-measure').textContent,
  );
}
function scope() {
  const st = points.find((s) => s.item === selected);
  el('case-probe').hidden = !st;
  if (!st) return;
  const reading = (r) => {
    const e = stationReading(r, selected);
    return e ? e.action + ' at ' + seconds(e.tick) : 'no recorded action';
  };
  el('case-scope').textContent =
    service !== null
      ? 'Service test in progress.'
      : 'Reference · ' +
        reading(reference) +
        ' / Test · ' +
        reading(recording) +
        '.';
  el('case-service').textContent = 'Service ' + st.letter + ' and test';
  el('case-service').disabled =
    service !== null || solved || checked.has(st.item);
}
function controls() {
  for (const b of el('case-list').children) {
    const k = Number(b.dataset.station);
    b.disabled = service !== null;
    b.setAttribute('aria-pressed', String(selected === k));
    b.dataset.inspected = String(checked.has(k));
  }
  el('case-stop').hidden = service === null;
  el('case-split').disabled = service !== null || !difference;
  el('case-frame').disabled = service !== null;
  el('case-next').hidden = !!portable || !solved || job === cases.at(-1);
  el('case-reset').hidden = !solved;
  scope();
}
function loadFilm(r, label, t = 0) {
  recording = r;
  positionBadges();
  frame = Math.min(t, r.frames.length - 1);
  el('case-frame').max = r.frames.length - 1;
  el('case-end').value = seconds(r.run.tick);
  el('case-film-label').textContent = label;
  render();
}
function finishService() {
  const item = service;
  service = null;
  checked.add(item);
  const st = points.find((s) => s.item === item);
  solved = recording.run.state === 'won';
  if (solved) {
    const key = stamp + job.id + '.' + checked.size;
    memory.set(key, String(recording.run.tick));
    try {
      localStorage.setItem(key, String(recording.run.tick));
    } catch {}
    el('case-result').textContent =
      st.letter +
      ' · ' +
      st.name +
      ' — ' +
      fixes[job.mode] +
      '. Delivered in ' +
      seconds(recording.run.tick) +
      ' after ' +
      checked.size +
      (checked.size === 1 ? ' service test.' : ' service tests.');
    el('case-film-label').textContent = 'Repaired run';
    difference = null;
    refreshShelf();
  } else {
    el('case-result').textContent =
      st.letter +
      ' · ' +
      st.name +
      ' was within spec. The delivery still missed. Trace the change at another station.';
    el('case-film-label').textContent = 'Failed service test';
  }
  controls();
}
function animate(now) {
  if (origin !== null)
    credit +=
      Math.min((now - origin) / 1000, 0.12) *
      60 *
      Number(el('case-rate').value);
  origin = now;
  const steps = Math.floor(credit);
  credit -= steps;
  frame = Math.min(recording.run.tick, frame + steps);
  render();
  if (frame === recording.run.tick) {
    stop();
    if (service !== null) finishService();
    return;
  }
  raf = requestAnimationFrame(animate);
}
function play() {
  if (raf) {
    stop();
    return;
  }
  if (frame === recording.run.tick) frame = 0;
  el('case-play').textContent = 'Pause film';
  raf = requestAnimationFrame(animate);
}
function open() {
  stop();
  session++;
  const id = portable || location.hash.slice(1);
  job = cases.find((j) => j.id === id) || cases[0];
  const index = cases.indexOf(job),
    act = Math.floor(index / 6),
    source = campaignById.get(job.source);
  line = inspectionLine(source, job.fit);
  points = scopes(line, job.indices);
  reference = tapeFor(
    window.Matter,
    fieldMachine(source, job.fit, job.station, job.change, job.station),
  );
  failed = tapeFor(
    window.Matter,
    fieldMachine(source, job.fit, job.station, job.change),
  );
  difference = firstDifference(failed, reference);
  service = null;
  solved = false;
  selected = null;
  checked = new Set();
  el('case-title').textContent = job.title;
  document.title = job.title + ' · Fault desk';
  el('case-number').textContent =
    'Case ' + String(index + 1).padStart(2, '0') + ' / 18 · ' + acts[act];
  el('case-brief').textContent = briefs[act];
  el('case-result').textContent = countFor(job)
    ? 'Previously diagnosed in ' +
      countFor(job) +
      ' service test' +
      (countFor(job) === 1 ? '' : 's') +
      '.'
    : '';
  el('case-select').value = job.id;
  el('case-overlay').checked = true;
  el('case-list').replaceChildren(
    ...points.map((st) => {
      const b = document.createElement('button'),
        tag = document.createElement('span');
      b.type = 'button';
      tag.textContent = st.letter;
      b.dataset.station = st.item;
      b.setAttribute('aria-label','Station '+st.letter+', '+st.name);
      b.append(tag, document.createTextNode(st.name));
      b.addEventListener('click', () => {
        selected = st.item;
        controls();
        render();
      });
      return b;
    }),
  );
  loadFilm(failed, 'Failed run');
  controls();
  refreshShelf();
}
canvas.addEventListener('click',e=>{
 if(service!==null)return;
 const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*WIDTH/rect.width,y=(e.clientY-rect.top)*HEIGHT/rect.height;
 const nearest=badges.map(b=>({item:b.item,d:Math.hypot(x-b.x,y-b.y)})).sort((a,b)=>a.d-b.d)[0];
 if(nearest && nearest.d<=22*WIDTH/rect.width)el('case-list').querySelector('[data-station="'+nearest.item+'"]').click();
});
el('case-play').addEventListener('click', play);
el('case-frame').addEventListener('input', () => {
  stop();
  frame = Number(el('case-frame').value);
  render();
});
el('case-split').addEventListener('click', () => {
  stop();
  frame = difference.tick;
  render();
});
el('case-overlay').addEventListener('change', render);
el('case-service').addEventListener('click', () => {
  if (selected === null || service !== null || solved || checked.has(selected))
    return;
  stop();
  service = selected;
  const m = fieldMachine(
    campaignById.get(job.source),
    job.fit,
    job.station,
    job.change,
    service,
  );
  loadFilm(tapeFor(window.Matter, m), 'Service test');
  el('case-result').textContent =
    'Testing station ' + points.find((s) => s.item === service).letter + '…';
  controls();
  play();
});
el('case-stop').addEventListener('click', () => {
  stop();
  service = null;
  loadFilm(failed, 'Failed run');
  el('case-result').textContent = 'Test canceled.';
  controls();
});
el('case-reset').addEventListener('click', open);
for (const j of cases) el('case-select').add(new Option(j.title, j.id));
el('case-select').addEventListener(
  'change',
  () => (location.hash = el('case-select').value),
);
el('case-next').addEventListener('click', () => {
  location.hash = cases[cases.indexOf(job) + 1].id;
});
window.addEventListener('hashchange', () => {
  open();
  el('case-title').focus();
});
window.addEventListener('storage', (e) => {
  if (e.key === null || e.key.startsWith(stamp)) refreshShelf();
});
el('case-directory').hidden = !!portable;
el('case-download').hidden = !!portable;
el('case-download').addEventListener('click', async () => {
  if (packing) return;
  packing = true;
  el('case-download').disabled = true;
  const start = session,
    id = job.id;
  try {
    const blob = await stationFile('fault', id),
      link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fault-desk-' + id + '.html';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 12000);
    if (start === session)
      el('case-result').textContent = 'Playable case ready.';
  } catch {
    if (start === session)
      el('case-result').textContent =
        'Could not save this case. Try again when connected.';
  } finally {
    packing = false;
    el('case-download').disabled = false;
  }
});
document.addEventListener('visibilitychange', () => {
  origin = null;
});
new ResizeObserver(() => {
  const w = Math.round(canvas.clientWidth * Math.min(2, devicePixelRatio || 1)),
    h = Math.round((w * HEIGHT) / WIDTH);
  if (w > 0 && (canvas.width !== w || canvas.height !== h)) {
    canvas.width = w;
    canvas.height = h;
    render();
  }
}).observe(canvas.parentElement);
open();
