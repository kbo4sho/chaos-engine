import { rigs, doubleRun, position, tolerance } from './double-rigs.js';

// A sheet carries only the two measurable targets. It can be solved without
// knowing the maker's settings, and a later viewer never earns their receipt.
const encode = (n) => n.toString(36);
function readInt(token, max) {
  if (!/^[0-9a-z]{1,3}$/.test(token)) return null;
  const value = parseInt(token, 36);
  return value <= max && encode(value) === token ? value : null;
}
export function sheetRoute(rig, shots) {
  return [rig.id, 'sheet', '1', ...shots.map((s) => [s.tick, s.x, s.y].map(encode).join('.'))].join('/');
}
export function readSheet(route) {
  if (typeof route !== 'string' || route.length > 100) return null;
  const [id, tag, version, a, b, ...extra] = route.split('/');
  const base = rigs.find((r) => r.id === id);
  if (!base || tag !== 'sheet' || version !== '1' || !a || !b || extra.length) return null;
  const shots = [a, b].map((value, i) => {
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    const [tick, x, y] = parts.map((v, k) =>
      readInt(v, [base.shots.at(-1).tick, 720 - tolerance, 400 - tolerance][k]),
    );
    if (tick === null || x === null || y === null || x < tolerance || y < tolerance) return null;
    return { kind: base.shots[i].kind, tick, x, y };
  });
  if (shots.some((s) => !s) || shots[0].tick >= shots[1].tick) return null;
  return { base, rig: { ...base, shots, sheet: route } };
}
export function capture(tape, rig, i, tick) {
  const kind = rig.shots[i].kind,
    [x, y] = position(tape, kind, tick);
  return { kind, tick, x: Math.round(x), y: Math.round(y) };
}
export function certifySheet(M, rig, shots) {
  const route = sheetRoute(rig, shots);
  const parsed = readSheet(route);
  if (!parsed)
    return { message: 'Choose two points inside the bench with shutter 1 earlier than shutter 2.' };
  const rows = [];
  for (const [a] of rig.controls[0].values.entries())
    for (const [b] of rig.controls[1].values.entries()) {
      const tape = doubleRun(M, parsed.rig, [a, b]);
      rows.push({ a, b, hits: tape.receipts.map((r) => r.hit), count: tape.count });
    }
  const winners = rows.filter((r) => r.count === 2);
  if (!winners.length) return { message: 'No setup reaches both marks. Capture them from one run.' };
  const bothMatter = winners.some(
    (win) =>
      rows.some((r) => r.a === win.a && r.count < 2) && rows.some((r) => r.b === win.b && r.count < 2),
  );
  if (!bothMatter)
    return { message: 'One control can stay anywhere. Try a later frame after both tools have acted.' };
  const shuttersMatter = [0, 1].every((i) => rows.some((r) => r.hits[i] !== winners[0].hits[i]));
  if (!shuttersMatter)
    return {
      message: 'Every setup hits one of these marks. Move that shutter to a frame where paths separate.',
    };
  const start = rows.find((r) => r.count === 0) || rows.find((r) => r.count < 2);
  return {
    route,
    start: [start.a, start.b],
    ways: winners.length,
    total: rows.length,
    message: winners.length + ' of ' + rows.length + ' setups match both exposures.',
  };
}

export function takeRoute(rig, settings) {
  return (rig.sheet || rig.id) + '/take/' + settings.join('.');
}
export function readTake(requested) {
  const [route, code, ...more] = requested.split('/take/');
  if (code === undefined) return { route, settings: null };
  if (more.length || !/^[0-2]\.[0-2]$/.test(code)) return { route, invalid: true };
  const settings = code.split('.').map(Number),
    base = rigs.find((r) => r.id === route.split('/')[0]);
  return base && settings.every((v, i) => v < base.controls[i].values.length)
    ? { route, settings }
    : { route, invalid: true };
}
