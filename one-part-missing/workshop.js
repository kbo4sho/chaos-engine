import { readDesign, proveDesign } from './blueprints.js';
import { openTicket, readTicket, printTools } from './tool-press.js';
// Generate a complete delivery line, remove a working part, then test the
// incomplete machine and candidate repairs in the very same engine as play.
import { machines, createRun, advance, trial } from './machines.js';

import { campaignById } from './campaign.js';

import { certify, offsets } from './certify.js';
export { certify } from './certify.js';

function randomStream(seed) {
  let v = seed >>> 0;
  return () => {
    v = (Math.imul(v, 1664525) + 1013904223) >>> 0;
    return v / 4294967296;
  };
}

export function generate(M, seed) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Invalid workshop number');
  const random = randomStream(seed);
  const range = (min, max) => Math.round(min + (max - min) * random());
  for (let attempt = 0; attempt < 32; attempt++) {
    const type = ['bridge', 'chute', 'bumper'][range(0, 2)];
    const x = range(133, 195),
      y = range(107, 150),
      w = range(174, 250),
      a = range(16, 34) / 100;
    const first = { kind: 'rail', x, y, w, h: 12, a };
    const ball = {
      kind: 'marble',
      x: x - w / 2 + range(11, 36),
      y: y - (w * a) / 2 - range(27, 43),
      r: 12,
      vx: range(16, 31) / 10,
    };
    const correct = { x: x + w / 2 + range(24, 61), y: y + (w * a) / 2 + range(48, 93) };
    const decoy = { x: correct.x + range(50, 138), y: correct.y + range(65, 93) };
    const sockets = random() < 0.5 ? [correct, decoy] : [decoy, correct];
    const tray = ['bumper', 'chute', 'bridge'];
    for (let i = tray.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [tray[i], tray[j]] = [tray[j], tray[i]];
    }
    const goalKind = ['bell', 'flag', 'chime'][range(0, 2)];
    const machine = {
      id: 'press-1-' + seed,
      title: 'Workshop No. ' + seed,
      field: 'Machine press',
      goal: {
        bell: 'Ring the brass bell.',
        flag: 'Raise the signal flag.',
        chime: 'Strike the suspended chime.',
      }[goalKind],
      success: { bell: 'The bell rang.', flag: 'Flag raised.', chime: 'The chime sounded.' }[goalKind],
      ball,
      fixtures: [first],
      tray,
      sockets,
      goals: [{ kind: goalKind, x: 900, y: 900, w: 44, h: 46, sensor: true }],
    };
    const intended = { part: type, socket: sockets.indexOf(correct) };
    const run = createRun(M, machine, intended);
    const candidates = [];
    while (run.state === 'running') {
      advance(M, run);
      const p = run.ball.position;
      if (
        run.tick % 5 === 0 &&
        p.y > 50 &&
        p.y < 330 &&
        p.x > 48 &&
        p.x < 670 &&
        Math.hypot(p.x - correct.x, p.y - correct.y) > 80 &&
        run.tick > 90 &&
        (type === 'chute' ? p.y > correct.y + 18 : p.x > correct.x + 60)
      )
        candidates.push({ ...p });
    }
    // Use late travel for the destination, after the marble has cleared the repair.
    for (const point of candidates
      .reverse()
      .filter((_, i) => i % 3 === 0)
      .slice(0, 5)) {
      Object.assign(machine.goals[0], { x: Math.round(point.x), y: Math.round(point.y) });
      if (!offsets.every((n) => trial(M, machine, intended, n).state === 'won')) continue;
      const verified = certify(M, machine);
      if (verified) return { ...machine, verifiedRepairs: verified.length };
    }
  }
  // A deterministic conservative geometry for rare seeds whose experiments all miss.
  // It varies both the launch and the fittings, and passes the same certification.
  const template = machines[0];
  const shift = (seed % 23) - 11;
  const translate = (v) => ({ ...v, x: v.x + shift });
  const fallback = {
    ...template,
    id: 'press-1-' + seed,
    title: 'Workshop No. ' + seed,
    description: template.description,
    fixtures: template.fixtures.map(translate),
    ball: translate(template.ball),
    goals: template.goals.map(translate),
    sockets: template.sockets.map(translate),
  };
  const verified = certify(M, fallback);
  if (!verified) throw new Error('The machine did not pass its trials');
  return { ...fallback, verifiedRepairs: verified.length };
}

function resolveBase(M, id) {
  const authored = campaignById.get(id);
  if (authored) return authored;
  const ticket = readTicket(id);
  if (ticket) return openTicket(M, ticket);
  const match = /^press-1-(0|[1-9]\d{0,9})$/.exec(id);
  return match && Number(match[1]) <= 0xffffffff ? generate(M, Number(match[1])) : null;
}

const ID_PATTERN = /^([a-z][a-z0-9-]*)(?:~(-?[0-8])\.(-?[0-8]))?$/;

// Offsets are encoded as eight-pixel notches relative to the original print.
// A second edit always revises those same offsets, so links never accumulate edits.
export function decodePrint(id) {
  if (readDesign(id)) return { base: id, x: 0, y: 0 };
  const match = ID_PATTERN.exec(id);
  if (!match) return null;
  const base = match[1],
    classic = /^press-1-(0|[1-9]\d{0,9})$/.exec(base);
  if (!campaignById.has(base) && !(classic && Number(classic[1]) <= 0xffffffff) && !readTicket(base))
    return null;
  const x = Number(match[2] || 0),
    y = Number(match[3] || 0);
  if (match[2] && ((!x && !y) || match[2] !== String(x) || match[3] !== String(y))) return null;
  return { base: match[1], x, y };
}

export function tuneTarget(machine, x, y) {
  if (![x, y].every((n) => Number.isInteger(n) && Math.abs(n) <= 8))
    throw new Error('Invalid target position');
  if (!x && !y) return machine;
  const goals = machine.goals.map((g) => ({ ...g }));
  const last = goals.at(-1);
  last.x += 8 * x;
  last.y += 8 * y;
  return {
    ...machine,
    id: machine.id + '~' + x + '.' + y,
    title: machine.title + ' · remix',
    goals,
    description:
      'The final target has been moved. ' +
      (machine.capacity === 2 ? 'Fit two parts' : 'Fit a part') +
      ' to reach its new position.',
  };
}

export function proveTarget(M, draft) {
  const last = draft.goals.at(-1);
  if (
    last.x - last.w / 2 < 10 ||
    last.x + last.w / 2 > 710 ||
    last.y - last.h / 2 < 14 ||
    last.y + last.h / 2 > 371
  )
    return { reason: 'The target extends off the bench. Slide it back into view.' };
  if (!offsets.every((n) => trial(M, draft, null, n).state === 'miss'))
    return { reason: 'The empty machine already reaches the target. Try a different position.' };
  const repairs = certify(M, draft);
  if (!repairs)
    return {
      reason:
        'No fitting reached that target at all three release points. Try moving it closer to the track.',
    };
  return { machine: { ...draft, verifiedRepairs: repairs.length } };
}

export function resolveMachine(M, id) {
  const design = readDesign(id);
  if (design) return proveDesign(M, design).machine || null;
  const code = decodePrint(id);
  if (!code) return null;
  const base = resolveBase(M, code.base);
  if (!base || (!code.x && !code.y)) return base;
  return proveTarget(M, tuneTarget(base, code.x, code.y)).machine || null;
}

export function pressRequest(M, request) {
  if (request.design) {
    const d = readDesign(request.design);
    return d ? proveDesign(M, d) : { reason: 'Invalid design drawing.' };
  }
  if (request.press) return printTools(M, request.press);
  if (request.draft) return proveTarget(M, request.draft);
  return resolveMachine(M, request.id);
}
