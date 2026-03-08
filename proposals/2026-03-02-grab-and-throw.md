# Grab & Throw Tool

**Impact:** high
**Goal alignment:** "more fun and more satisfying to play with" — every great physics sandbox lets you pick things up and hurl them. This is the most fundamental missing interaction.

## Why

Right now the only way to add energy to the scene is spawning new objects via slingshot or pressing chaos buttons. You can't interact with what's already there. In Algodoo, Garry's Mod, or even Angry Birds — grabbing and throwing is the core loop. It turns passive watching into active play.

This unlocks:
- Stacking objects precisely then knocking them over
- Picking up a bomb and throwing it at a pile
- Grabbing a duck and yeeting it across the screen
- Playing catch between portals
- Using objects as projectiles against targets

## Changes

### New tool: "Grab" (🤏 or ✊)
Add a `grab` tool button to the toolbar. When selected:

1. **On pointer down:** Find the nearest non-static body within 50px. If found, create a `Matter.Constraint` from mouse position to the body (high stiffness ~0.7, short rest length). Track velocity samples from the last 5 frames.

2. **On pointer move:** Update the constraint's `pointA` to follow the pointer. Record position deltas for throw velocity calculation.

3. **On pointer up:** Remove the constraint. Apply the averaged recent velocity (last 3-5 frames) to the body as a `Body.setVelocity()` call, scaled by a throw multiplier (~1.5x). Emit a whoosh sound scaled to throw speed. Spawn directional particles along the throw vector.

### Visual feedback
- While grabbing: draw a subtle glowing line from pointer to body center (same style as rope rendering but brighter, pulsing)
- Body gets a brief highlight glow when grabbed
- On release: directional speed lines + whoosh sound
- Hard throws (velocity > 10): small screen shake

### Implementation sketch

```javascript
// In onDown(), before slingshot logic:
if (currentTool === 'grab') {
  const allB = Composite.allBodies(world);
  let nearest = null, nearDist = 50;
  for (const b of allB) {
    if (b.isStatic) continue;
    const dx = b.position.x - pos.x, dy = b.position.y - pos.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < nearDist) { nearest = b; nearDist = d; }
  }
  if (nearest) {
    grabBody = nearest;
    grabConstraint = Constraint.create({
      pointA: pos,
      bodyB: nearest,
      stiffness: 0.7,
      damping: 0.1,
      length: 0
    });
    Composite.add(world, grabConstraint);
    grabHistory = []; // velocity sampling
    playSound(600, 0.08, 'sine', 0.06);
  }
  return;
}

// In onMove():
if (grabConstraint) {
  grabConstraint.pointA = pos;
  grabHistory.push({ x: pos.x, y: pos.y, t: Date.now() });
  if (grabHistory.length > 6) grabHistory.shift();
  return;
}

// In onUp():
if (grabConstraint && grabBody) {
  Composite.remove(world, grabConstraint);
  // Calculate throw velocity from recent movement
  if (grabHistory.length >= 2) {
    const last = grabHistory[grabHistory.length - 1];
    const prev = grabHistory[Math.max(0, grabHistory.length - 4)];
    const dt = (last.t - prev.t) / 1000 || 0.016;
    const vx = ((last.x - prev.x) / dt) * 0.02; // scale to physics
    const vy = ((last.y - prev.y) / dt) * 0.02;
    Body.setVelocity(grabBody, { x: vx, y: vy });
    const throwSpeed = Math.sqrt(vx*vx + vy*vy);
    if (throwSpeed > 2) playWhoosh(throwSpeed * 5);
    if (throwSpeed > 10) shakeIntensity = Math.max(shakeIntensity, 3);
  }
  grabBody = null;
  grabConstraint = null;
  grabHistory = [];
  return;
}
```

### New state variables
```javascript
let grabBody = null;
let grabConstraint = null;
let grabHistory = [];
```

### Toolbar addition
Add between existing tools (near rope):
```html
<button class="tool-btn" data-tool="grab"><span class="icon">✊</span>GRAB</button>
```

### Rendering (in drawConstraints or dedicated function)
```javascript
if (grabConstraint && grabBody) {
  ctx.beginPath();
  ctx.moveTo(grabConstraint.pointA.x, grabConstraint.pointA.y);
  ctx.lineTo(grabBody.position.x, grabBody.position.y);
  ctx.strokeStyle = 'rgba(10,189,198,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}
```

## Scope
- ~60 lines of new code
- No new dependencies
- No architectural changes
- Touches: onDown, onMove, onUp, toolbar HTML, state variables, draw loop
- Tests: add grab tool existence check, verify tool selection works
