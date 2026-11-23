import { WIDTH, HEIGHT, LIMIT, fittings, parts } from './machines.js';
import { receiverOpen } from './transmissions.js';

export const diagramGroups = {
  loads: 'Moving bodies',
  sockets: 'Mounting sockets',
  receivers: 'Receivers',
  hardware: 'Installed hardware',
};
const names = {
  marble: 'Gold marble',
  cargo: 'Blue parcel',
  tile: 'Domino',
  weight: 'Drop weight',
  flywheel: 'Flywheel',
  rocker: 'Pivoting rocker',
  rail: 'Track rail',
  outlet: 'Portal outlet',
  eyelet: 'Cable eyelet',
  electrode: 'Electrode',
  bell: 'Bell',
  flag: 'Flag',
  chime: 'Chime',
};
const nameFor = (s) =>
  s.flywheel && s.kind === 'marble' ? 'Input flywheel' : names[s.kind] || parts[s.kind]?.name || s.kind;
const units = (n) => Number(n.toFixed(1));
const clock = (t) => (t / 60).toFixed(2) + ' s';
const socketName = (i) => String.fromCharCode(65 + i);
function position(s) {
  const x = s.x < WIDTH / 3 ? 'left' : s.x > (WIDTH * 2) / 3 ? 'right' : 'center';
  const y = s.y < HEIGHT / 3 ? 'upper' : s.y > (HEIGHT * 2) / 3 ? 'lower' : 'middle';
  return y + ' ' + x + ' · x ' + units(s.x) + ', y ' + units(s.y);
}
export function receiverWindows(shape) {
  if (!shape.window) return [];
  const spans = [];
  let start = null;
  for (let tick = 0; tick <= LIMIT; tick++) {
    if (receiverOpen(shape, tick)) {
      start ??= tick;
    } else if (start !== null) {
      spans.push([start, tick - 1]);
      start = null;
    }
  }
  if (start !== null) spans.push([start, LIMIT]);
  return spans;
}
function rules(machine, s, index) {
  const striker = s.striker || machine.striker || 'marble';
  const who = striker === 'marble' ? nameFor(machine.ball) : names[striker] || striker;
  const lines = [s.bin ? who + ' must stay inside this bin.' : who + ' must make contact.'];
  if (s.bin) {
    if (s.hold > 1) lines.push('Hold for ' + s.hold + ' consecutive frames (' + clock(s.hold) + ').');
    if (s.pace !== undefined)
      lines.push('Speed at most ' + s.pace + (s.pace === 1 ? ' unit' : ' units') + ' per frame.');
    if (machine.goals.length > 1) lines.push('The bins can receive their loads in either order.');
  } else if (machine.goals.length > 1) {
    lines.push(index === 0 ? 'First receiver in the sequence.' : 'Cross after receiver ' + index + '.');
  }
  if (s.turn) lines.push('Arrive spinning ' + (s.turn > 0 ? 'clockwise' : 'counterclockwise') + '.');
  if (s.travel) lines.push('Enter moving ' + (s.travel > 0 ? 'right' : 'left') + '.');
  if (s.window)
    lines.push('Opens for ' + s.window.duration + ' frames every ' + s.window.period + ' frames.');
  return lines;
}
function hardware(s) {
  if (parts[s.kind]) return parts[s.kind].description + '.';
  if (s.kind === 'rail' && Math.abs(Math.cos(s.a || 0)) < 0.04) return 'Near-vertical track.';
  if (s.kind === 'rail')
    return s.a
      ? 'Track falls toward the ' + (Math.sin(s.a) * Math.cos(s.a) > 0 ? 'right' : 'left') + '.'
      : 'Level track.';
  if (s.kind === 'rocker') return 'Rotates around its pivot.';
  if (s.kind === 'eyelet') return 'A cable attachment point.';
  if (s.kind === 'outlet') return 'The paired portal releases a load here.';
  if (s.kind === 'electrode') return 'A fixed electrical pole.';
  return 'Installed on the bench.';
}
export function diagramEntries(machine, move) {
  const active = fittings(machine, move),
    groups = { loads: [], sockets: [], receivers: [], hardware: [] };
  const all = [machine.ball, ...machine.fixtures];
  for (const [i, shape] of all.entries()) {
    const group = ['marble', 'cargo', 'tile', 'weight', 'flywheel'].includes(shape.kind)
      ? 'loads'
      : 'hardware';
    const label = nameFor(shape),
      notes = [];
    if (group === 'loads') {
      if (shape.spin)
        notes.push('Starts spinning ' + (shape.spin > 0 ? 'clockwise' : 'counterclockwise') + '.');
      if (shape.vx) notes.push('Starts moving ' + (shape.vx > 0 ? 'right' : 'left') + '.');
      if (shape.vy) notes.push('Starts moving ' + (shape.vy > 0 ? 'down' : 'up') + '.');
      if (shape.axle) notes.push('Held on an axle.');
      if (!notes.length) notes.push('Starts at rest.');
    } else notes.push(hardware(shape));
    groups[group].push({ id: 'body-' + i, group, label, shape, notes });
  }
  for (const [index, shape] of machine.sockets.entries()) {
    const fit = active.find((f) => f.socket === index);
    const mounted = fit ? parts[fit.part] : null;
    const notes = [
      mounted
        ? 'Fitted with ' + mounted.name + (fit.flipped ? ' · rail reversed.' : '.')
        : 'Empty mounting point.',
    ];
    if (mounted) notes.push(mounted.description + '.');
    groups.sockets.push({
      id: 'socket-' + index,
      group: 'sockets',
      label: 'Socket ' + socketName(index),
      shape: { ...shape, r: 12 },
      index,
      notes,
    });
  }
  for (const [index, shape] of machine.goals.entries()) {
    groups.receivers.push({
      id: 'receiver-' + index,
      group: 'receivers',
      label: (shape.bin ? 'Bin ' : 'Receiver ') + (index + 1) + ' · ' + nameFor(shape),
      index,
      shape,
      notes: rules(machine, shape, index),
      windows: receiverWindows(shape),
    });
  }
  for (const items of Object.values(groups)) {
    const totals = new Map(),
      counts = new Map();
    for (const e of items) totals.set(e.label, (totals.get(e.label) || 0) + 1);
    for (const e of items) {
      if (totals.get(e.label) > 1) {
        const n = (counts.get(e.label) || 0) + 1;
        counts.set(e.label, n);
        e.label += ' ' + n;
      }
      e.location = position(e.shape);
    }
  }
  return Object.values(groups).flat();
}
export function nearby(entries, entry, group) {
  const { x, y } = entry.shape;
  const targets = entries
    .filter((e) => e !== entry && e.group === group)
    .map((e) => ({ entry: e, dx: e.shape.x - x, dy: e.shape.y - y }));
  targets.sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
  const nearest = targets[0];
  if (!nearest) return null;
  const { dx, dy } = nearest;
  const dirs = [
    ...(Math.abs(dy) > 8 ? [dy > 0 ? 'below' : 'above'] : []),
    ...(Math.abs(dx) > 8 ? [dx > 0 ? 'right' : 'left'] : []),
  ];
  return {
    entry: nearest.entry,
    text:
      nearest.entry.label +
      ' · ' +
      Math.round(Math.hypot(dx, dy)) +
      ' units' +
      (dirs.length ? ', ' + dirs.join(' and ') : ', at the same position'),
  };
}
// Use the body's rotated outline before applying touch slop, so a long rail
// does not claim a tap simply because its center is nearer than another part.
export function hitsAt(entries, x, y, tolerance = 8) {
  return entries
    .map((entry) => {
      const s = entry.shape,
        dx = x - s.x,
        dy = y - s.y,
        angle = s.a || 0;
      const rx = dx * Math.cos(angle) + dy * Math.sin(angle),
        ry = dy * Math.cos(angle) - dx * Math.sin(angle);
      const distance =
        s.r !== undefined
          ? Math.max(0, Math.hypot(rx, ry) - s.r)
          : Math.hypot(
              Math.max(0, Math.abs(rx) - (s.w || 16) / 2),
              Math.max(0, Math.abs(ry) - (s.h || 16) / 2),
            );
      const area = s.r !== undefined ? Math.PI * s.r * s.r : (s.w || 16) * (s.h || 16);
      return { entry, distance, area };
    })
    .filter((v) => v.distance <= tolerance)
    .sort((a, b) => a.distance - b.distance || a.area - b.area)
    .map((v) => v.entry);
}
