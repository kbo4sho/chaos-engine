import { campaign } from './campaign.js';
import { parts, canFlip, packFittings, trial, createRun, advance } from './machines.js';
import { possibilities } from './certify.js';
import { toolEvents } from './tool-evidence.js';
import { compoundTemplates } from './compound-templates.js';

// Option order belongs to the published drawing format. The original tool
// occupies option zero, so an untouched template exactly matches the level.
const families = [
  ['bridge', 'chute'],
  ['bumper', 'trampoline', 'cam'],
  ['weight', 'domino'],
  ['conveyor', 'ice', 'oneway'],
  ['fan', 'magnet', 'repulsor'],
  ['syrup', 'deflector', 'portal'],
  ['elevator', 'piston', 'pinwheel'],
  ['tripwire', 'switch', 'hatch'],
  ['tether', 'spring', 'strut', 'damper', 'breaklink', 'winch', 'pulley'],
  ['motor', 'ratchet', 'clutch'],
  ['gearbox', 'torsion', 'rack'],
  ['sieve', 'funnel', 'basket'],
  ['zipline', 'ice', 'conveyor'],
  ['pulse', 'swirl'],
  ['lift', 'gyro', 'phase'],
  ['positive', 'negative', 'ground'],
  ['float', 'parachute', 'thruster', 'keel'],
  ['hopper', 'bank', 'unload'],
];
const toolsFor = (kind) => [
  kind,
  ...(families.find((f) => f.includes(kind)) || []).filter((k) => k !== kind),
];
export const compoundKits = compoundTemplates.map(([level, spares]) => {
  const base = campaign[level - 1];
  return {
    id: 1000 + level,
    level,
    name: base.title,
    base,
    stations: spares.map(([kind, socket, flipped]) => ({
      kind,
      point: { ...base.sockets[socket] },
      options: toolsFor(kind),
      socket,
      flipped: Boolean(flipped),
    })),
  };
});
export const compoundById = new Map(compoundKits.map((k) => [k.id, k]));
export const compoundByMachine = new Map(compoundKits.map((k) => [k.base.id, k]));
export function buildCompound(d, kit, calibrated, encode) {
  const base = kit.base;
  const stations = kit.stations.map((st, i) => {
    const e = d.edits[i],
      kind = st.options[e.type];
    return {
      ...st,
      kind,
      point: calibrated(st.point, kind, e),
      flipped: st.flipped && canFlip(base, kind),
    };
  });
  const hidden = new Set(d.hidden),
    fixed = new Set(),
    fixtures = [...base.fixtures];
  for (const [i, st] of stations.entries()) {
    if (hidden.has(i)) continue;
    fixed.add(st.socket);
    const shape = { ...parts[st.kind].shape, ...st.point };
    if (shape.mirror && shape.a) shape.a = -shape.a;
    if (st.flipped) shape.a = -shape.a;
    fixtures.push(shape);
  }
  const slots = [],
    placed = [];
  for (const [old, p] of base.sockets.entries()) {
    if (fixed.has(old)) continue;
    const st = stations.find((s) => s.socket === old);
    if (st)
      placed.push({ part: st.kind, socket: slots.length, ...(st.flipped ? { flipped: true } : {}) });
    slots.push(st ? { ...st.point } : { ...p });
  }
  const names = placed.map((f) => f.part),
    choices = [...new Set([...names, ...base.tray])].slice(0, Math.max(4, base.tray.length));
  const split = (kit.level + d.hidden[0]) % choices.length;
  const goals = base.goals.map((g, i) =>
    i === base.goals.length - 1 && d.target ? { ...g, x: d.target[0], y: d.target[1] } : { ...g },
  );
  const count = hidden.size;
  const machine = {
    ...base,
    id: encode(d),
    title: kit.name + ' · custom build',
    field: 'Design bench',
    lesson: null,
    description: 'Fit ' + count + ' missing ' + (count === 1 ? 'station. ' : 'stations. ') + base.goal,
    designed: true,
    fixtures,
    sockets: slots,
    goals,
    tray: choices.slice(split).concat(choices.slice(0, split)),
    capacity: count,
    minimum: count,
  };
  return { machine, intended: packFittings(placed), stations };
}
export function proveCompound(M, layout, offsets) {
  const { machine, intended } = layout,
    fit = [intended, intended?.second, intended?.third].filter(Boolean);
  if (new Set(fit.map((f) => f.part)).size !== machine.capacity)
    return {
      reason: 'Choose different spares for the removed stations. Each drawer part can be fitted once.',
    };
  const winning = offsets.filter((j) => trial(M, machine, intended, j).state === 'won');
  if (winning.length !== offsets.length)
    return {
      reason:
        'The complete machine delivered at ' +
        winning.length +
        ' of 7 release points. Adjust a station or capture a different target.',
    };
  if (offsets.some((j) => trial(M, machine, null, j).state === 'won'))
    return {
      reason: 'The empty machine can deliver. Move the receiver or keep an unneeded station installed.',
    };
  const run = createRun(M, machine, intended);
  while (run.state === 'running') advance(M, run);
  if (toolEvents(machine, intended, run).filter((e) => e.grade === 'fitted').length !== machine.capacity)
    return {
      reason:
        'One removed station never acted on this delivery. Keep it installed or change the handoff.',
    };
  for (let count = 1; count < machine.capacity; count++)
    for (const partial of possibilities(machine, count)) {
      if (offsets.some((j) => trial(M, machine, partial, j).state === 'won'))
        return {
          reason:
            'A shorter repair delivers with ' +
            count +
            ' ' +
            (count === 1 ? 'spare' : 'spares') +
            '. Move the target or keep another station installed.',
        };
    }
  let reliable = 0;
  for (const move of possibilities(machine))
    if (offsets.every((j) => trial(M, machine, move, j).state === 'won')) reliable++;
  return { machine: { ...machine, verifiedRepairs: reliable }, intended };
}
