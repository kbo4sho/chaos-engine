// A passing body collects equipment at a service ring. Forces follow that body
// after it leaves the ring, including when the sandbox world is saved and loaded.
export const flightParts = {
  float: { name: 'Float collar', description: 'Cancel gravity and keep the incoming velocity' },
  parachute: { name: 'Parachute', description: 'Slow a descent with air resistance' },
  thruster: { name: 'Thruster', description: 'Keep accelerating along the load’s facing direction' },
  keel: { name: 'Keel', description: 'Grip sideways motion along the load’s own axis' },
  hopper: { name: 'Hopper foot', description: 'Hop from a supporting surface' },
  bank: { name: 'Bank vane', description: 'Reflect travel across the load’s facing axis' },
  unload: { name: 'Release hoop', description: 'Shed the equipment carried by the load' },
};
for (const [kind, p] of Object.entries(flightParts)) p.shape = { kind, r: 18, field: true };
export const gearBit = { float: 1, parachute: 2, thruster: 4, keel: 8, hopper: 16 };
export function flightNames(mask) {
  return Object.keys(gearBit)
    .filter((k) => mask & gearBit[k])
    .map((k) => flightParts[k].name);
}
export function installFlight(M, engine, getScene, onUse) {
  let previous,
    stations = [];
  M.Events.on(engine, 'beforeUpdate', (event) => {
    const scene = getScene();
    if (scene.tools !== previous) {
      previous = scene.tools;
      stations = scene.tools.filter((t) => flightParts[t.shape.kind] && !t.shape.disabled);
    }
    const g = engine.gravity,
      mag = Math.hypot(g.x, g.y),
      down = mag ? { x: g.x / mag, y: g.y / mag } : { x: 0, y: 0 };
    for (const b of scene.marbles) {
      if (b.isStatic || b.isSensor) continue;
      const was = b.plugin.flightContacts;
      let mask = b.render.gearMask || 0;
      if (!stations.length && !mask && !was) continue;
      const now = [];
      for (const st of stations) {
        const s = st.shape,
          k = s.kind,
          id = st.body.id;
        if (
          Math.hypot(b.position.x - st.body.position.x, b.position.y - st.body.position.y) >
          (s.r || 18) + (b.circleRadius || 10) * 0.55
        )
          continue;
        now.push(id);
        if (was?.includes(id)) continue;
        if (k === 'unload') {
          if (!mask) continue;
          mask = 0;
          b.plugin.hopWait = 0;
          onUse?.(st, b, 'released gear');
        } else if (k === 'bank') {
          const x = Math.cos(b.angle),
            y = Math.sin(b.angle),
            along = b.velocity.x * x + b.velocity.y * y;
          M.Body.setVelocity(b, { x: 2 * along * x - b.velocity.x, y: 2 * along * y - b.velocity.y });
          onUse?.(st, b, 'banked');
        } else if (!(mask & gearBit[k])) {
          mask |= gearBit[k];
          if (k === 'hopper') b.plugin.hopStation = id;
          onUse?.(st, b, 'attached');
        }
      }
      if (now.length) b.plugin.flightContacts = now;
      else if (was) delete b.plugin.flightContacts;
      if (!mask && !b.render.gearMask) continue;
      b.render.gearMask = mask;
      b.render.flightAngle = b.angle;
      if (!mask) continue;
      const force = { x: 0, y: 0 },
        v = b.velocity,
        steps = Math.min(3, Math.max(0, event.delta / (1000 / 60)));
      if (mask & gearBit.float) {
        force.x -= g.x * g.scale;
        force.y -= g.y * g.scale;
      }
      if (mask & gearBit.parachute) {
        const descent = v.x * down.x + v.y * down.y;
        if (descent > 0) {
          const lift = Math.min(mag * g.scale * 1.85, descent * descent * 0.00005),
            drag = 0.000012 * Math.min(descent, 10);
          force.x -= down.x * lift + (v.x - down.x * descent) * drag;
          force.y -= down.y * lift + (v.y - down.y * descent) * drag;
        }
      }
      const cos = Math.cos(b.angle),
        sin = Math.sin(b.angle);
      if (mask & gearBit.keel) {
        const slip = (-v.x * sin + v.y * cos) * -Math.expm1(-0.24 * steps);
        M.Body.setVelocity(b, { x: v.x + sin * slip, y: v.y - cos * slip });
      }
      if (mask & gearBit.thruster) {
        const speed = Math.hypot(v.x, v.y);
        if (speed > 24) M.Body.setVelocity(b, { x: (v.x * 24) / speed, y: (v.y * 24) / speed });
        force.x += cos * 0.00075;
        force.y += sin * 0.00075;
      }
      if (force.x || force.y)
        M.Body.applyForce(b, b.position, { x: force.x * b.mass, y: force.y * b.mass });
      if (mask & gearBit.hopper) {
        b.plugin.hopWait = Math.max(0, (b.plugin.hopWait || 0) - event.delta);
        if (!mag || b.plugin.hopWait) continue;
        const candidates = M.Composite.allBodies(engine.world).filter(
          (o) => o !== b && !o.isSensor && M.Detector.canCollide(b.collisionFilter, o.collisionFilter),
        );
        const supported = M.Query.collides(b, candidates).some(
          (c) => -(c.normal.x * down.x + c.normal.y * down.y) * (c.parentA === b ? 1 : -1) > 0.55,
        );
        if (supported) {
          const along = v.x * down.x + v.y * down.y;
          M.Body.setVelocity(b, { x: v.x - (along + 8) * down.x, y: v.y - (along + 8) * down.y });
          b.plugin.hopWait = 700;
          const st = stations.find((t) => t.body.id === b.plugin.hopStation);
          if (st) onUse?.(st, b, 'hopped');
        }
      }
    }
  });
}
export function flightInput(kind) {
  return ['keel', 'thruster', 'bank'].includes(kind)
    ? { name: 'body heading', labels: ['Nose up', 'Level nose', 'Nose down'] }
    : { name: 'descent speed', labels: ['Shallow descent', 'Normal descent', 'Steep descent'] };
}
export function flightExperiment(kind, offset) {
  const tilt = flightInput(kind).name === 'body heading';
  const ball = {
    kind: 'marble',
    x: 177,
    y: 56,
    vx: 4.4,
    vy: tilt ? 1 : 1 + offset / 17,
    r: 11,
    a: tilt ? offset * 0.025 : -0.1,
  };
  const stations = [{ ...flightParts[kind].shape, x: 260, y: 125, labPiece: true }];
  if (kind === 'unload') {
    stations.unshift({ ...flightParts.float.shape, x: 180, y: 57 });
    ball.vy = 2.6 + offset / 21;
    stations[1].y = 109;
  }
  if (kind === 'hopper') stations.push({ kind: 'rail', x: 342, y: 229, w: 226, h: 12, a: 0.085 });
  return {
    ball,
    fixtures: stations,
    sockets: [],
    tray: [],
    goals: [{ kind: 'flag', x: 1800, y: 1800, w: 20, h: 20, sensor: true }],
  };
}
