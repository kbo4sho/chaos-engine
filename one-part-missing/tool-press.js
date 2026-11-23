import { reserves } from './press-reserves.js';
import { campaign } from './campaign.js';
import { parts, createRun, advance, trial, canFlip } from './machines.js';
import { transmissions } from './transmissions.js';
import { links } from './rigging.js';
import { instruments } from './devices.js';
import { certify } from './certify.js';
import { plates } from './press-catalog.js';

const plateByNumber = new Map(plates.map((row) => [row[0], row]));
export const styles = {
  chain: 'Chain reaction',
  parcel: 'Parcel delivery',
  direct: 'Single tool',
  rig: 'Cable rig',
  drive: 'Drive train',
  sort: 'Sorting line',
  any: 'Any machine',
};
const maxSeed = 0xffffffff,
  maxPass = 15;
const packet = /^press-2-([0-9a-z]{1,2})-([0-9a-z]{1,7})-([0-9a-z])-([0-9a-z]{1,2})-([0-9a-z]{1,2})$/;
const base36 = (n) => n.toString(36);
function idFor({ plate, seed, pass, x, y }) {
  return 'press-2-' + [plate, seed, pass, x, y].map(base36).join('-');
}
export function readTicket(id) {
  const match = packet.exec(id);
  if (!match) return null;
  const [plate, seed, pass, x, y] = match.slice(1).map((s) => Number.parseInt(s, 36));
  const ticket = { plate, seed, pass, x, y };
  return plate >= 1 &&
    plateByNumber.has(plate) &&
    seed <= maxSeed &&
    pass <= maxPass &&
    x >= 25 &&
    x <= 695 &&
    y >= 32 &&
    y <= 360 &&
    idFor(ticket) === id
    ? ticket
    : null;
}
const reservePlates = new Set(reserves.map((id) => readTicket(id).plate));
function randomStream(seed) {
  let state = seed >>> 0;
  const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  return { next, integer: (a, b) => Math.floor(a + (b - a + 1) * next()) };
}
function shuffled(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.integer(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function availableTools(style, withTool = 'any') {
  const stocked = plates.filter(([n]) => reservePlates.has(n));
  const tags = new Set(
    stocked
      .filter(
        ([, form, ...tags]) =>
          (style === 'any' || style === form) && (withTool === 'any' || tags.includes(withTool)),
      )
      .flatMap((row) => row.slice(2)),
  );
  return Object.keys(parts)
    .filter((k) => tags.has(k) && k !== withTool)
    .sort((a, b) => parts[a].name.localeCompare(parts[b].name, 'en'));
}

function arrange({ plate, seed, pass }) {
  const source = campaign[plate - 1],
    rng = randomStream(seed ^ Math.imul(pass + 1, 0x9e3779b9) ^ Math.imul(plate, 0x85ebca6b));
  const gentle = pass === maxPass;
  const reflect = !gentle && rng.next() < 0.5 && !source.transmission;
  const dx = rng.integer(-9, 9),
    dy = rng.integer(-6, 6);
  const orient = (v) => (reflect ? -v : v);
  const shift = (s) => {
    const moved = { ...s, x: (reflect ? 720 - s.x : s.x) + dx, y: s.y + dy };
    if (s.kind === 'cargo' && s.vx) moved.vx = orient(s.vx);
    if (s.axle) moved.axle = [s.axle[0] + dx, s.axle[1] + dy];
    if (s.guide) moved.guide = s.guide.map((x) => x + dx);
    if (s.a) moved.a = orient(s.a);
    if (s.dir || instruments[s.kind]) moved.dir = orient(s.dir || 1);
    return moved;
  };
  const fixtures = source.fixtures.map((s) => {
    const moved = shift(s);
    if (!gentle && instruments[s.kind] && s.kind !== 'hatch') {
      moved.x += rng.integer(-11, 11);
      moved.y += rng.integer(-7, 7);
    }
    return moved;
  });
  const mounts = shuffled(
    source.sockets.map((s, i) => {
      const socket = shift(s);
      socket.dir = orient(s.dir || 1);
      if (reflect) socket.mirror = true;
      if (!gentle) {
        socket.x += rng.integer(-19, 19);
        socket.y += rng.integer(-13, 13);
      }
      return { i, socket };
    }),
    rng,
  );
  const ball = shift(source.ball);
  ball.vx = orient(source.ball.vx || 0);
  if (!gentle) {
    ball.x += rng.integer(-9, 9);
    ball.y += rng.integer(-7, 7);
    if (ball.vx) ball.vx *= rng.integer(85, 118) / 100;
  }
  if (source.ball.flywheel) {
    ball.axle = [ball.x, ball.y];
    if (!gentle && ball.spin) ball.spin *= rng.integer(94, 106) / 100;
  }
  const goals = source.goals.map(shift);
  const machine = {
    ...source,
    id: 'pending',
    title: source.title + ' · ' + base36(seed).toUpperCase(),
    lesson:
      source.rigging || source.transmission || source.sorting
        ? source.lesson
        : source.fixtures.some((s) => s.kind === 'cargo')
          ? 'Follow the gold marble to the switch, then trace the parcel from the hatch.'
          : 'Watch the empty run. Where would changing the path put the receiver within reach?',
    pressPlate: source.title,
    printStyle: plateByNumber.get(plate)[1],
    toolCourse: false,
    clockwork: false,
    description:
      'The release is on the ' +
      (ball.x < 360 ? 'left' : 'right') +
      '. Choose a fitting for one of the ' +
      mounts.length +
      ' mounting sockets.',
    ball,
    fixtures,
    sockets: mounts.map((s) => s.socket),
    tray: shuffled(source.tray, rng),
    goals,
  };
  return { machine, originalSockets: mounts.map((m) => m.i) };
}
function unpack(ticket) {
  const { machine } = arrange(ticket);
  const goal = machine.goals.at(-1);
  goal.x = ticket.x;
  goal.y = ticket.y;
  machine.id = idFor(ticket);
  return machine;
}
export function openTicket(M, ticket) {
  const machine = unpack(ticket);
  const solutions = certify(M, machine);
  return solutions?.length ? { ...machine, verifiedRepairs: solutions.length } : null;
}

function targetOptions(M, machine, move, gentle) {
  const last = machine.goals.at(-1),
    initial = { x: Math.round(last.x), y: Math.round(last.y) };
  if (gentle) return [initial];
  const originalGoals = machine.goals;
  const probe = { ...machine, goals: [...originalGoals.slice(0, -1), { ...last, x: 1050, y: 900 }] };
  const r = createRun(M, probe, move),
    striker = last.striker || machine.striker || 'marble';
  const candidates = [];
  while (r.state === 'running') {
    advance(M, r);
    if (r.tick % 4 || r.hits.length !== originalGoals.length - 1) continue;
    const actors = r.items.filter((it) => it.shape.kind === striker);
    for (const { body } of actors) {
      const { x, y } = body.position;
      const distance = Math.hypot(x - last.x, y - last.y);
      if (x < 40 || x > 680 || y < 46 || y > 330 || distance < 12 || distance > 92) continue;
      if (machine.sockets.some((s) => Math.hypot(x - s.x, y - s.y) < 40)) continue;
      if (candidates.some((p) => Math.hypot(p.x - x, p.y - y) < 16)) continue;
      candidates.push({ x: Math.round(x), y: Math.round(y) });
    }
  }
  return [...candidates.reverse().slice(0, 4), initial];
}
function provesFit(M, machine, move, requested) {
  if (![-3, -2, -1, 0, 1, 2, 3].every((offset) => trial(M, machine, move, offset).state === 'won'))
    return false;
  if ([-3, -1, 0, 1, 3].some((n) => trial(M, machine, null, n).state === 'won')) return false;
  if (
    machine.fixtures.some(
      (s) =>
        (Object.hasOwn(instruments, s.kind) || s.wire || s.drive) &&
        trial(
          M,
          {
            ...machine,
            fixtures: machine.fixtures.map((f) => (f === s ? { ...f, disabled: true } : f)),
          },
          move,
        ).state === 'won',
    )
  )
    return false;
  const sensitive =
    machine.goals.some((g) => (g.striker || machine.striker) === 'tile') || move.part === 'domino';
  if (sensitive) {
    for (const delta of [-0.015, 0.015])
      for (const n of [-3, -1.5, -1, 0, 1, 1.5, 3])
        if (
          trial(M, { ...machine, ball: { ...machine.ball, vx: machine.ball.vx + delta } }, move, n)
            .state !== 'won'
        )
          return false;
  }
  const r = createRun(M, machine, move);
  while (r.state === 'running') advance(M, r);
  const used = new Set(r.uses.map((u) => u.item));
  if (
    r.items.some(
      (it, i) =>
        (instruments[it.shape.kind] || links[it.shape.kind] || transmissions[it.shape.kind]) &&
        !used.has(i),
    )
  )
    return false;
  if (
    r.items.some(
      (it, i) =>
        it.shape.kind === 'breaklink' && !r.uses.some((u) => u.item === i && u.action === 'snapped'),
    )
  )
    return false;
  if (requested.some((k) => move.part !== k && !r.uses.some((u) => u.kind === k))) return false;
  const fits = certify(M, machine);
  if (fits?.length !== 1) return false;
  for (const part of machine.tray)
    for (let socket = 0; socket < machine.sockets.length; socket++)
      for (const flipped of canFlip(machine, part) ? [false, true] : [false]) {
        if (part === move.part && socket === move.socket && flipped === Boolean(move.flipped)) continue;
        if ([-2, 0, 2].some((n) => trial(M, machine, { part, socket, flipped }, n).state === 'won'))
          return false;
      }
  return true;
}

export function printTools(M, { style, focus, partner = 'any', seed }, allowReserve = true) {
  const requested = [focus, partner].filter((k) => k !== 'any');
  if (
    !Object.hasOwn(styles, style) ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > maxSeed ||
    requested.some((k) => !Object.hasOwn(parts, k)) ||
    (partner !== 'any' && partner === focus)
  )
    throw Error('Invalid press setting');
  const rng = randomStream(seed);
  const pool = shuffled(
    plates.filter(
      ([, kind, ...tags]) =>
        (style === 'any' || style === kind) && requested.every((k) => tags.includes(k)),
    ),
    rng,
  );
  const tested = new Map();
  function tryPlate(plate, pass) {
    if (!tested.has(plate)) tested.set(plate, certify(M, campaign[plate - 1])?.[0]);
    const baseline = tested.get(plate);
    if (!baseline) return null;
    const partial = { plate, seed, pass },
      { machine, originalSockets } = arrange(partial);
    const move = { ...baseline, socket: originalSockets.indexOf(baseline.socket) };
    const goal = machine.goals.at(-1),
      suggestions = targetOptions(M, machine, move, pass === maxPass);
    for (const { x, y } of suggestions) {
      if (x - goal.w / 2 < 10 || x + goal.w / 2 > 710 || y - goal.h / 2 < 10 || y + goal.h / 2 > 375)
        continue;
      goal.x = x;
      goal.y = y;
      if (!provesFit(M, machine, move, requested)) continue;
      machine.id = idFor({ ...partial, x, y });
      if (!readTicket(machine.id)) continue;
      machine.verifiedRepairs = 1;
      return machine;
    }
    return null;
  }
  for (let pass = 0; pool.length && pass < maxPass; pass++) {
    const result = tryPlate(pool[pass % pool.length][0], pass);
    if (result) return result;
  }
  for (const [plate] of pool.slice(0, 12)) {
    const result = tryPlate(plate, maxPass);
    if (result) return result;
  }
  if (allowReserve) {
    const allowed = new Set(pool.map(([n]) => n));
    const backups = shuffled(
      reserves.filter((id) => allowed.has(readTicket(id).plate)),
      rng,
    );
    for (const id of backups) {
      const m = openTicket(M, readTicket(id));
      if (m) return m;
    }
  }
  return null;
}
