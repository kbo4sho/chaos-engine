import { flightNames } from '../flight.js';
import { parts } from '../machines.js';

const seconds = (t) => (t / 60).toFixed(2) + ' s';
const degrees = (a) => Math.round((a * 180) / Math.PI);
const labelFor = (kind) => parts[kind]?.name || kind;
function flightState(pose) {
  const gear = flightNames(pose[3] || 0);
  return gear.length ? gear.join(' + ') : 'No gear attached';
}
function travel(tape, tick, index) {
  if (!tick) return 'At release';
  const current = tape.frames[tick].poses[index],
    before = tape.frames[tick - 1].poses[index];
  const vx = Math.round(60 * (current[0] - before[0])),
    vy = Math.round(60 * (current[1] - before[1]));
  return (
    'Travel · ' +
    Math.abs(vx) +
    ' units/s ' +
    (vx < 0 ? 'left' : 'right') +
    ' · ' +
    Math.abs(vy) +
    ' units/s ' +
    (vy < 0 ? 'up' : 'down')
  );
}
export function instrumentReading(lesson, tape, tick) {
  const { index } = tape.actors[0],
    pose = tape.frames[tick].poses[index],
    motion = travel(tape, tick, index);
  if (lesson.family === 'Shaft couplings') {
    const wheel = tape.run.items.findIndex((it) => it.shape.node === 'drive'),
      start = tape.frames[0].poses[wheel];
    const turn = (tape.frames[tick].poses[wheel][2] - start[2]) / (2 * Math.PI),
      axle = tape.run.items[index].shape.axle;
    const bearing = degrees(Math.atan2(pose[1] - axle[1], pose[0] - axle[0]));
    return {
      state: 'Input ' + turn.toFixed(2) + ' turns · Blue arm ' + ((bearing + 360) % 360) + '°',
      motion: 'Arm angle increases clockwise from the right. ' + motion,
    };
  }
  if (lesson.kind === 'phase') {
    const left = pose[5] || 0;
    return { state: left ? 'Phase open · ' + seconds(left) + ' left' : 'Solid · collisions on', motion };
  }
  if (lesson.kind === 'terminal' || lesson.kind === 'ground')
    return {
      state:
        'Load charge · ' +
        ((pose[4] || 0) === 0 ? 'neutral' : pose[4] > 0 ? 'positive (+)' : 'negative (−)'),
      motion,
    };
  if (['pulse', 'swirl', 'bank'].includes(lesson.kind)) {
    const acted = tape.run.uses.some((u) => u.kind === lesson.kind && u.tick <= tick);
    return {
      state: labelFor(lesson.kind) + ' · ' + (acted ? 'load redirected' : 'awaiting contact'),
      motion,
    };
  }
  return { state: flightState(pose), motion };
}
export function instrumentEvents(tape) {
  const grouped = new Map();
  const add = (tick, text) => {
    if (!grouped.has(tick)) grouped.set(tick, new Set());
    grouped.get(tick).add(text);
  };
  for (const u of tape.run.uses) {
    const action = u.action || 'contact';
    add(u.tick, labelFor(u.kind) + ' ' + action);
  }
  const index = tape.actors[0].index;
  for (let i = 1; i < tape.frames.length; i++) {
    if (tape.frames[i - 1].poses[index][5] > 0 && !(tape.frames[i].poses[index][5] > 0))
      add(tape.frames[i].tick, 'Solid again');
  }
  return [...grouped]
    .sort(([a], [b]) => a - b)
    .map(([tick, names]) => ({ tick, name: [...names].join(' + ') }));
}
