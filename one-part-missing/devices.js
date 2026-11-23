// Powered workshop parts. The bench, exported game and sandbox step these same rules.
import { mechanisms, installMechanisms } from './mechanisms.js';
export const devices = {
  conveyor: { name: 'Conveyor', description: 'Carry along the belt', shape: { w: 104, h: 14 } },
  trampoline: { name: 'Trampoline', description: 'Spring back upward', shape: { w: 78, h: 12 } },
  fan: { name: 'Lift fan', description: 'Lift in a column of air', shape: { w: 76, h: 16 } },
  magnet: { name: 'Magnet', description: 'Bend toward the pole', shape: { r: 17, field: true } },
  syrup: { name: 'Syrup', description: 'Drain sideways speed', shape: { w: 70, h: 42, field: true } },
  deflector: {
    name: 'Deflector',
    description: 'Turn the incoming motion',
    shape: { r: 22, field: true },
  },
  portal: { name: 'Portal', description: 'Carry motion to the exit', shape: { r: 23, field: true } },
  repulsor: { name: 'Repulsor', description: 'Push away from the coil', shape: { r: 16, field: true } },
};
for (const [kind, part] of Object.entries(devices)) part.shape.kind = kind;

export const outlet = { kind: 'outlet', r: 22, field: true };
export const FAN_HEIGHT = 100;
export const POLE_REACH = 85;

export function installDevices(M, engine, getScene, onUse) {
  installMechanisms(M, engine, getScene, onUse);
  const contact = new WeakMap();
  M.Events.on(engine, 'beforeUpdate', () => {
    const { tools, marbles } = getScene();
    for (const tool of tools) {
      const s = tool.shape;
      if (!Object.hasOwn(devices, s.kind) || s.disabled) continue;
      for (const ball of marbles) {
        const dx = ball.position.x - tool.body.position.x;
        const dy = ball.position.y - tool.body.position.y;
        const radius = ball.circleRadius || 12;
        const dir = s.dir || 1;
        const vel = ball.velocity;
        let vx = vel.x,
          vy = vel.y,
          working = false;
        let touching = contact.get(tool.body);
        if (!touching) contact.set(tool.body, (touching = new WeakSet()));
        switch (s.kind) {
          case 'conveyor':
          case 'trampoline': {
            const above = -dy - s.h / 2 - radius;
            if (Math.abs(dx) > s.w / 2 + 2 || above < -6 || above > Math.max(2, vy + 1)) break;
            if (s.kind === 'trampoline') {
              if (vy <= 0 || touching.has(ball)) break;
              vy = -Math.min(10.8, 5.6 + vy * 0.59);
            } else {
              vx += (dir * 10 - vx) * 0.23;
            }
            working = true;
            break;
          }
          case 'fan':
            if (Math.abs(dx) >= s.w / 2 || dy > -5 || dy < -FAN_HEIGHT) break;
            vy = Math.max(-9, vy - 0.86);
            working = true;
            break;
          case 'magnet':
          case 'repulsor': {
            const distance = Math.hypot(dx, dy);
            if (distance < 1 || distance >= POLE_REACH) break;
            const strength = (s.kind === 'magnet' ? -1 : 1) * (1 - distance / POLE_REACH) * 1.45;
            vx += (strength * dx) / distance;
            vy += (strength * dy) / distance;
            working = true;
            break;
          }
          case 'syrup':
            if (Math.abs(dx) > s.w / 2 || Math.abs(dy) > s.h / 2) break;
            vx *= 0.82;
            vy *= 0.88;
            working = true;
            break;
          case 'deflector':
          case 'portal': {
            if (Math.hypot(dx, dy) > s.r + radius / 2) break;
            working = true;
            if (touching.has(ball)) continue;
            if (s.kind === 'portal') {
              const exit = tools.find((t) => t.shape.kind === 'outlet' && t.shape.pair === s.pair);
              if (!exit) {
                working = false;
                break;
              }
              M.Body.setPosition(ball, { ...exit.body.position });
            } else {
              // A quarter turn preserves the incoming speed.
              vx = dir * vel.y;
              vy = -dir * vel.x;
            }
            break;
          }
        }
        if (working) {
          if (!touching.has(ball)) onUse?.(tool, ball);
          touching.add(ball);
          M.Body.setVelocity(ball, { x: vx, y: vy });
        } else touching.delete(ball);
      }
    }
  });
}

export const instruments = { ...devices, ...mechanisms };
