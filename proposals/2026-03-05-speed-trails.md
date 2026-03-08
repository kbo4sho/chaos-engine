# Speed trails (motion afterimages)

**Impact:** medium
**Goal alignment:** "more satisfying to play with" — fast-moving objects feel weightless without visual velocity cues. Fading afterimage trails make every launch, explosion, and freefall feel powerful. Pairs multiplicatively with slo-mo (proposed) — trails in slow motion = pure cinema.

**Why:** The sandbox has great spawn variety and chaos events but velocity is invisible. A ball launched by slingshot looks the same as one sitting still until it hits something. Speed trails add a persistent visual language for "this thing is MOVING" that makes the physics feel more alive. Every physics game worth its salt has this (Angry Birds, Peggle, Bad Piggies).

## Changes

Add a lightweight trail renderer to the main draw loop:

1. **Trail buffer** — Store last 6-8 positions for each dynamic body (ring buffer, updated each frame)
2. **Draw trails** — Before drawing bodies, render fading ghost circles/shapes at previous positions with decreasing opacity (1.0 → 0.0 over the trail length)
3. **Velocity threshold** — Only render trails when `body.speed > 4` (avoids visual noise on slow-rolling objects)
4. **Color matching** — Trail color matches body render color at reduced saturation
5. **Performance** — Skip sleeping bodies entirely. Cap trail rendering to 50 fastest bodies if count > 100.

## Diff

```javascript
// Add after particle system, before main render loop

// ── SPEED TRAILS ──
const trailMap = new Map(); // bodyId → [{x,y}]
const TRAIL_LENGTH = 7;
const TRAIL_SPEED_THRESHOLD = 4;
const TRAIL_MAX_BODIES = 50;

function updateTrails() {
  const dynamicBodies = Composite.allBodies(engine.world).filter(b => !b.isStatic && !b.isSleeping);
  
  // Clean up trails for removed bodies
  for (const id of trailMap.keys()) {
    if (!dynamicBodies.find(b => b.id === id)) trailMap.delete(id);
  }
  
  for (const body of dynamicBodies) {
    if (body.speed < TRAIL_SPEED_THRESHOLD) {
      trailMap.delete(body.id);
      continue;
    }
    let trail = trailMap.get(body.id);
    if (!trail) { trail = []; trailMap.set(body.id, trail); }
    trail.push({ x: body.position.x, y: body.position.y });
    if (trail.length > TRAIL_LENGTH) trail.shift();
  }
}

function drawTrails(ctx) {
  // Sort by speed desc, cap to TRAIL_MAX_BODIES
  const entries = [...trailMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, TRAIL_MAX_BODIES);
  
  for (const [bodyId, trail] of entries) {
    if (trail.length < 2) continue;
    const body = Composite.allBodies(engine.world).find(b => b.id === bodyId);
    if (!body) continue;
    
    const color = body.render?.fillStyle || '#00ff41';
    const radius = Math.max(body.circleRadius || 8, 4);
    
    for (let i = 0; i < trail.length - 1; i++) {
      const alpha = (i / trail.length) * 0.35; // max 35% opacity
      const scale = 0.4 + (i / trail.length) * 0.6;
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, radius * scale, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(')', `,${alpha})`).replace('rgb(', 'rgba(');
      // Fallback for hex colors
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1,3), 16);
        const g = parseInt(color.slice(3,5), 16);
        const b = parseInt(color.slice(5,7), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      }
      ctx.fill();
    }
  }
}

// In the main render loop, call:
// updateTrails();
// drawTrails(ctx);  // before drawBodies()
```

## Notes

- ~60 lines of code, zero dependencies
- Ring buffer approach keeps memory constant regardless of play duration
- Velocity threshold prevents visual clutter on slow objects
- Body cap prevents performance degradation in 200+ object scenes
- Trails auto-clean when bodies are removed (Clear, off-screen, etc.)
- Works with every existing object type automatically
