import { orderById } from './work-orders.js';
import { stamp, readStamp } from './fit-stamp.js';
import { trial } from './machines.js';

// The house times are reconstructed on the same machines as a player's runs.
// Only the last round has a fixed call time, in 1/60 s physics frames.
const program = [
  ['first-shift', 'First shift', 'first-bid', 'hanging-freight', 'reverse-shipment', '1.a~4p~46', 53],
  [
    'signal-box',
    'Signal box',
    'a-shorter-crossing',
    'signal-maintenance',
    'clutch-service',
    '9.5i~n~41.4a',
    51,
  ],
  [
    'spring-winding',
    'Spring winding',
    'two-ways-down',
    'return-spring',
    'wound-dispatch',
    'd.2~4u~4e',
    29,
  ],
  ['clearance', 'Clearance', 'across-the-gap', 'over-the-wheel', 'swing-clearance', '9.s~55~19.4q', 232],
  [
    'freight-yard',
    'Freight yard',
    'leave-the-slipway',
    'return-freight',
    'heavy-transfer',
    'h.w~5~56',
    47,
  ],
  [
    'last-pickup',
    'Last pickup',
    'the-long-way-home',
    'steady-load',
    'last-collection',
    'd.2~4q~51.5b',
    356,
  ],
  ['night-crane', 'Night crane', 'ring-service', 'night-shift', 'the-long-lift', 'q.7~9~4x', 26],
  [
    'dispatch-window',
    'Dispatch window',
    'express-transfer',
    'parcel-express',
    'dock-appointment',
    'm.3~1b~5d.52',
    143,
  ],
];
export const cards = program.map(([id, title, a, b, c, house, call]) => ({
  id,
  title,
  house,
  call,
  rounds: [a, b, c].map((slug) => orderById.get('order-' + slug)),
}));
export const ruleNames = ['Fewest parts', 'Fastest delivery', 'On the bell'];
const clock = (t) => (t / 60).toFixed(2) + ' s';
export function featuredCard(date = new Date()) {
  const day = Math.floor(date.getTime() / 86400000);
  return cards[((day % cards.length) + cards.length) % cards.length];
}
export function ruleText(card, round) {
  return [
    'Deliver with fewer parts. Faster delivery breaks a tie.',
    'Deliver sooner. Fewer parts break a tie.',
    'Deliver as close as possible to ' + clock(card.call) + '. Fewer parts break a tie.',
  ][round];
}
export function scoreLine(card, round, entry) {
  const count = entry.count + (entry.count === 1 ? ' part' : ' parts'),
    time = clock(entry.tick);
  if (round === 0) return count + ' · ' + time;
  if (round === 1) return time + ' · ' + count;
  const delta = entry.tick - card.call;
  return (
    (delta === 0 ? 'On the bell' : clock(Math.abs(delta)) + (delta < 0 ? ' early' : ' late')) +
    ' · ' +
    time +
    ' · ' +
    count
  );
}
export function compareScore(card, round, a, b) {
  if (round === 0) return a.count - b.count || a.tick - b.tick;
  if (round === 1) return a.tick - b.tick || a.count - b.count;
  return Math.abs(a.tick - card.call) - Math.abs(b.tick - card.call) || a.count - b.count;
}
export function matchRoute(card, round, host = 'house', reply = null) {
  return [
    'match',
    '1',
    card.id,
    String(round + 1),
    ...(host !== 'house' || reply ? [host] : []),
    ...(reply ? [reply] : []),
  ].join('/');
}
export function verifyEntry(M, m, code) {
  const move = readStamp(m, code);
  if (!move) return null;
  const run = trial(M, m, move);
  return run.state === 'won' ? { code, move, tick: run.tick, count: move.second ? 2 : 1 } : null;
}
export function readMatch(M, route) {
  if (typeof route !== 'string' || route.length > 130) return null;
  const [tag, v, id, round, host = 'house', reply, ...rest] = route.split('/');
  if (tag !== 'match' || v !== '1' || !['1', '2', '3'].includes(round) || rest.length) return null;
  const card = cards.find((c) => c.id === id);
  if (!card || !host || reply === '') return null;
  const decode = (codes) => {
    const tokens = codes.split('~');
    if (tokens.length !== 3) return null;
    const entries = tokens.map((code, i) => verifyEntry(M, card.rounds[i], code));
    return entries.every(Boolean) ? entries : null;
  };
  const opponent = decode(host === 'house' ? card.house : host);
  if (!opponent) return null;
  const returned = reply === undefined ? null : decode(reply);
  if (reply !== undefined && !returned) return null;
  return { card, round: Number(round) - 1, host, opponent, reply, returned };
}
export const matchPrefix = 'chaos.one-part-missing.match.v1.';
export function matchBook(getStorage, M) {
  const memory = new Set(),
    cache = new Map();
  const prefix = (match, round) => matchPrefix + match.card.id + '/' + match.host + '/' + round + '/';
  function best(match, round) {
    const key = prefix(match, round),
      codes = new Set();
    for (const k of memory) if (k.startsWith(key)) codes.add(k.slice(key.length));
    try {
      const store = getStorage();
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k?.startsWith(key)) codes.add(k.slice(key.length));
      }
    } catch {}
    let top = null;
    for (const code of codes) {
      const m = match.card.rounds[round],
        identity = m.id + '/' + code;
      if (!cache.has(identity)) {
        if (cache.size >= 160) cache.clear();
        cache.set(identity, verifyEntry(M, m, code));
      }
      const entry = cache.get(identity);
      if (!entry) continue;
      if (
        !top ||
        compareScore(match.card, round, entry, top) < 0 ||
        (!compareScore(match.card, round, entry, top) && entry.code < top.code)
      )
        top = entry;
    }
    return top;
  }
  function keep(match, move) {
    if (match.returned) return;
    const code = stamp(match.card.rounds[match.round], move);
    if (!code) return;
    const key = prefix(match, match.round) + code;
    try {
      getStorage().setItem(key, '1');
      memory.delete(key);
    } catch {
      memory.add(key);
    }
  }
  return { best, keep };
}

// A packed card can switch rounds and start a fresh attempt at the enclosed
// challenge. Hashes for other cards or challengers stay outside this file.
export function matchFileRoute(packed, hash) {
  const [kind, v, id, , host = 'house', reply] = packed.split('/');
  const [tag, version, card, round, rival = 'house', take, ...rest] = hash.split('/');
  const same =
    tag === kind && version === v && card === id && rival === host && (!take || take === reply);
  return same && !rest.length && ['1', '2', '3'].includes(round) ? hash : packed;
}
