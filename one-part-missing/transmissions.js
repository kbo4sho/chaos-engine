// Bench transmissions join actual Matter bodies. Motor and ratchet act on a single shaft.
// Other links exchange angular or linear momentum between their named endpoints.
export const transmissions = {
  motor: { name: 'Motor', description: 'Drive one shaft toward a set speed' },
  gearbox: { name: 'Gearbox', description: 'Mesh opposite rim speeds' },
  clutch: { name: 'Friction clutch', description: 'Share spin between plates' },
  torsion: { name: 'Torsion spring', description: 'Wind and release relative rotation' },
  ratchet: { name: 'Ratchet', description: 'Keep rotation in one direction' },
  rack: { name: 'Rack and pinion', description: 'Trade spin for sideways travel' },
};
for (const [kind, p] of Object.entries(transmissions))
  p.shape = { kind, r: 6, field: true, drive: true };

export function addTransmissions(M, world, items) {
  const nodes = new Map(items.filter((it) => it.shape.node).map((it) => [it.shape.node, it.body]));
  const result = [];
  for (const { shape: s, body: marker } of items) {
    if (!s.drive || s.disabled) continue;
    const a = nodes.get(s.from),
      unary = s.kind === 'motor' || s.kind === 'ratchet',
      b = unary ? marker : nodes.get(s.to);
    if (!a || !b || a === b || a.isStatic) continue;
    const c = M.Constraint.create({ bodyA: a, bodyB: b, render: { type: 'machine-transmission' } });
    c.stiffness = 0;
    c.damping = 0;
    c.label = 'workbench ' + s.kind;
    c.drive = {
      kind: s.kind,
      dir: s.dir || 1,
      radius: s.pitch || 20,
      ratio: s.ratio || 1,
      rate: s.rate || 0.105,
      rest: b.angle - a.angle + (s.wind || 0),
      stop: a.angle,
      active: false,
    };
    c.driveMarker = marker;
    M.Composite.add(world, c);
    result.push(c);
  }
  return result;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function installTransmissions(M, engine, scene, onUse) {
  const signal = (c, action) => {
    if (c.drive.active) return;
    c.drive.active = true;
    c.driveMarker.render.driveActive = true;
    onUse?.(c, action);
  };
  const turn = (b, amount) => {
    if (b.isStatic || !amount) return;
    M.Sleeping.set(b, false);
    M.Body.setAngularVelocity(b, b.angularVelocity + amount);
  };
  M.Events.on(engine, 'beforeUpdate', ({ delta }) => {
    const steps = clamp(delta / (1000 / 60), 0, 2);
    for (const c of scene().connections) {
      const d = c.drive,
        a = c.bodyA,
        b = c.bodyB;
      const wa = a.isStatic ? 0 : a.inverseInertia,
        wb = b.isStatic ? 0 : b.inverseInertia;
      if (!wa && !wb) continue;
      if (d.kind === 'motor') {
        const step = clamp(d.dir * d.rate - a.angularVelocity, -0.017 * steps, 0.017 * steps);
        if (Math.abs(step) > 0.0001) signal(c, 'driving');
        turn(a, step);
        continue;
      }
      if (d.kind === 'ratchet') {
        if ((a.angle - d.stop) * d.dir < 0 || a.angularVelocity * d.dir < 0) {
          if (Math.abs(a.angle - d.stop) > 0.001 || Math.abs(a.angularVelocity) > 0.001)
            signal(c, 'holding');
          if ((a.angle - d.stop) * d.dir < 0) M.Body.setAngle(a, d.stop);
          if (a.angularVelocity * d.dir < 0) M.Body.setAngularVelocity(a, 0);
        }
        d.stop = a.angle;
        continue;
      }
      if (d.kind === 'rack') {
        const radius = d.dir * d.radius,
          ma = a.isStatic ? 0 : a.inverseMass,
          mb = b.isStatic ? 0 : b.inverseMass;
        const total = ma + mb + radius * radius * wa;
        if (!total) continue;
        const slip = b.velocity.x - a.velocity.x - radius * a.angularVelocity;
        if (Math.abs(slip) > 0.025) signal(c, 'engaged');
        const impulse = (-slip * -Math.expm1(-0.7 * steps)) / total;
        if (ma) M.Body.setVelocity(a, { x: a.velocity.x - impulse * ma, y: a.velocity.y });
        turn(a, -impulse * radius * wa);
        if (mb) M.Body.setVelocity(b, { x: b.velocity.x + impulse * mb, y: b.velocity.y });
        continue;
      }
      if (d.kind === 'gearbox') {
        const ratio = d.ratio,
          total = ratio * ratio * wa + wb;
        if (!total) continue;
        const slip = ratio * a.angularVelocity + b.angularVelocity;
        if (Math.abs(slip) > 0.001) signal(c, 'meshed');
        const impulse = (slip * -Math.expm1(-1.5 * steps)) / total;
        turn(a, -ratio * wa * impulse);
        turn(b, -wb * impulse);
        continue;
      }
      if (d.kind === 'clutch') {
        const slip = a.angularVelocity - b.angularVelocity;
        if (Math.abs(slip) > 0.001) signal(c, 'sharing spin');
        const impulse = (slip * -Math.expm1(-0.35 * steps)) / (wa + wb);
        turn(a, -impulse * wa);
        turn(b, impulse * wb);
        continue;
      }
      if (d.kind === 'torsion') {
        const angle = b.angle - a.angle - d.rest,
          velocity = b.angularVelocity - a.angularVelocity;
        const correction = clamp(angle * 0.012 + velocity * 0.08, -0.045, 0.045) * steps;
        if (Math.abs(correction) > 0.0001) signal(c, 'winding');
        turn(a, (correction * wa) / (wa + wb));
        turn(b, (-correction * wb) / (wa + wb));
      }
    }
    for (const b of scene().arms) {
      const g = b.plugin.benchArm,
        tx = -Math.sin(g.phase),
        ty = Math.cos(g.phase);
      const external = b.velocity.x * tx + b.velocity.y * ty - g.lastSpeed;
      const speed = b.angularVelocity * g.radius + external;
      M.Body.setVelocity(b, { x: tx * speed, y: ty * speed });
    }
  });
  M.Events.on(engine, 'afterUpdate', () => {
    for (const b of scene().arms) {
      const g = b.plugin.benchArm,
        dx = b.position.x - g.cx,
        dy = b.position.y - g.cy;
      const phase = Math.atan2(dy, dx),
        tx = -Math.sin(phase),
        ty = Math.cos(phase);
      const speed = b.velocity.x * tx + b.velocity.y * ty;
      g.phase = phase;
      g.lastSpeed = speed;
      M.Body.setPosition(b, { x: g.cx + g.radius * ty, y: g.cy - g.radius * tx });
      M.Body.setVelocity(b, { x: tx * speed, y: ty * speed });
      M.Body.setAngularVelocity(b, speed / g.radius);
    }
    for (const b of scene().slides) {
      const guide = b.plugin.benchGuide,
        x = clamp(b.position.x, guide.min, guide.max);
      const impact = b.position.x !== x;
      M.Body.setPosition(b, { x, y: guide.y });
      M.Body.setVelocity(b, { x: impact ? -b.velocity.x * 0.18 : b.velocity.x, y: 0 });
    }
  });
}
export function receiverOpen(shape, tick) {
  const w = shape.window;
  if (!w) return true;
  const phase = (((tick - w.start) % w.period) + w.period) % w.period;
  return phase < w.duration;
}
export function acceptsReceiver(shape, body, tick) {
  return (
    receiverOpen(shape, tick) &&
    (!shape.turn || body.angularVelocity * shape.turn > 0.005) &&
    (!shape.travel || body.velocity.x * shape.travel > 0.15)
  );
}
