// Material-handling parts shared by the bench, exported files and editable sandbox.
export const sortingParts = {
  sieve: {
    name: 'Sieve',
    description: 'Separate two loads by their diameter',
    shape: { w: 144, h: 10 },
  },
  funnel: {
    name: 'Funnel',
    description: 'Guide a falling load toward a narrow throat',
    shape: { w: 134, h: 52 },
  },
  basket: {
    name: 'Basket',
    description: 'Catch the load between two solid sides',
    shape: { w: 86, h: 45 },
  },
  ice: { name: 'Ice rail', description: 'Slide down a low-friction incline', shape: { w: 127, h: 9 } },
  oneway: {
    name: 'One-way gate',
    description: 'Cross with the arrow and stop against it',
    shape: { w: 115, h: 8, field: true },
  },
  zipline: {
    name: 'Zipline',
    description: 'Ride a cable and leave along its tangent',
    shape: { r: 10, field: true },
  },
};
for (const [kind, tool] of Object.entries(sortingParts)) tool.shape.kind = kind;
export function slats(s) {
  const bar = (x, y, w, h, a = 0) => ({ x, y, w, h, a });
  const gap = s.gap || 28;
  if (s.kind === 'sieve') {
    const w = (s.w - gap) / 2;
    return [bar(-(w + gap) / 2, 0, w, s.h), bar((w + gap) / 2, 0, w, s.h)];
  }
  if (s.kind === 'funnel') {
    const dx = (s.w - gap) / 2,
      dy = s.h * 0.8,
      w = Math.hypot(dx, dy);
    return [
      bar(-(dx + gap) / 2, 0, w, 9, Math.atan2(dy, dx)),
      bar((dx + gap) / 2, 0, w, 9, -Math.atan2(dy, dx)),
    ];
  }
  if (s.kind === 'basket') {
    // Center solid geometry about the compound's area-weighted center of mass.
    const t = 8,
      w = s.w,
      h = s.h,
      y = ((h / 2) * (2 * h)) / (w + 2 * h);
    return [bar(0, y, w, t), bar(-(w - t) / 2, y - h / 2, t, h), bar((w - t) / 2, y - h / 2, t, h)];
  }
  if (s.kind === 'ice') return [bar(0, 0, s.w, s.h, (s.dir || 1) * (s.slope || 0.22))];
  return [];
}
export function sortBody(M, s, options) {
  const pieces = slats(s);
  if (!pieces.length) return null;
  const settings = { ...options, isStatic: false, isSensor: Boolean(s.disabled), angle: 0 };
  if (s.kind === 'ice')
    Object.assign(settings, { friction: 0.002, frictionStatic: 0, restitution: 0.02 });
  const children = pieces.map((p) =>
    M.Bodies.rectangle(s.x + p.x, s.y + p.y, p.w, p.h, { ...settings, angle: p.a }),
  );
  // Keep a single mount and saveable body for an entire funnel, basket or grating.
  const b = M.Body.create({ ...settings, parts: children });
  M.Body.setPosition(b, { x: s.x, y: s.y });
  M.Body.setStatic(b, true);
  if (s.kind === 'ice') {
    b.friction = 0.002;
    b.frictionStatic = 0;
  }
  return b;
}
export function cable(s) {
  const dx = (s.dir || 1) * (s.span || 152),
    dy = s.drop ?? 54,
    length = Math.hypot(dx, dy);
  return { dx, dy, length, tx: dx / length, ty: dy / length };
}
export function installSorting(M, engine, getScene, onUse) {
  // One contact can span several collision pairs at the seam of a compound.
  const contacts = new WeakMap();
  let allTools,
    active = [],
    byBody = new Map();
  function scene() {
    const current = getScene();
    if (current.tools !== allTools) {
      allTools = current.tools;
      active = allTools.filter((t) => sortingParts[t.shape.kind] && !t.shape.disabled);
      byBody = new Map(active.map((t) => [t.body, t]));
      for (const actor of current.marbles)
        if (actor.plugin.benchZip && !byBody.has(actor.plugin.benchZip.mount))
          delete actor.plugin.benchZip;
    }
    return current;
  }
  M.Events.on(engine, 'collisionStart', ({ pairs }) => {
    const { marbles } = scene();
    if (!active.length) return;
    for (const { bodyA, bodyB } of pairs) {
      const a = bodyA.parent,
        b = bodyB.parent;
      const actor = marbles.includes(a) ? a : marbles.includes(b) ? b : null;
      if (!actor) continue;
      const other = actor === a ? b : a;
      const tool = byBody.get(other);
      if (!tool || tool.shape.field) continue;
      let touches = contacts.get(other);
      if (!touches) contacts.set(other, (touches = new WeakMap()));
      if (engine.timing.timestamp - (touches.get(actor) ?? -Infinity) < 100) continue;
      touches.set(actor, engine.timing.timestamp);
      onUse?.(
        tool,
        actor,
        { sieve: 'caught on bars', basket: 'caught', ice: 'sliding', funnel: 'guided' }[tool.shape.kind],
      );
    }
  });
  M.Events.on(engine, 'afterUpdate', ({ delta }) => {
    const { marbles } = scene(),
      step = delta / (1000 / 60);
    for (const tool of active) {
      const { shape: s, body: mount } = tool;
      if (s.disabled || !sortingParts[s.kind]) continue;
      for (const actor of marbles) {
        const p = actor.position,
          prev = actor.positionPrev,
          r = actor.circleRadius || 12;
        if (s.kind === 'sieve' || s.kind === 'funnel') {
          // Crossing the actual opening is a distinct observation from striking its rim.
          const throat = mount.position.y + (s.kind === 'funnel' ? s.h * 0.4 : 0);
          if (
            prev.y < throat &&
            p.y >= throat &&
            Math.abs(p.x - mount.position.x) + r <= (s.gap || 28) / 2
          )
            onUse?.(tool, actor, 'through gap');
        } else if (s.kind === 'oneway') {
          const allowed = s.dir || -1,
            dir = -allowed,
            oldEdge = prev.y + r * dir,
            newEdge = p.y + r * dir;
          if (
            (prev.y - mount.position.y) * allowed < 0 &&
            (p.y - mount.position.y) * allowed >= 0 &&
            Math.abs(p.x - mount.position.x) < s.w / 2 + r
          )
            onUse?.(tool, actor, 'passed with arrow');
          const before = (oldEdge - mount.position.y) * dir,
            after = (newEdge - mount.position.y) * dir;
          if (before > 0.75 || after < 0 || after <= before || actor.velocity.y * dir <= 0) continue;
          const t = Math.max(0, Math.min(1, -before / (after - before))),
            x = prev.x + (p.x - prev.x) * t;
          if (Math.abs(x - mount.position.x) >= s.w / 2 + r) continue;
          if (Math.abs(actor.velocity.y) > 0.75) onUse?.(tool, actor, 'blocked return');
          M.Body.setPosition(actor, { x: p.x, y: mount.position.y - r * dir });
          M.Body.setVelocity(actor, { x: actor.velocity.x, y: 0 });
        } else if (s.kind === 'zipline') {
          const track = cable(s);
          let ride = actor.plugin.benchZip;
          if (!ride && Math.hypot(p.x - mount.position.x, p.y - mount.position.y) <= r + 10) {
            ride = actor.plugin.benchZip = {
              mount,
              position: 0,
              speed: Math.max(3.4, actor.velocity.x * track.tx + actor.velocity.y * track.ty),
            };
            onUse?.(tool, actor, 'boarded');
          }
          if (ride?.mount !== mount) continue;
          const gravity = engine.gravity.x * track.tx + engine.gravity.y * track.ty;
          ride.speed = Math.min(10, Math.max(1.6, ride.speed + 0.12 * gravity * step));
          ride.position = Math.min(track.length, ride.position + ride.speed * step);
          M.Body.setPosition(actor, {
            x: mount.position.x + track.tx * ride.position,
            y: mount.position.y + track.ty * ride.position,
          });
          M.Body.setVelocity(actor, { x: track.tx * ride.speed, y: track.ty * ride.speed });
          if (ride.position === track.length) {
            delete actor.plugin.benchZip;
            onUse?.(tool, actor, 'released');
          }
        }
      }
    }
  });
}

export function installReceivingBins(M, engine, scene, delivered) {
  M.Events.on(engine, 'afterUpdate', () => {
    const { bins, actors } = scene();
    for (const bin of bins) {
      const display = bin.body.render,
        s = bin.shape,
        actor = actors.find((b) => b.label === s.striker);
      if (!actor || display.binDelivered) continue;
      const touching = M.Query.collides(bin.body, [actor]).length > 0;
      display.binHold =
        touching && (s.pace === undefined || Math.hypot(actor.velocity.x, actor.velocity.y) <= s.pace)
          ? (display.binHold || 0) + 1
          : 0;
      if (display.binHold < (s.hold || 1)) continue;
      display.binDelivered = true;
      delivered(bin, actor);
    }
  });
}
