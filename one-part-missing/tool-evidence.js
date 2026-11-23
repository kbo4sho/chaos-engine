import { parts, fittings, packFittings } from './machines.js';

export const grades = ['seen', 'fitted', 'combined'];
export const evidencePrefix = 'chaos.one-part-missing.tool-event.v1.';
const reviewedPrefix = 'chaos.one-part-missing.checked-fit.v1.';
const clock = (t) => (t / 60).toFixed(2) + ' s';

export function toolEvents(machine, move, run) {
  if (run.state !== 'won') return [];
  const last = run.hits.at(-1),
    seen = new Map(),
    worked = new Map();
  for (const use of run.uses) {
    if (!Object.hasOwn(parts, use.kind) || use.tick > last) continue;
    if (!seen.has(use.kind)) seen.set(use.kind, use);
    if (run.items[use.item]?.shape.fitted && !worked.has(use.kind)) worked.set(use.kind, use);
  }
  const fit = packFittings(fittings(machine, move));
  if (!fit) return [];
  const rows = [];
  function add(grade, use, other) {
    rows.push({
      grade,
      kind: use.kind,
      machine: machine.id,
      title: machine.title,
      move: fit,
      tick: use.tick,
      actor: use.actor,
      ...(use.action ? { action: use.action } : {}),
      ...(other ? { partner: other.kind, partnerTick: other.tick } : {}),
    });
  }
  for (const use of seen.values()) add('seen', use);
  for (const use of worked.values()) {
    add('fitted', use);
    const other = [...worked.values()].find((e) => e.kind !== use.kind);
    if (other) add('combined', use, other);
  }
  return rows;
}
export function toolEvidence(getStorage) {
  const memory = new Map();
  function read(key) {
    if (memory.has(key)) return memory.get(key);
    try {
      return getStorage().getItem(key);
    } catch {
      return null;
    }
  }
  function write(key, value) {
    try {
      getStorage().setItem(key, value);
      memory.delete(key);
    } catch {
      memory.set(key, value);
    }
  }
  function get(kind, grade) {
    if (!Object.hasOwn(parts, kind) || !grades.includes(grade)) return null;
    try {
      const row = JSON.parse(read(evidencePrefix + kind + '.' + grade));
      return row?.kind === kind &&
        row.grade === grade &&
        typeof row.machine === 'string' &&
        row.move &&
        (grade !== 'combined' || Object.hasOwn(parts, row.partner)) &&
        Number.isInteger(row.tick)
        ? row
        : null;
    } catch {
      return null;
    }
  }
  function signature(move) {
    const packed = [move, move?.second, move?.third].filter(Boolean);
    return JSON.stringify(packFittings(packed));
  }
  function processed(id, move) {
    return read(reviewedPrefix + id) === signature(move);
  }
  function mark(machine, move) {
    write(reviewedPrefix + machine.id, signature(move));
  }
  function record(machine, move, run) {
    for (const row of toolEvents(machine, move, run))
      if (!get(row.kind, row.grade))
        write(evidencePrefix + row.kind + '.' + row.grade, JSON.stringify(row));
    mark(machine, move);
  }
  return { get, record, processed, mark };
}

const subjects = {
  marble: 'gold marble',
  cargo: 'blue parcel',
  rig: 'rigging',
  drive: 'transmission',
  tile: 'domino',
  rocker: 'rocker',
};
export function eventLine(row) {
  const actor = subjects[row.actor] || 'machine';
  return (
    parts[row.kind].name +
    ' · ' +
    actor +
    ' · ' +
    clock(row.tick) +
    (row.action ? ' · ' + row.action : '')
  );
}
