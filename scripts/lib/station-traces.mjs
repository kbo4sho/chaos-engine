import M from 'matter-js';
import {parts,createRun} from '../../one-part-missing/machines.js';
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const inside = (p) => p.x > 39 && p.x < 681 && p.y > 34 && p.y < 352;
export const of = (kind, p) => ({ ...parts[kind].shape, ...p });
export const g = (p, striker, kind = 'flag') => ({
  kind,
  x: Math.round(p.x),
  y: Math.round(p.y),
  w: 24,
  h: 24,
  sensor: true,
  striker,
});
export function trace(board, actor, end = 190) {
  const r = createRun(M, board),
    load = actor === 'cargo' ? r.cargo : r.ball,
    points = [];
  for (let t = 0; t < end; t++) {
    points.push({ t, x: load.position.x, y: load.position.y, vx: load.velocity.x, vy: load.velocity.y });
    r.tick++;
    M.Engine.update(r.engine, 1000 / 60);
    if (
      t > 15 &&
      (load.position.x < -30 || load.position.x > 750 || load.position.y > 430 || load.position.y < -110)
    )
      break;
  }
  return { points, uses: r.uses };
}
