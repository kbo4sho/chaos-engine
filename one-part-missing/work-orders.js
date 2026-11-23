import { campaign, campaignById } from './campaign.js';
import { orderBoard } from './order-board.js';
import { orderPlans } from './order-plans.js';
import { fittings, packFittings, validMove, LIMIT } from './machines.js';

export const orderGroups = ['First bids', 'Flight and signals', 'Under tension', 'Power and dispatch'];
export const orders = orderPlans.map(([n, title, hint, spec], i) => {
  const source = campaign[n - 1],
    machine = orderBoard(source, spec);
  const actor = machine.goals[0].striker === 'cargo' ? 'blue parcel' : 'gold marble';
  return {
    ...machine,
    id: 'order-' + title.toLowerCase().replaceAll(' ', '-'),
    title,
    orderIndex: i,
    lesson: hint,
    goal: 'Deliver the ' + actor + ' with one or two spares.',
    description:
      'Find a one-part delivery, then race it with two working fittings. Both personal records are kept.',
    success: 'Delivery accepted.',
  };
});
export const orderById = new Map(orders.map((m) => [m.id, m]));
export function fitCode(m, move) {
  if (!validMove(m, move)) return null;
  return fittings(m, move)
    .map((f) => String.fromCharCode(97 + f.socket) + '-' + f.part)
    .join('.');
}
export function decodeFitting(m, code) {
  if (typeof code !== 'string' || code.length > 48) return null;
  const placements = [];
  for (const token of code.split('.')) {
    const match = /^([a-d])-([a-z]+)$/.exec(token);
    if (!match) return null;
    placements.push({ socket: match[1].charCodeAt(0) - 97, part: match[2] });
  }
  if (placements.length > (m.capacity || 1)) return null;
  const move = packFittings(placements);
  return fitCode(m, move) === code ? move : null;
}
export function readOrderLink(id) {
  const [base, code, ...rest] = id.split('/build/');
  const assembly = code !== undefined ? campaignById.get(base) : null;
  const m = orderById.get(base) || ((assembly?.capacity === 3 || assembly?.grand) && assembly);
  if (!m || rest.length) return null;
  if (code === undefined) return { machine: m, move: null };
  const move = decodeFitting(m, code);
  return move ? { machine: m, move } : null;
}
export const orderPrefix = 'chaos.one-part-missing.order.';
export function orderLog(getStorage) {
  const memory = new Map();
  const keyFor = (m) => orderPrefix + m.id + '/';
  function read(m) {
    const rows = new Map();
    const prefix = keyFor(m);
    const add = (k, v) => {
      if (!k?.startsWith(prefix)) return;
      const code = k.slice(prefix.length),
        move = decodeFitting(m, code),
        tick = Number(v);
      if (!move || !Number.isSafeInteger(tick) || tick < 1 || tick > LIMIT) return;
      if (!rows.has(code) || tick < rows.get(code).tick)
        rows.set(code, { move, code, tick, count: move.second ? 2 : 1 });
    };
    try {
      const s = getStorage();
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith(prefix)) add(k, s.getItem(k));
      }
    } catch {}
    for (const [k, v] of memory) add(k, v);
    return [...rows.values()];
  }
  function save(m, move, tick) {
    const code = fitCode(m, move);
    if (!code || !Number.isSafeInteger(tick) || tick < 1 || tick > LIMIT) return;
    const k = keyFor(m) + code,
      old = read(m).find((r) => r.code === code);
    const best = Math.min(tick, old?.tick ?? tick);
    memory.set(k, best);
    try {
      getStorage().setItem(k, String(best));
      memory.delete(k);
    } catch {}
  }
  function records(m) {
    const rows = read(m);
    return {
      economy: rows.toSorted(
        (a, b) => a.count - b.count || a.tick - b.tick || a.code.localeCompare(b.code),
      )[0],
      speed: rows.toSorted(
        (a, b) => a.tick - b.tick || a.count - b.count || a.code.localeCompare(b.code),
      )[0],
    };
  }
  return { save, records };
}
