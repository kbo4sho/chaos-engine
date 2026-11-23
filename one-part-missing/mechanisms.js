// The moving solids collide with the marble in Matter. Switches operate an actual hinged door.
export const mechanisms = {
  cam: { name: 'Eccentric cam', description: 'Lift on the high side', shape: { r: 25 } },
  elevator: { name: 'Elevator', description: 'Ride a rising platform', shape: { w: 78, h: 12 } },
  piston: { name: 'Piston', description: 'Push on the outward stroke', shape: { w: 18, h: 54 } },
  pinwheel: { name: 'Pinwheel', description: 'Catch a rotating blade', shape: { w: 88, h: 12 } },
  tripwire: {
    name: 'Tripwire',
    description: 'Kick across the beam',
    shape: { w: 80, h: 8, field: true },
  },
  switch: {
    name: 'Trip switch',
    description: 'Release the matching hatch',
    shape: { r: 18, field: true },
  },
  hatch: { name: 'Hatch', description: 'Swing down on signal', shape: { w: 76, h: 10 } },
};
for (const [kind, part] of Object.entries(mechanisms)) part.shape.kind = kind;

// The coordinate in the scene is the actual starting center, including at a nonzero phase.
export function motionAt(s, t) {
  const phase = s.phase || 0,
    dir = s.dir || 1;
  const wave = (rate) => Math.cos(phase) - Math.cos(phase + t * rate);
  switch (s.kind) {
    case 'elevator':
      return { x: s.x, y: s.y - 36 * wave(0.054), a: 0 };
    case 'piston':
      return { x: s.x + dir * 39 * wave(0.086), y: s.y, a: 0 };
    case 'cam': {
      const a = phase + dir * t * 0.065;
      return {
        x: s.x + 18 * (Math.cos(a) - Math.cos(phase)),
        y: s.y + 18 * (Math.sin(a) - Math.sin(phase)),
        a: a - phase,
      };
    }
    case 'pinwheel':
      return { x: s.x, y: s.y, a: phase + dir * t * 0.092 };
    case 'hatch': {
      const a = dir * Math.min(Math.PI * 0.47, t * 0.085);
      return {
        x: s.x + ((dir * s.w) / 2) * (Math.cos(a) - 1),
        y: s.y + ((dir * s.w) / 2) * Math.sin(a),
        a,
      };
    }
    default:
      return { x: s.x, y: s.y, a: 0 };
  }
}

export function rotorBody(M, shape, options) {
  const { x, y, w, h } = shape;
  const arms = [M.Bodies.rectangle(x, y, w, h, options), M.Bodies.rectangle(x, y, h, w, options)];
  const body = M.Body.create({ ...options, parts: arms });
  M.Body.setStatic(body, true);
  M.Body.setAngle(body, shape.phase || 0);
  return body;
}

export function installMechanisms(M, engine, getScene, onUse) {
  const close = new WeakMap();
  M.Events.on(engine, 'beforeUpdate', ({ delta }) => {
    const { tools, marbles } = getScene();
    for (const tool of tools) {
      const { shape: s, body } = tool;
      if (!Object.hasOwn(mechanisms, s.kind) || s.disabled || s.kind === 'switch') continue;
      if (s.kind === 'tripwire') {
        const dir = s.dir || 1;
        const nx = 0.82 * dir,
          ny = -0.572,
          tx = -ny,
          ty = nx;
        let crossing = close.get(body);
        if (!crossing) close.set(body, (crossing = new WeakSet()));
        for (const ball of marbles) {
          const dx = ball.position.x - body.position.x,
            dy = ball.position.y - body.position.y;
          if (Math.abs(dx * tx + dy * ty) > s.w / 2 || Math.abs(dx * nx + dy * ny) > 10) {
            crossing.delete(ball);
            continue;
          }
          if (crossing.has(ball)) continue;
          crossing.add(ball);
          const along = ball.velocity.x * tx + ball.velocity.y * ty;
          M.Body.setVelocity(ball, { x: along * tx + 10 * nx, y: along * ty + 10 * ny });
          onUse?.(tool, ball);
        }
        continue;
      }
      if (s.kind === 'hatch' && !body.render.gateOpen) continue;
      const t = (body.render.driveTime || 0) + delta / (1000 / 60);
      body.render.driveTime = t;
      const pose = motionAt(s, t);
      M.Body.setPosition(body, { x: pose.x, y: pose.y }, true);
      M.Body.setAngle(body, pose.a, true);
    }
  });
  M.Events.on(engine, 'collisionStart', ({ pairs }) => {
    const { tools, marbles } = getScene();
    if (!tools.length) return;
    for (const { bodyA, bodyB } of pairs) {
      const a = bodyA.parent,
        b = bodyB.parent;
      const ball = marbles.includes(a) ? a : marbles.includes(b) ? b : null;
      if (!ball) continue;
      const other = ball === a ? b : a;
      const tool = tools.find((item) => item.body === other);
      if (!tool || !Object.hasOwn(mechanisms, tool.shape.kind) || tool.shape.disabled) continue;
      const { kind } = tool.shape;
      if (kind === 'hatch' || kind === 'tripwire') continue;
      if (kind === 'switch') {
        if (ball.label === 'cargo' || other.render.switchOn) continue;
        other.render.switchOn = true;
        onUse?.(tool, ball);
        for (const door of tools) {
          if (
            door.shape.kind !== 'hatch' ||
            door.shape.link !== tool.shape.link ||
            door.shape.disabled ||
            door.body.render.gateOpen
          )
            continue;
          door.body.render.gateOpen = true;
          onUse?.(door, ball);
        }
      } else onUse?.(tool, ball);
    }
  });
}
