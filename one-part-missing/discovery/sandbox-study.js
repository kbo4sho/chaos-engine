import { lessons, exposures, simulate, radius } from './experiments.js';
import { rigs, doubleRun, tolerance } from './double-rigs.js';
import { readTake, readSheet, certifySheet } from './shutter-sheet.js';
import { readSetupAddress, studyPage } from './setup-address.js';

function within(values, settings) {
  return (
    settings?.length === values.length &&
    settings.every((v, i) => Number.isInteger(v) && v >= 0 && v < values[i].length)
  );
}
export function sandboxStudy(M, args) {
  const types = ['study', 'shutters'].filter((k) => args.has(k));
  if (types.length !== 1) return null;
  const type = types[0],
    raw = args.get(type),
    back = studyPage(type, raw);
  if (args.getAll(type).length !== 1 || !back) return null;
  const setup = readSetupAddress(raw);
  if (setup.invalid) return null;
  let machine, marks, title;
  if (type === 'study') {
    const [id, stage, ...extra] = setup.route.split('/');
    const lesson = lessons.find((l) => l.id === id),
      transfer = stage === 'test';
    if (
      !lesson ||
      extra.length ||
      (stage !== undefined && !transfer) ||
      !within([lesson.values], setup.settings)
    )
      return null;
    const [setting] = setup.settings,
      [exploreTick, testTick, targets] = exposures[id],
      tick = transfer ? testTick : exploreTick;
    machine = lesson.make(lesson.kind, transfer, lesson.values[setting]);
    title = lesson.title;
    const roles = lesson.actor === 'both' ? ['marble', 'cargo'] : [lesson.actor || 'marble'];
    const reference = transfer ? null : simulate(M, lesson, false, setting, tick);
    marks = roles.map((actor, i) => {
      const [x, y] = transfer
        ? targets[i]
        : reference.frames.at(-1).poses[reference.actors[i].index].map(Math.round);
      return { actor, tick, x, y, r: radius, reference: !transfer };
    });
  } else {
    const take = readTake(setup.route),
      sheet = readSheet(take.route);
    if (take.invalid || (take.settings && setup.settings)) return null;
    const rig = sheet?.rig || rigs.find((r) => r.id === take.route);
    const fit = take.settings || setup.settings;
    if (
      !rig ||
      !within(
        rig.controls.map((c) => c.values),
        fit,
      )
    )
      return null;
    if (sheet && !certifySheet(M, sheet.base, rig.shots).route) return null;
    if (take.settings && doubleRun(M, rig, fit).count !== 2) return null;
    machine = rig.make(...fit.map((v, i) => rig.controls[i].values[v]));
    title = rig.title;
    marks = rig.shots.map((s) => ({ actor: s.kind, tick: s.tick, x: s.x, y: s.y, r: tolerance }));
  }
  const goals = marks.map((m, i) => ({
    ...m,
    kind: 'exposure',
    field: true,
    sequence: i + 1,
    total: marks.length,
    source: { type, route: raw },
  }));
  return { machine: { ...machine, title, goals }, back };
}
