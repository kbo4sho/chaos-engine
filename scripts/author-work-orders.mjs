// Trace every one- and two-fitting setup on a reference machine. Keep new deliveries
// where a single spare works, and engaging a second spare saves measurable simulation time.
import fs from 'node:fs';
import M from 'matter-js';
import { orderBoard } from '../one-part-missing/order-board.js';
import { campaign } from '../one-part-missing/campaign.js';
import { createRun, advance, fittings } from '../one-part-missing/machines.js';
import { possibilities } from '../one-part-missing/certify.js';
const offsets = [-3, -2, -1, 0, 1, 2, 3];
function travel(m, fit) {
  const run = createRun(M, m, fit);
  const cargo = m.goals.at(-1).striker === 'cargo',
    actor = cargo ? run.cargo : run.ball;
  const path = [];
  while (run.state === 'running') {
    advance(M, run);
    const { x, y } = actor.position;
    if (x >= 20 && x <= 700 && y >= 30 && y <= 362) path.push([x, y, run.tick]);
  }
  const tools = run.items
    .map((it, i) => (it.shape.fitted ? run.uses.find((u) => u.item === i)?.tick : null))
    .filter((t) => t !== null);
  return { path, tools, ready: tools.includes(undefined) ? Infinity : Math.max(0, ...tools) };
}
function actual(m, fit, offset) {
  const r = createRun(M, m, fit, offset);
  while (r.state === 'running') advance(M, r);
  return {
    tick: r.state === 'won' ? r.tick : 0,
    active: r.items.every((it, i) => !it.shape.fitted || r.uses.some((u) => u.item === i)),
  };
}
function build(n) {
  const source = campaign[n - 1];
  if (
    !source ||
    !['cargo', 'marble'].includes(source.goals.at(-1).striker || source.striker || 'marble')
  )
    return [];
  const tray = source.tray.slice(0, 4);
  // A remounted field offers a new downstream choice on the same physical bench.
  if (tray.length < 4 && !source.transmission) {
    const options = ['magnet', 'trampoline', 'fan', 'repulsor', 'conveyor', 'bumper'];
    for (const part of options.slice(n % 3).concat(options))
      if (!tray.includes(part)) {
        tray.push(part);
        if (tray.length >= Math.min(4, source.tray.length + 2)) break;
      }
  }
  const entry = { x: 2100, y: 1200, w: 20, h: 24, tray };
  const m = orderBoard(source, entry);
  const movements = [null, ...possibilities({ ...m, capacity: 1 }), ...possibilities(m)];
  const grid = new Map();
  const quantum = 8;
  for (const [i, fit] of movements.entries()) {
    const { path, ready } = travel(m, fit);
    const first = new Map();
    for (const [x, y, t] of path) {
      for (const sx of [Math.floor(x / quantum), Math.ceil(x / quantum)])
        for (const sy of [Math.floor(y / quantum), Math.ceil(y / quantum)]) {
          const k = sx + 100 * sy;
          if (first.has(k)) continue;
          first.set(k, t);
        }
    }
    for (const [k, t] of first) {
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push({ i, t, active: ready <= t });
    }
  }
  const rankings = [];
  for (const [k, hits] of grid) {
    if (hits.some((v) => v.i === 0)) continue;
    const x = (k % 100) * quantum,
      y = Math.floor(k / 100) * quantum;
    if (
      x < 34 ||
      x > 686 ||
      y < 43 ||
      y > 352 ||
      m.sockets.some((s) => Math.hypot(s.x - x, s.y - y) < 48) ||
      Math.hypot(source.goals.at(-1).x - x, source.goals.at(-1).y - y) < 29
    )
      continue;
    const singles = hits.filter((v) => !movements[v.i].second && v.active).sort((a, b) => a.t - b.t);
    const pairs = hits.filter((v) => movements[v.i].second && v.active).sort((a, b) => a.t - b.t);
    if (!singles.length || !pairs.length || pairs[0].t < 28 || singles[0].t - pairs[0].t < 10) continue;
    rankings.push({ x, y, d: singles[0].t - pairs[0].t, s: singles[0].i, p: pairs[0].i });
  }
  rankings.sort((a, b) => b.d - a.d);
  const good = [],
    used = [];
  for (const cand of rankings) {
    if (used.some(({ x, y }) => Math.hypot(cand.x - x, cand.y - y) < 17)) continue;
    used.push(cand);
    if (used.length > 45) break;
    const spec = { ...entry, x: cand.x, y: cand.y },
      board = orderBoard(source, spec);
    if (offsets.some((delta) => actual(board, null, delta).tick)) continue;
    const center = movements
      .slice(1)
      .map((fit) => ({ fit, ...actual(board, fit, 0) }))
      .filter((s) => s.tick);
    const singles = center.filter((s) => !s.fit.second).sort((a, b) => a.tick - b.tick);
    const fast = center.filter((s) => s.fit.second && s.active).sort((a, b) => a.tick - b.tick);
    if (!singles.length || !fast.length || !singles[0].active || singles[0].tick - fast[0].tick < 9)
      continue;
    const slow = singles[0],
      quick = fast[0];
    if (quick.tick < 24 || center.some((t) => !t.active && t.tick < quick.tick)) continue;
    const robust = offsets.every((o) => {
      const a = actual(board, slow.fit, o),
        b = actual(board, quick.fit, o);
      return a.tick && b.tick && a.active && b.active && a.tick - b.tick >= 5;
    });
    if (!robust) continue;
    const keys = fittings(board, quick.fit).map((f) => f.part);
    good.push({ n, spec, slow, quick, keys, count: center.length });
    if (good.length >= 2) break;
  }
  return good;
}
if (process.argv[2]) {
  const [from, to] = process.argv.slice(2, 4).map(Number),
    dir = process.argv[4] || '/tmp/chaos-order-drafts';
  fs.mkdirSync(dir, { recursive: true });
  for (let n = from; n <= to; n++) {
    const result = build(n);
    fs.writeFileSync(dir + '/' + n + '.json', JSON.stringify(result));
    if (result.length)
      console.log(
        n,
        result.map((g) => [g.keys, g.slow.tick - g.quick.tick]),
      );
  }
}
