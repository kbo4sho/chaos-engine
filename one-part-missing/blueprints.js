// Kit and option order are part of the version-one shared drawing format.
// Each kit is an authored, working repair whose stations can be rearranged.
import { campaignById } from './campaign.js';
import { parts, createRun, advance, trial } from './machines.js';
import { certify } from './certify.js';
import { snapshot } from './drawing.js';

const kits = [
  ['Air mail', 'tools-air-mail', 'fan', 1],
  ['Magnetic junction', 'tools-magnetic-junction', 'fan', 0],
  ['Parcel gatehouse', 'works-gatehouse-test', 'piston', 1],
  ['Cable exchange', 'rig-load-exchange', 'conveyor', 1],
  ['Shaft drive', 'drive-start-the-drive', 'motor', 0],
  ['Sorting depot', 'sort-dispatch-complete', 'zipline', 1],
];
const options = {
  conveyor: ['conveyor', 'trampoline', 'ice'],
  magnet: ['magnet', 'repulsor', 'fan'],
  fan: ['fan', 'magnet', 'repulsor'],
  trampoline: ['trampoline', 'conveyor', 'cam'],
  piston: ['piston', 'pinwheel', 'elevator'],
  switch: ['switch'],
  hatch: ['hatch'],
  pulley: ['pulley', 'tether', 'spring'],
  motor: ['motor', 'ratchet', 'clutch'],
  rack: ['rack', 'gearbox', 'torsion'],
  sieve: ['sieve', 'funnel', 'basket'],
  basket: ['basket', 'funnel', 'sieve'],
  zipline: ['zipline', 'ice', 'oneway'],
};
function socketParams(shape) {
  const p = { ...shape };
  // The drawer part supplies its own body and material. Sockets carry placements and connections.
  for (const key of ['kind', 'w', 'h', 'r', 'wire', 'drive', 'field', 'bounce', 'density', 'fitted'])
    delete p[key];
  return p;
}
export const designKits = kits.map(([name, id, part, socket]) => {
  const base = campaignById.get(id);
  const stations = base.fixtures.flatMap((s, i) =>
    options[s.kind]
      ? [{ kind: s.kind, options: options[s.kind], fixture: i, point: socketParams(s) }]
      : [],
  );
  stations.push({ kind: part, options: options[part], fixture: -1, point: { ...base.sockets[socket] } });
  return { name, base, stations, socket };
});
export const draftKey = 'chaos.one-part-missing.design-draft.v1';
export function freshDesign(kit = 0) {
  const k = designKits[kit];
  return {
    kit,
    missing: k.stations.length - 1,
    edits: k.stations.map(() => ({ type: 0, x: 0, y: 0, tune: 0 })),
    target: null,
  };
}
export function encodeDesign(d) {
  // A dot separates base-36 coordinates because x is itself a base-36 digit.
  const t = d.target ? d.target.map((n) => n.toString(36)).join('.') : 's';
  return [
    'design',
    '1',
    d.kit.toString(36),
    d.missing.toString(36),
    d.edits.map((e) => [e.type, e.x + 4, e.y + 4, e.tune + 2].join('')).join(''),
    t,
  ].join('-');
}
export function readDesign(id) {
  if (typeof id !== 'string' || id.length > 52) return null;
  const match = /^design-1-([0-9])-([0-9])-([0-9]+)-(s|[0-9a-z]{1,2}\.[0-9a-z]{1,2})$/.exec(id);
  if (!match) return null;
  const kit = Number(match[1]),
    missing = Number(match[2]),
    k = designKits[kit];
  if (!k || !k.stations[missing] || match[3].length !== k.stations.length * 4) return null;
  const edits = [];
  for (const [i, st] of k.stations.entries()) {
    const [type, h, v, g] = [...match[3].slice(i * 4, i * 4 + 4)].map(Number);
    if (!st.options[type] || h > 8 || v > 8 || g > 4) return null;
    const kind = st.options[type],
      linked = parts[kind].shape;
    if ((linked.drive || (linked.wire && kind !== 'pulley')) && (h !== 4 || v !== 4)) return null;
    if (!tuning(kind) && g !== 2) return null;
    edits.push({ type, x: h - 4, y: v - 4, tune: g - 2 });
  }
  const target = match[4] === 's' ? null : match[4].split('.').map((x) => parseInt(x, 36));
  const d = { kit, missing, edits, target };
  if (
    target &&
    (!targetInside(k.base.goals.at(-1), target) ||
      target.every((n, i) => n === k.base.goals.at(-1)[i ? 'y' : 'x']))
  )
    return null;
  return encodeDesign(d) === id ? d : null;
}
export function targetInside(goal, [x, y]) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x - goal.w / 2 >= 10 &&
    x + goal.w / 2 <= 710 &&
    y - goal.h / 2 >= 14 &&
    y + goal.h / 2 <= 371
  );
}
export function tuning(kind) {
  if (kind === 'pulley' || kind === 'spring' || kind === 'tether') return 'Cable length';
  if (kind === 'motor') return 'Motor speed';
  if (kind === 'rack') return 'Pinion radius';
  if (kind === 'gearbox') return 'Gear ratio';
  if (kind === 'torsion') return 'Spring preload';
  if (['funnel', 'sieve'].includes(kind)) return 'Opening';
  if (kind === 'zipline') return 'Cable span';
  if (kind === 'ice') return 'Incline';
  return null;
}
function calibrated(point, kind, e) {
  const p = { ...point, x: point.x + 8 * e.x, y: point.y + 8 * e.y };
  if (!e.tune) return p;
  const factor = 1 + e.tune * 0.15;
  if (['pulley', 'spring', 'tether'].includes(kind)) {
    if (p.length) p.length *= factor;
    else p.rest = (p.rest || 1) * factor;
  } else if (kind === 'motor') p.rate = (p.rate || 0.105) * factor;
  else if (kind === 'rack') p.pitch = (p.pitch || 20) * factor;
  else if (kind === 'gearbox') p.ratio = (p.ratio || 1) * factor;
  else if (kind === 'torsion') p.wind = (p.wind || 0.6) * factor;
  else if (['sieve', 'funnel'].includes(kind)) p.gap = (p.gap || 28) * factor;
  else if (kind === 'zipline') p.span = (p.span || 152) * factor;
  else if (kind === 'ice') p.slope = (p.slope || 0.22) * factor;
  return p;
}
export function buildDesign(d) {
  const k = designKits[d.kit],
    m = k.base;
  const stations = k.stations.map((st, i) => {
    const e = d.edits[i],
      kind = st.options[e.type];
    return { kind, point: calibrated(st.point, kind, e), fixture: st.fixture, options: st.options };
  });
  const missing = stations[d.missing],
    fixtures = [];
  for (const [i, s] of m.fixtures.entries()) {
    const st = stations.find((st) => st.fixture === i);
    if (!st) fixtures.push(s);
    else if (st !== missing) fixtures.push({ ...parts[st.kind].shape, ...st.point });
  }
  const spare = stations.at(-1);
  if (spare !== missing) fixtures.push({ ...parts[spare.kind].shape, ...spare.point });
  const sockets = m.sockets.map((p) => ({ ...p }));
  sockets[k.socket] = { ...missing.point };
  const choices = [...new Set([missing.kind, ...missing.options, ...m.tray])].slice(0, 4);
  const split = (d.kit + d.missing + 1) % choices.length;
  const tray = choices.slice(split).concat(choices.slice(0, split));
  const goals = m.goals.map((g, i) =>
    i === m.goals.length - 1 && d.target ? { ...g, x: d.target[0], y: d.target[1] } : { ...g },
  );
  const machine = {
    ...m,
    id: encodeDesign(d),
    title: k.name + ' · custom build',
    field: 'Design bench',
    lesson: null,
    description: 'One station is missing from this player-designed machine. ' + m.goal,
    fixtures,
    sockets,
    goals,
    tray,
    designed: true,
  };
  return { machine, intended: { part: missing.kind, socket: k.socket }, stations };
}
export const designOffsets = [-3, -2, -1, 0, 1, 2, 3];
export function proveDesign(M, d) {
  const { machine, intended } = buildDesign(d);
  if (designOffsets.some((n) => trial(M, machine, null, n).state === 'won'))
    return {
      reason:
        'The machine delivers with the station missing. Choose a station the load needs or move the target.',
    };
  const passed = designOffsets.filter((n) => trial(M, machine, intended, n).state === 'won').length;
  if (passed !== designOffsets.length)
    return {
      reason:
        'The complete machine delivered at ' +
        passed +
        ' of 7 release points. Adjust the station or record a target on its path.',
    };
  const repairs = certify(M, machine);
  if (!repairs) return { reason: 'The drawer has no reliable repair. Try another station.' };
  return { machine: { ...machine, verifiedRepairs: repairs.length }, intended };
}
export function designFilm(M, d, intact) {
  const { machine, intended } = buildDesign(d),
    run = createRun(M, machine, intact ? intended : null),
    tape = [snapshot(run)];
  while (run.state === 'running') {
    advance(M, run);
    tape.push(snapshot(run));
  }
  const last = machine.goals.at(-1),
    targetActor = last.striker === 'cargo' ? run.cargo : run.ball;
  return {
    run,
    tape,
    actorIndex: run.items.findIndex((it) => it.body === targetActor),
    targetActor: last.striker === 'cargo' ? 'blue parcel' : 'gold marble',
  };
}
