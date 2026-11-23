// Each point is one recorded 1/60 s physics frame. A teleport splits a path
// into two strokes, so the empty space between the portals cannot be picked.
export function recordedPath(film, index, kind, name, dashed = false) {
  const shape = film.items[index].shape;
  const rim = kind === 'rim' || (kind === 'marble' && shape.flywheel);
  const points = film.frames.map((f) => {
    const [x, y, angle] = f.poses[index],
      r = shape.r * 0.72;
    return rim ? [x + r * Math.cos(angle), y + r * Math.sin(angle)] : [x, y];
  });
  const jumps = new Set(
    film.uses.filter((u) => u.kind === 'portal' && (u.actor || 'marble') === kind).map((u) => u.tick),
  );
  return {
    name,
    points,
    jumps,
    dashed,
    color: kind === 'cargo' ? '#91d7ff' : kind === 'weight' ? '#d9b3ef' : '#ffc857',
  };
}
export function filmPaths(film, owner = '', dashed = false) {
  const traces = Object.entries(film.actors).map(([kind, index]) => {
    const body =
      kind === 'cargo' ? 'Blue parcel' : film.items[index].shape.flywheel ? 'Input rim' : 'Gold marble';
    return recordedPath(film, index, kind, (owner ? owner + ' · ' : '') + body, dashed);
  });
  const counts = new Map();
  for (const [index, item] of film.items.entries()) {
    const kind = item.shape.kind;
    if (!['weight', 'tile', 'flywheel'].includes(kind)) continue;
    const count = (counts.get(kind) || 0) + 1;
    counts.set(kind, count);
    const body = { weight: 'Drop weight', tile: 'Domino', flywheel: 'Relay rim' }[kind] + ' ' + count;
    const path = recordedPath(
      film,
      index,
      kind === 'flywheel' ? 'rim' : kind,
      (owner ? owner + ' · ' : '') + body,
      dashed,
    );
    const [x, y] = path.points[0];
    if (path.points.some((p) => Math.hypot(p[0] - x, p[1] - y) > 2)) traces.push(path);
  }
  return traces;
}
const fullView = () => [0, 0, 720, 400];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function pathPasses(trace, x, y, radius, current, sx = 1, sy = 1) {
  const passes = [];
  let pass = null;
  for (const [i, b] of trace.points.entries()) {
    const cut = i === 0 || trace.jumps.has(i),
      a = cut ? b : trace.points[i - 1];
    const ax = (a[0] - x) * sx,
      ay = (a[1] - y) * sy,
      dx = (b[0] - a[0]) * sx,
      dy = (b[1] - a[1]) * sy;
    const length = dx * dx + dy * dy;
    const fraction = length ? clamp(-(ax * dx + ay * dy) / length, 0, 1) : 0;
    const distance = Math.hypot(ax + fraction * dx, ay + fraction * dy);
    if (distance > radius) {
      pass = null;
      continue;
    }
    const frame = cut ? i : length ? i - 1 + Math.round(fraction) : clamp(current, i - 1, i);
    if (!pass || cut) {
      pass = { frame, distance };
      passes.push(pass);
    } else if (
      distance < pass.distance - 1e-6 ||
      (Math.abs(distance - pass.distance) <= 1e-6 &&
        Math.abs(frame - current) < Math.abs(pass.frame - current))
    ) {
      pass.frame = frame;
      pass.distance = distance;
    }
  }
  return passes;
}
export function pathLandmark(trace, edge, [left, top, w, h] = fullView()) {
  const axis = edge === 'left' || edge === 'right' ? 0 : 1,
    min = edge === 'left' || edge === 'top';
  let frame = null;
  for (const [i, p] of trace.points.entries()) {
    if (p[0] < left || p[0] > left + w || p[1] < top || p[1] > top + h) continue;
    if (
      frame === null ||
      (min ? p[axis] < trace.points[frame][axis] : p[axis] > trace.points[frame][axis])
    )
      frame = i;
  }
  return frame;
}
const formatTime = (t) => (t / 60).toFixed(2) + ' s';
export function pathReader(panel, canvas, { seek, frame, redraw, view = fullView }) {
  panel.innerHTML = `<summary>Inspect a point on the path</summary>
    <div class="path-tools"><label data-path-label>Path <select data-path-choice></select></label>
    <label>Landmark <select data-path-landmark>
      <option value="">Choose a point</option><option value="left">Leftmost</option><option value="right">Rightmost</option>
      <option value="top">Highest</option><option value="bottom">Lowest</option>
    </select></label><button class="quiet" type="button" data-path-pass hidden>Next pass here</button></div>
    <p>Tap the highlighted path or choose a landmark.</p>
    <output data-path-reading aria-live="off"></output><span data-path-feedback role="status"></span>`;
  const get = (key) => panel.querySelector('[data-path-' + key + ']');
  const choice = get('choice'),
    landmarks = get('landmark'),
    next = get('pass'),
    note = get('feedback'),
    reading = get('reading');
  let source = null,
    paths = [],
    selected = 0,
    passes = [],
    passIndex = 0;
  function forgetPoint() {
    passes = [];
    passIndex = 0;
    next.hidden = true;
    note.textContent = '';
    landmarks.value = '';
  }
  function clear() {
    source = null;
    paths = [];
    selected = 0;
    panel.hidden = true;
    panel.open = false;
    canvas.classList.remove('reading-path');
    forgetPoint();
  }
  function ready(factory) {
    clear();
    source = factory;
    panel.hidden = false;
  }
  function refreshPath() {
    forgetPoint();
    selected = Number(choice.value) || 0;
    redraw();
  }
  function loadPaths() {
    if (!source || paths.length) return;
    paths = source();
    selected = 0;
    choice.replaceChildren(...paths.map((path, i) => new Option(path.name, String(i))));
    get('label').hidden = paths.length < 2;
    forgetPoint();
  }
  panel.querySelector('summary').addEventListener('click', () => {
    if (!panel.open) loadPaths();
  });
  panel.addEventListener('toggle', () => {
    canvas.classList.toggle('reading-path', panel.open && !panel.hidden);
    if (!panel.open || !source) {
      redraw();
      return;
    }
    loadPaths();
    if (paths.length) seek(frame());
  });
  choice.addEventListener('change', refreshPath);
  landmarks.addEventListener('change', () => {
    if (!landmarks.value || !paths[selected]) return;
    const edge = landmarks.value,
      found = pathLandmark(paths[selected], edge, view());
    forgetPoint();
    landmarks.value = edge;
    if (found === null) {
      note.textContent = 'The selected path is outside this view.';
      return;
    }
    seek(found);
    note.textContent =
      landmarks.selectedOptions[0].textContent + ' visible point · ' + formatTime(found) + '.';
  });
  function showPass() {
    const target = passes[passIndex];
    if (!target) return;
    seek(target.frame);
    next.hidden = passes.length < 2;
    note.textContent =
      passes.length > 1
        ? 'Pass ' + (passIndex + 1) + ' of ' + passes.length + ' · ' + formatTime(target.frame) + '.'
        : 'Recorded point · ' + formatTime(target.frame) + '.';
  }
  next.addEventListener('click', () => {
    passIndex = (passIndex + 1) % passes.length;
    showPass();
  });
  canvas.addEventListener('click', (event) => {
    if (!panel.open || panel.hidden || !paths[selected]) return;
    const rect = canvas.getBoundingClientRect(),
      [left, top, w, h] = view(),
      sx = rect.width / w,
      sy = rect.height / h;
    const x = left + (event.clientX - rect.left) / sx,
      y = top + (event.clientY - rect.top) / sy;
    forgetPoint();
    passes = pathPasses(paths[selected], x, y, event.pointerType === 'touch' ? 18 : 12, frame(), sx, sy);
    if (!passes.length) {
      note.textContent = 'No recorded path at that point.';
      return;
    }
    const nearest = Math.min(...passes.map((p) => p.distance));
    passIndex = passes.reduce(
      (best, p, i) =>
        p.distance <= nearest + 1 &&
        (passes[best].distance > nearest + 1 ||
          Math.abs(p.frame - frame()) < Math.abs(passes[best].frame - frame()))
          ? i
          : best,
      0,
    );
    showPass();
  });
  function draw(ctx, tick) {
    if (!panel.open || panel.hidden || !paths[selected]) return;
    const trace = paths[selected],
      t = clamp(tick, 0, trace.points.length - 1),
      [x, y] = trace.points[t];
    ctx.save();
    ctx.setTransform(ctx.canvas.width / 720, 0, 0, ctx.canvas.height / 400, 0, 0);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = trace.color;
    ctx.lineWidth = 2.2;
    ctx.setLineDash(trace.dashed ? [6, 4] : []);
    ctx.globalAlpha = 0.83;
    ctx.beginPath();
    trace.points.forEach(([px, py], i) => {
      if (!i || trace.jumps.has(i)) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#071115';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = '#f2ffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    if (passes.length && passes[passIndex]?.frame !== t) forgetPoint();
    reading.value =
      trace.name + ' · ' + formatTime(t) + ' · (' + Math.round(x) + ', ' + Math.round(y) + ')';
  }
  clear();
  return { clear, ready, draw };
}
