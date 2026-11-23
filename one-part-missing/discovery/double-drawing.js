import { draw, atFrame } from '../drawing.js';
import { position, actorNames, tolerance } from './double-rigs.js';

const color = (kind) => (kind === 'cargo' ? '#93d7ff' : kind === 'weight' ? '#d9b3ef' : '#ffc857');
const actorMark = (ctx, x, y, kind, r) => {
  ctx.beginPath();
  if (kind === 'weight') ctx.rect(x - r, y - r, 2 * r, 2 * r);
  else if (kind === 'cargo') {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
  } else ctx.arc(x, y, r, 0, Math.PI * 2);
};
function path(ctx, tape, kind, t, ghost) {
  ctx.setLineDash(ghost ? [6, 5] : []);
  ctx.strokeStyle = ghost ? '#bfcfd4' : color(kind);
  ctx.lineWidth = ghost ? 2 : 2.5;
  const start = Math.max(0, t - 50);
  ctx.beginPath();
  for (let i = start; i <= t; i++) {
    const [x, y] = position(tape, kind, i);
    if (i === start) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  if (ghost || kind === 'rim') {
    const [x, y] = position(tape, kind, t);
    actorMark(ctx, x, y, kind, ghost ? 10 : 4);
    ctx.stroke();
  }
}
export function drawDouble(ctx, rig, tape, t, previous = null) {
  const sample = tape.frames[Math.min(t, tape.frames.length - 1)];
  draw(ctx, atFrame(tape.run, sample));
  ctx.save();
  ctx.setTransform(ctx.canvas.width / 720, 0, 0, ctx.canvas.height / 400, 0, 0);
  for (const kind of new Set(rig.shots.map((s) => s.kind))) {
    path(ctx, tape, kind, t, false);
    if (previous) path(ctx, previous, kind, Math.min(t, previous.frames.length - 1), true);
  }
  ctx.setLineDash([]);
  for (const { shape: s } of tape.run.items.filter(
    (it) => it.shape.kind === 'switch' && ['A', 'B'].includes(it.shape.link),
  )) {
    ctx.fillStyle = '#dffcff';
    ctx.font = 'bold 19px monospace';
    ctx.fillText(s.link, s.x + 24, s.y + 6);
  }
  for (const [i, s] of rig.shots.entries()) {
    ctx.strokeStyle = color(s.kind);
    ctx.lineWidth = t === s.tick ? 4 : 2;
    ctx.setLineDash(t === s.tick ? [] : [6, 4]);
    actorMark(ctx, s.x, s.y, s.kind, tolerance + 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#101820';
    ctx.fillRect(s.x + 12, s.y - 32, 20, 19);
    ctx.strokeRect(s.x + 12, s.y - 32, 20, 19);
    ctx.fillStyle = color(s.kind);
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(String(i + 1), s.x + 22, s.y - 18);
  }
  ctx.restore();
}
export function reading(s, r) {
  if (r.hit) return actorNames[s.kind] + ' in frame';
  if (!r.reached) return actorNames[s.kind] + ' left the bench before the shutter';
  const along = Math.abs(r.dx) >= Math.abs(r.dy);
  return (
    Math.round(Math.abs(along ? r.dx : r.dy)) +
    ' units ' +
    (along ? (r.dx < 0 ? 'left of' : 'right of') : r.dy < 0 ? 'above' : 'below') +
    ' center'
  );
}
