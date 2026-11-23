// Each fitting joins actual Matter bodies. Straight joints use Matter's constraint solver.
// Routed cables use the same inverse-mass projection as the sandbox pulley.
export const links = {
  tether: { name: 'Tether', description: 'Pull when the line is taut' },
  spring: { name: 'Coil spring', description: 'Store and return a stretch' },
  strut: { name: 'Rigid strut', description: 'Hold the ends apart' },
  winch: { name: 'Winch', description: 'Reel a line inward' },
  pulley: { name: 'Pulley', description: 'Trade length between two legs' },
  breaklink: { name: 'Weak link', description: 'Snap under a sudden stretch' },
  damper: { name: 'Damper', description: 'Slow relative motion' },
};
for (const [kind, p] of Object.entries(links)) p.shape = { kind, r: 5, field: true, wire: true };
const unit = (x, y) => {
  const length = Math.hypot(x, y);
  return { x: x / Math.max(length, 0.0001), y: y / Math.max(length, 0.0001), length };
};
export function makeLinks(M, world, items) {
  const nodes = new Map(items.filter((i) => i.shape.node).map((i) => [i.shape.node, i.body]));
  const added = [];
  for (const item of items) {
    const s = item.shape;
    if (!s.wire || s.disabled) continue;
    const a = nodes.get(s.from),
      b = nodes.get(s.to);
    if (!a || !b || a === b) continue;
    const via = s.kind === 'pulley';
    const distance = via
      ? Math.hypot(a.position.x - s.x, a.position.y - s.y) +
        Math.hypot(b.position.x - s.x, b.position.y - s.y)
      : Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y);
    const length = Math.max(12, s.length ?? distance * (s.rest || 1));
    const link = M.Constraint.create({ bodyA: a, bodyB: b, length, render: { type: 'machine-rig' } });
    link.label = 'workbench ' + s.kind;
    link.stiffness = { spring: 0.018, strut: 0.9, breaklink: 0.017 }[s.kind] || 0;
    link.damping = s.kind === 'spring' ? 0.025 : s.kind === 'strut' ? 0.05 : 0;
    link.rig = { kind: s.kind, initialLength: length, active: false, broken: false };
    link.rigMarker = item.body;
    item.body.render.cableLength = length;
    M.Composite.add(world, link);
    added.push(link);
  }
  return added;
}

export function installRigging(M, engine, getConstraints, onUse) {
  let lastList,
    rigs = [];
  const list = () => {
    const all = getConstraints();
    if (lastList !== all) {
      lastList = all;
      rigs = all.filter((link) => link.rig && link.rigMarker);
    }
    return rigs;
  };
  const mark = (link, action) => {
    if (action !== 'snapped' && link.rig.active) return;
    link.rig.active = true;
    link.rigMarker.render.cableActive = true;
    onUse?.(link, action);
  };
  M.Events.on(engine, 'beforeUpdate', ({ delta }) => {
    const steps = delta / (1000 / 60);
    for (const l of list()) {
      const r = l.rig;
      if (r.broken) continue;
      if (r.kind === 'winch') {
        const target = Math.max(22, r.initialLength * 0.33);
        const next = Math.max(target, l.length - 1.85 * steps);
        r.reelStep = l.length - next;
        l.length = next;
        l.rigMarker.render.cableLength = next;
        if (r.reelStep > 0) mark(l, 'reeling');
      }
      if (!['strut', 'spring', 'breaklink'].includes(r.kind)) continue;
      const a = l.bodyA,
        b = l.bodyB,
        n = unit(b.position.x - a.position.x, b.position.y - a.position.y);
      const extension = n.length - l.length;
      const rate = (b.velocity.x - a.velocity.x) * n.x + (b.velocity.y - a.velocity.y) * n.y;
      if (Math.abs(extension) > 0.25 || Math.abs(rate) > 0.45)
        mark(l, r.kind === 'spring' ? 'stretching' : 'loaded');
      if (r.kind === 'breaklink' && extension > Math.max(5, r.initialLength * 0.085)) {
        r.broken = true;
        l.stiffness = 0;
        l.damping = 0;
        l.rigMarker.render.cableBroken = true;
        mark(l, 'snapped');
      }
    }
  });
  M.Events.on(engine, 'afterUpdate', () => {
    for (const l of list()) {
      const r = l.rig;
      if (!['tether', 'pulley', 'winch', 'damper'].includes(r.kind)) continue;
      const a = l.bodyA,
        b = l.bodyB,
        o = l.rigMarker.position,
        via = r.kind === 'pulley';
      const na = unit(
        a.position.x - (via ? o.x : b.position.x),
        a.position.y - (via ? o.y : b.position.y),
      );
      const nb = via
        ? unit(b.position.x - o.x, b.position.y - o.y)
        : { x: -na.x, y: -na.y, length: na.length };
      const wa = a.isStatic ? 0 : a.inverseMass,
        wb = b.isStatic ? 0 : b.inverseMass,
        sum = wa + wb;
      if (!sum) continue;
      const extension = na.length + (via ? nb.length : 0) - l.length;
      const speed =
        (wa ? a.velocity.x * na.x + a.velocity.y * na.y : 0) +
        (wb ? b.velocity.x * nb.x + b.velocity.y * nb.y : 0);
      const damping = r.kind === 'damper';
      if (damping ? Math.abs(speed) < 0.03 : extension < -0.02) continue;
      if (damping || extension > 0.04 || speed > 0.05) mark(l, damping ? 'damping' : 'taut');
      const impulse = damping ? speed * 0.32 : Math.max(0, speed + (r.reelStep || 0));
      const correct = damping ? 0 : Math.max(0, extension);
      for (const [body, n, w] of [
        [a, na, wa],
        [b, nb, wb],
      ]) {
        if (!w) continue;
        const share = w / sum,
          step = Math.min(n.length, correct * share);
        if (step)
          M.Body.setPosition(body, { x: body.position.x - n.x * step, y: body.position.y - n.y * step });
        if (impulse)
          M.Body.setVelocity(body, {
            x: body.velocity.x - n.x * impulse * share,
            y: body.velocity.y - n.y * impulse * share,
          });
        M.Sleeping.set(body, false);
      }
    }
  });
}
