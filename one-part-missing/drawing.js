import { WIDTH, HEIGHT } from './machines.js';

const mint = '#56d9df',
  brass = '#ffc857',
  iron = '#375563',
  shadow = '#0a1219';
const tau = 2 * Math.PI;
function path(c, points, stroke, width = 1, fill) {
  c.beginPath();
  c.moveTo(...points[0]);
  for (const p of points.slice(1)) c.lineTo(...p);
  if (fill) {
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
function disc(c, x, y, r, fill, stroke, width = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, tau);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
function line(c, x, y, x2, y2, color, width = 1) {
  path(
    c,
    [
      [x, y],
      [x2, y2],
    ],
    color,
    width,
  );
}
function bolt(c, x, y, r = 3) {
  disc(c, x, y, r, '#233a38', '#9cafa0');
  line(c, x - r * 0.55, y + r * 0.4, x + r * 0.55, y - r * 0.4, '#8b9f91', 0.8);
}
function caption(c, text, x, y, align = 'left') {
  c.fillStyle = '#aac4d0';
  c.font = 'bold 11px ui-monospace, monospace';
  c.textAlign = align;
  c.fillText(text, x, y);
  c.textAlign = 'left';
}

function grid(c) {
  c.fillStyle = '#0c141c';
  c.fillRect(0, 0, WIDTH, HEIGHT);
  for (let x = 0; x <= WIDTH; x += 20)
    line(c, x, 0, x, HEIGHT, x % 100 === 0 ? '#243a48' : '#182935', 0.75);
  for (let y = 0; y <= HEIGHT; y += 20)
    line(c, 0, y, WIDTH, y, y % 100 === 0 ? '#243a48' : '#182935', 0.75);
  for (const x of [20, WIDTH - 20])
    for (const y of [20, HEIGHT - 20]) {
      line(c, x - 4, y, x + 4, y, '#54716d');
      line(c, x, y - 4, x, y + 4, '#54716d');
    }
  line(c, 40, 374, 680, 374, '#425e5c');
  for (let x = 40; x <= 680; x += 10) line(c, x, 374, x, 374 + (x % 40 === 0 ? 6 : 3), '#526b65');
}

function stand(c, s) {
  if (s.kind !== 'rail' && !s.pivot) return;
  const y = s.y + 6,
    base = 348;
  if (s.w < 40) {
    line(c, s.x, y, s.x, y + 13, iron, 4);
    line(c, s.x - 12, y + 13, s.x + 12, y + 13, iron, 3);
    return;
  }
  const legs = s.pivot ? [s.x] : [s.x - s.w * 0.31, s.x + s.w * 0.31];
  legs.forEach((x) => {
    const top = y + (x - s.x) * Math.tan(s.a || 0);
    if (s.pivot) {
      path(
        c,
        [
          [x, top - 7],
          [x - 29, base],
          [x + 29, base],
        ],
        '#5c7875',
        2,
        '#1c3541',
      );
      path(
        c,
        [
          [x, top + 25],
          [x - 16, base - 9],
          [x + 16, base - 9],
        ],
        '#5d7770',
        1,
        '#122633',
      );
    } else {
      c.fillStyle = '#203744';
      c.fillRect(x - 5, top, 10, base - top);
      line(c, x - 4, top, x - 4, base, '#3b5a66', 1);
      for (let h = top + 20; h < base - 5; h += 21) disc(c, x, h, 1.7, '#0c141c');
    }
    c.fillStyle = '#304a56';
    c.fillRect(x - (s.pivot ? 34 : 14), base, s.pivot ? 68 : 28, 4);
    c.fillStyle = '#152629';
    c.fillRect(x - 15, base + 4, 30, 3);
  });
  if (legs.length === 2 && s.w > 110) {
    const [a, b] = legs;
    line(c, a + 4, base - 8, b - 4, y + 23, '#213b47', 4);
    line(c, a + 4, base - 10, b - 4, y + 21, '#36525e', 1);
  }
}

function beam(c, s) {
  const w = s.w,
    h = s.h,
    fitted = s.fitted;
  const rim = fitted ? brass : s.pivot ? '#e8c279' : mint,
    mid = fitted ? '#92703f' : s.pivot ? '#7c6c46' : '#24747b';
  c.fillStyle = '#091e20';
  c.fillRect(-w / 2 + 2, -h / 2 + 4, w, h + 2);
  c.fillStyle = mid;
  c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = rim;
  c.lineWidth = 1.5;
  c.strokeRect(-w / 2, -h / 2, w, h);
  line(c, -w / 2, -h / 2 + 2, w / 2, -h / 2 + 2, rim, 2);
  for (let x = -w / 2 + 9; x < w / 2 - 4; x += 17)
    line(c, x, -h / 2 + 4, x - 4, h / 2 - 1, '#203a38', 1.5);
  if (s.pivot) {
    disc(c, 0, 0, 10, '#7b6c49', brass, 2);
    bolt(c, 0, 0, 4);
  } else {
    bolt(c, -w / 2 + 4, 1, 2);
    bolt(c, w / 2 - 4, 1, 2);
  }
}

function wheel(c, r, marble) {
  if (marble) {
    const g = c.createRadialGradient(-r * 0.35, -r * 0.42, r * 0.08, 0, 0, r);
    g.addColorStop(0, '#fff8d3');
    g.addColorStop(0.35, '#ffdc82');
    g.addColorStop(0.78, '#dc993e');
    g.addColorStop(1, '#9f642a');
    disc(c, 0, 0, r, g, '#ffe7a4', 1.7);
    c.strokeStyle = '#9b682c';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(0, 0, r * 0.43, r * 0.92, 0.42, 0, tau);
    c.stroke();
    disc(c, -r * 0.32, -r * 0.42, r * 0.15, '#fff8db');
  } else {
    disc(c, 0, 0, r, '#344645', brass, 2);
    disc(c, 0, 0, r - 5, '#566b5d', '#b79f6c', 2);
    for (let i = 0; i < 12; i++) {
      c.save();
      c.rotate((i * tau) / 12);
      line(c, 0, -r + 2, 0, -r + 6, brass, 2);
      c.restore();
    }
    disc(c, 0, 0, r * 0.48, '#263b36', brass, 2);
    bolt(c, 0, 0, 5);
  }
}

function target(c, s, lit, age, index, total) {
  const w = s.w,
    h = s.h;
  const ring = lit ? brass : '#d9af6d',
    dark = '#6c5537';
  if (s.kind === 'bell') {
    // Hanger and a flared brass shell share the striker's contact envelope.
    line(c, 0, -h / 2 - 22, 0, -h / 2 + 4, iron, 5);
    line(c, -17, -h / 2 - 23, 17, -h / 2 - 23, mint, 3);
    const swing = lit ? Math.sin(age * 0.36) * Math.max(0, 1 - age / 50) * 0.24 : 0;
    c.rotate(swing);
    disc(c, 0, h * 0.28, w * 0.13, ring, '#322f24', 1);
    c.beginPath();
    c.moveTo(-w * 0.46, h * 0.17);
    c.bezierCurveTo(-w * 0.24, -h * 0.02, -w * 0.39, -h * 0.43, 0, -h * 0.43);
    c.bezierCurveTo(w * 0.39, -h * 0.43, w * 0.24, -h * 0.02, w * 0.46, h * 0.17);
    c.closePath();
    const g = c.createLinearGradient(-w * 0.4, 0, w * 0.45, 0);
    g.addColorStop(0, dark);
    g.addColorStop(0.34, ring);
    g.addColorStop(0.62, '#a07842');
    g.addColorStop(1, dark);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = ring;
    c.lineWidth = 2;
    c.stroke();
    line(c, -w * 0.48, h * 0.18, w * 0.48, h * 0.18, ring, 4);
  } else if (s.kind === 'flag') {
    const rise = lit ? Math.min(1, age / 16) : 0;
    line(c, w * 0.31, -h * 0.75, w * 0.31, h * 0.48, mint, 3);
    disc(c, w * 0.31, -h * 0.79, 2.8, brass);
    const y = -h * 0.15 - rise * h * 0.48;
    path(
      c,
      [
        [w * 0.3, y],
        [-w * 0.6, y + 2],
        [-w * 0.42, y + h * 0.15],
        [-w * 0.6, y + h * 0.3],
        [w * 0.3, y + h * 0.28],
      ],
      ring,
      1,
      lit ? '#e6b55e' : '#946e43',
    );
    line(c, -w * 0.17, h * 0.43, w * 0.45, h * 0.43, ring, 4);
  } else {
    line(c, -w * 0.47, -h * 0.6, w * 0.47, -h * 0.6, mint, 3);
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * w * 0.23;
      line(c, x, -h * 0.6, x, -h * 0.3, '#8ba29a');
      const d = lit ? Math.sin(age * 0.34 + k * 0.5) * Math.max(0, 1 - age / 40) * 3 : 0;
      line(c, x, -h * 0.31, x + d, h * (0.37 - 0.1 * k), ring, 5);
      line(c, x - 1, -h * 0.29, x + d - 1, h * (0.32 - 0.1 * k), '#f9dda0', 1);
    }
  }
  if (total > 1) {
    const y = -h * 0.65 - 13;
    disc(c, 0, y, 10, '#0a1219', lit ? brass : mint, 1);
    c.font = 'bold 14px ui-monospace,monospace';
    c.textAlign = 'center';
    c.fillStyle = lit ? brass : '#e0fcff';
    c.fillText(String(index + 1), 0, y + 5);
  }
  if (lit && age < 32) {
    c.globalAlpha = (1 - age / 32) * 0.8;
    disc(c, 0, 0, w * 0.52 + age * 1.1, null, brass, 2);
    c.globalAlpha = 1;
  }
}

function body(c, item, run) {
  const { shape: s, body: b } = item;
  c.save();
  c.translate(b.position.x, b.position.y);
  c.rotate(b.angle);
  if (s.sensor) {
    const idx = run.goals.indexOf(item),
      hit = run.hits[idx];
    target(c, s, hit !== undefined, hit === undefined ? 0 : run.tick - hit, idx, run.goals.length);
  } else if (s.r) wheel(c, s.r, s.kind === 'marble');
  else if (s.kind === 'tile' || s.kind === 'weight') {
    const tile = s.kind === 'tile';
    c.fillStyle = s.fitted ? '#a8884f' : tile ? '#68998c' : '#596961';
    c.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
    c.strokeStyle = s.fitted ? brass : mint;
    c.lineWidth = 2;
    c.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
    if (tile) {
      line(c, -s.w * 0.4, 0, s.w * 0.4, 0, shadow);
      for (const y of [-0.3, -0.15, 0.23]) disc(c, 0, s.h * y, 1.8, shadow);
    } else {
      line(c, -s.w * 0.4, s.h * 0.18, s.w * 0.4, s.h * 0.18, brass, 3);
      bolt(c, 0, -4, 4);
    }
  } else beam(c, s);
  c.restore();
}

export function draw(c, run, { trail = [], ghost = [], small = false } = {}) {
  c.save();
  c.setTransform(c.canvas.width / WIDTH, 0, 0, c.canvas.height / HEIGHT, 0, 0);
  c.clearRect(0, 0, WIDTH, HEIGHT);
  if (!small) {
    grid(c);
    for (const item of run.items) stand(c, item.shape);
    const start = run.items.find((i) => i.shape.kind === 'marble').shape;
    caption(c, 'RELEASE', Math.min(start.x, WIDTH - 70), Math.max(16, start.y - 24), 'center');
    if (ghost.length > 1) {
      c.setLineDash([3, 7]);
      path(c, ghost, '#80948b', 2);
      c.setLineDash([]);
    }
    if (trail.length > 1) path(c, trail, '#c7a569', 2);
  }
  for (const item of run.items) if (item.body !== run.ball) body(c, item, run);
  body(
    c,
    run.items.find((i) => i.body === run.ball),
    run,
  );
  c.restore();
}

const icons = {
  bridge:
    '<path d="m4 18 52 6-1 6-52-6z" fill="#355665"/><path d="m8 23 3-4m5 5 3-4m5 5 3-4m5 5 3-4m5 5 3-4"/>',
  chute:
    '<path d="m4 26 48-19 3 6L7 32z" fill="#30555e"/><path d="m12 27 1-6m8 3 1-6m8 2 1-6m8 3 1-6"/>',
  bumper:
    '<circle cx="30" cy="20" r="15" fill="#25454f"/><circle cx="30" cy="20" r="11" stroke-dasharray="3 3"/><circle cx="30" cy="20" r="6"/>',
  weight:
    '<path d="M17 10h26l3 23H14z" fill="#38535a"/><path d="M24 10V6h12v4m-20 16h28"/><circle cx="30" cy="18" r="3"/>',
  domino:
    '<g transform="rotate(13 30 20)"><rect x="24" y="3" width="13" height="34" rx="1" fill="#365667"/><path d="M24 20h13"/><circle cx="29" cy="10" r="1"/><circle cx="32" cy="15" r="1"/><circle cx="30" cy="27" r="1"/></g>',
};
export function partIcon(id) {
  return (
    '<svg viewBox="0 0 60 40" fill="none" stroke="#73e2e3" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">' +
    icons[id] +
    '</svg>'
  );
}

// The sandbox's body renderer already translates and rotates the drawing context.
export function drawSandboxPart(c, render, timestamp) {
  const s = render.machineShape;
  const goodSize = (n) => Number.isFinite(n) && n > 0 && n <= 1000;
  if (!s || (s.r ? !goodSize(s.r) : !goodSize(s.w) || !goodSize(s.h))) return;
  c.save();
  const scale = render.machineScale || 1;
  c.scale(scale, scale);
  if (s.sensor) {
    const age = Number.isFinite(render.struckAt)
      ? Math.max(0, (timestamp - render.struckAt) / 16.67)
      : Infinity;
    target(c, s, age !== Infinity, age, render.noteIndex || 0, render.noteCount || 1);
  } else if (s.r) {
    wheel(c, s.r, s.kind === 'marble');
  } else if (s.kind === 'tile' || s.kind === 'weight') {
    body(c, { shape: s, body: { position: { x: 0, y: 0 }, angle: 0 } }, null);
  } else beam(c, s);
  c.restore();
}

export function snapshot(run) {
  return {
    tick: run.tick,
    hits: [...run.hits],
    poses: run.items.map(({ body }) => [body.position.x, body.position.y, body.angle]),
  };
}

// Build a display-only view. Scrubbing never rewinds the live Matter world.
export function atFrame(run, sample) {
  const items = run.items.map((item, i) => {
    const [x, y, angle] = sample.poses[i];
    return { shape: item.shape, body: { position: { x, y }, angle } };
  });
  return {
    items,
    ball: items.find((i) => i.shape.kind === 'marble').body,
    goals: items.filter((i) => i.shape.sensor),
    tick: sample.tick,
    hits: sample.hits,
  };
}
