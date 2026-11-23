import { receiverOpen } from './transmissions.js';
const colors = {
  motor: '#f6b2d1',
  gearbox: '#f5c273',
  clutch: '#a9dbe4',
  torsion: '#c3adf1',
  ratchet: '#efcf7e',
  rack: '#87d6c6',
};
function line(c, a, b, color, w = 1) {
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.stroke();
}
function circle(c, x, y, r, fill, stroke = '#839daa', w = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = stroke;
  c.lineWidth = w;
  c.stroke();
}
function cog(c, x, y, r, angle, color) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = '#1c313e';
  c.strokeStyle = color;
  c.lineWidth = 1.6;
  c.beginPath();
  for (let i = 0; i < 40; i++) {
    const t = (i * Math.PI) / 20,
      size = i % 4 === 1 || i % 4 === 2 ? r : r * 0.83;
    if (!i) c.moveTo(size, 0);
    else c.lineTo(Math.cos(t) * size, Math.sin(t) * size);
  }
  c.closePath();
  c.fill();
  c.stroke();
  circle(c, 0, 0, r * 0.42, '#12232c', color);
  line(c, { x: 0, y: 0 }, { x: r * 0.74, y: 0 }, color, 2);
  c.restore();
}
export function flywheel(c, s) {
  const r = s.r,
    gold = s.kind === 'marble',
    rim = gold ? '#ffcd78' : '#91d1dc';
  circle(c, 0, 0, r, gold ? '#77543a' : '#34515e', rim, 2.5);
  circle(c, 0, 0, r * 0.8, '#142732', rim);
  for (let i = 0; i < 6; i++) {
    c.save();
    c.rotate((i * Math.PI) / 3);
    line(c, { x: r * 0.22, y: 0 }, { x: r * 0.77, y: 0 }, rim, 3);
    if (!i) circle(c, r * 0.72, 0, 2, '#fff1ce');
    c.restore();
  }
  circle(c, 0, 0, r * 0.21, '#475d63', rim);
  line(c, { x: -3, y: 2 }, { x: 3, y: -2 }, rim);
}
export function drawTrack(c, shape, p) {
  if (shape.guide) {
    const [a, b] = shape.guide,
      y = shape.y + 12;
    for (const d of [1, 6]) line(c, { x: a, y: y + d }, { x: b, y: y + d }, '#497381', 2);
    for (let x = a; x <= b; x += 13) line(c, { x, y: y + 1 }, { x: x - 3, y: y + 6 }, '#859f9e');
    for (const x of [a, b]) line(c, { x, y: y - 8 }, { x, y: y + 9 }, '#97b8b8', 3);
  }
  if (shape.axle && !shape.flywheel) {
    const [x, y] = shape.axle;
    line(c, { x, y }, p, '#2c4757', 8);
    line(c, { x, y }, p, '#9ab5bd', 1.5);
    circle(c, x, y, 7, '#263d4a', '#a2bec8', 2);
    circle(c, x, y, 2, '#10202a', '#648592');
  }
}
function symbol(c, kind, x, y, a, b, dir, active) {
  const col = active ? '#fff1bd' : colors[kind];
  c.save();
  c.translate(x, y);
  c.strokeStyle = col;
  c.lineWidth = 1.7;
  c.fillStyle = '#19313d';
  if (kind === 'gearbox') {
    cog(c, -5, -1, 9, a, col);
    cog(c, 8, 3, 7, b, col);
  } else if (kind === 'clutch') {
    c.fillRect(-13, -7, 26, 14);
    c.strokeRect(-13, -7, 26, 14);
    for (const d of [-7, -3, 3, 7]) line(c, { x: d, y: -6 }, { x: d, y: 6 }, col, 1.6);
  } else if (kind === 'torsion') {
    c.beginPath();
    for (let i = 0; i < 54; i++) {
      const t = i / 53,
        phase = t * Math.PI * 4 + Math.min(2, Math.max(-2, b - a)),
        r = 2 + 9 * t;
      const x = Math.cos(phase) * r,
        y = Math.sin(phase) * r;
      if (!i) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  } else if (kind === 'motor') {
    c.fillRect(-12, -9, 24, 18);
    c.strokeRect(-12, -9, 24, 18);
    c.beginPath();
    c.moveTo(-7, 5);
    c.lineTo(-7, -5);
    c.lineTo(0, 1);
    c.lineTo(7, -5);
    c.lineTo(7, 5);
    c.stroke();
  } else if (kind === 'ratchet') {
    cog(c, 0, 0, 9, a, col);
    c.beginPath();
    c.moveTo(13 * dir, -10);
    c.lineTo(6 * dir, -8);
    c.lineTo(11 * dir, -2);
    c.closePath();
    c.fill();
    c.stroke();
  } else {
    cog(c, -2, -4, 8, a, col);
    line(c, { x: -14, y: 7 }, { x: 14, y: 7 }, col, 2);
    for (let j = -12; j < 14; j += 5) line(c, { x: j, y: 7 }, { x: j + 1, y: 3 }, col, 1.4);
  }
  c.restore();
}
function connection(c, s, marker, a, b, active) {
  c.save();
  c.setLineDash([3, 4]);
  line(c, a.position, marker, '#587883', 1.5);
  if (!['motor', 'ratchet'].includes(s.kind)) line(c, marker, b.position, '#587883', 1.5);
  c.setLineDash([]);
  symbol(c, s.kind, marker.x, marker.y, a.angle, b.angle, s.dir || 1, active);
  c.restore();
}
export function drawDriveBench(c, items, uses, tick) {
  if (!items.some((i) => i.shape.flywheel)) return;
  const nodes = new Map(items.filter((it) => it.shape.node).map((it) => [it.shape.node, it.body]));
  for (const [i, it] of items.entries()) {
    const s = it.shape;
    drawTrack(c, s, it.body.position);
    if (!s.drive) continue;
    const a = nodes.get(s.from),
      b = nodes.get(s.to);
    if (a && b)
      connection(
        c,
        s,
        it.body.position,
        a,
        b,
        uses.some((u) => u.item === i && tick - u.tick < 16),
      );
  }
}
export function driveConnection(c, link) {
  if (link.drive) {
    const s = link.driveMarker.render.machineShape;
    connection(c, s, link.driveMarker.position, link.bodyA, link.bodyB, link.drive.active);
  } else if (link.bodyB?.render.machineShape)
    drawTrack(c, link.bodyB.render.machineShape, link.bodyB.position);
}
export function receiverDial(c, s, tick) {
  if (!s.window && !s.turn && !s.travel) return;
  const y = -s.h * 0.7 - 24,
    open = receiverOpen(s, tick),
    col = open ? '#88e4a5' : '#e1b662';
  const label =
    (s.window ? (open ? 'OPEN' : 'WAIT') : '') +
    (s.turn ? (s.turn > 0 ? ' ↻' : ' ↺') : s.travel ? (s.travel > 0 ? ' →' : ' ←') : '');
  c.save();
  c.font = 'bold 13px ui-monospace,monospace';
  const w = c.measureText(label.trim()).width + 12;
  c.fillStyle = '#0b1922';
  c.fillRect(-w / 2, y - 10, w, 18);
  c.strokeStyle = col;
  c.lineWidth = 1;
  c.strokeRect(-w / 2, y - 10, w, 18);
  c.textAlign = 'center';
  c.fillStyle = col;
  c.fillText(label.trim(), 0, y + 3);
  c.restore();
}
export const driveIcons = {
  motor:
    '<rect x="13" y="9" width="34" height="23" rx="2"/><path d="M19 27V14l10 9 10-9v13M7 16h6m34 1h7m-35 16v3m20-3v3"/>',
  gearbox:
    '<circle cx="22" cy="18" r="11" stroke-dasharray="3 1"/><circle cx="40" cy="24" r="8" stroke-dasharray="3 1"/><path d="M22 18l8-5m10 11 4 4"/><circle cx="22" cy="18" r="3"/>',
  clutch: '<path d="M4 20h12m28 0h11M14 10h12v20H14zm20 0h12v20H34zm-9 4h5v12h-5m9-12h-3v12h3"/>',
  torsion: '<path d="M6 27h13c15 14 32-4 22-17-8-11-25-2-20 9 4 10 17 5 15-2-2-6-9-4-9 0m13-7h12"/>',
  ratchet:
    '<circle cx="25" cy="22" r="12" stroke-dasharray="3 2"/><circle cx="25" cy="22" r="4"/><path d="m46 5-15 7 9 3zm-3 3 9 15"/>',
  rack: '<circle cx="28" cy="14" r="9" stroke-dasharray="3 2"/><path d="M7 29h47v4H7zm3 0v-6h4v6m5 0v-6h4v6m5 0v-6h4v6m5 0v-6h4v6m5 0v-6h4v6"/>',
};
