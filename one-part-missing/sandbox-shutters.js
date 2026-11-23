import { studyPage } from './discovery/setup-address.js';

const actorName = {
  marble: 'Gold marble',
  cargo: 'Blue parcel',
  rim: 'Input rim',
  weight: 'Drop weight',
};
export function shutterReading(actor, target, shape) {
  if (!actor) return { matched: false, missing: true };
  const offset = shape.actor === 'rim' ? actor.render.machineShape.r * 0.72 : 0;
  const x = actor.position.x + offset * Math.cos(actor.angle),
    y = actor.position.y + offset * Math.sin(actor.angle);
  const dx = x - target.position.x,
    dy = y - target.position.y;
  return { matched: Math.hypot(dx, dy) <= shape.r, x, y, dx, dy };
}
export function installShutters(M, engine, world, launcher, feedback) {
  let prior = null,
    marks = [],
    actors = {},
    previousLink = null,
    previousTitle = null,
    scheduled = false;
  function collect() {
    const bodies = M.Composite.allBodies(world);
    if (bodies === prior) return;
    prior = bodies;
    marks = [];
    actors = {};
    for (const body of bodies) {
      const s = body.render.machineShape;
      if (!s) continue;
      if (s.kind === 'exposure') marks.push(body);
      else if (!actors[s.kind]) actors[s.kind] = body;
      if (s.flywheel && s.node === 'drive') actors.rim = body;
    }
    const source = marks[0]?.render.machineShape.source;
    const back = source && studyPage(source.type, source.route);
    if (back && launcher) {
      if (previousLink === null) {
        previousLink = launcher.getAttribute('href');
        previousTitle = launcher.title;
      }
      launcher.href = back;
      launcher.title = 'Return to this experiment';
    } else if (previousLink !== null && launcher) {
      launcher.setAttribute('href', previousLink);
      launcher.title = previousTitle;
      previousLink = null;
      previousTitle = null;
    }
  }
  M.Events.on(world, 'afterAdd afterRemove', () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      collect();
    });
  });
  M.Events.on(engine, 'afterUpdate', (event) => {
    collect();
    const reported = [];
    for (const marker of marks) {
      const r = marker.render,
        s = r.machineShape;
      if (r.exposureResult) continue;
      r.exposureTick = (r.exposureTick || 0) + event.delta / (1000 / 60);
      if (r.exposureTick + 1e-7 < s.tick) continue;
      const result = shutterReading(actors[s.actor], marker, s);
      r.exposureResult = result;
      const reading = result.missing
        ? 'load removed'
        : result.matched
          ? 'in frame'
          : 'missed by ' + Math.round(Math.hypot(result.dx, result.dy)) + ' units';
      reported.push('Shutter ' + s.sequence + ' · ' + actorName[s.actor] + ' ' + reading);
    }
    if (reported.length) feedback(reported.join(' / '));
  });
}
