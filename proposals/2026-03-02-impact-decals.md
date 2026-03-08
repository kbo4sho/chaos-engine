# Impact Decals — Persistent Splat Marks on Hard Collisions

**Impact:** medium-high
**Goal alignment:** "more satisfying" — visual history of destruction makes chaos feel permanent and rewarding; every hard hit leaves a mark

## Why

Right now, collisions happen and then... nothing remains. Objects bounce away and the surfaces look untouched. In the best physics sandboxes, destruction leaves evidence. Impact decals — colored splat marks on walls and the ground — create a "look at what I did" feeling. After 30 seconds of chaos, the arena is covered in paint-like marks that tell the story of the session.

This is pure juice: zero gameplay change, massive satisfaction increase.

## How It Works

1. On collision where `relVel > 6`, spawn a decal at the contact point
2. Decal = a canvas-rendered splat (circle with slight irregular edges via 2-3 offset sub-circles)
3. Color matches the colliding object's render color (with slight alpha ~0.3-0.5)
4. Size scales with impact velocity: `radius = Math.min(relVel * 1.5, 25)`
5. Decals are purely visual — stored in a `decals[]` array, rendered behind objects
6. Cap at ~200 decals (FIFO eviction of oldest when exceeded)
7. CLEAR button wipes decals too

## Rendering

Decals render in the main draw loop, after background/walls but before physics bodies:

```javascript
// In render loop, before body drawing
for (const d of decals) {
  ctx.save();
  ctx.globalAlpha = d.alpha;
  ctx.fillStyle = d.color;
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  ctx.fill();
  // Secondary splatter offset for organic look
  ctx.beginPath();
  ctx.arc(d.x + d.r * 0.4, d.y - d.r * 0.3, d.r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

## Changes Required

- Add `let decals = [];` to state variables (~line 315)
- In collision handler (~line 2005), when `relVel > 6`: push `{x, y, r, color, alpha}` to `decals[]`
- In render loop: draw decals between background and bodies
- In CLEAR handler (~line 1587): add `decals = [];`
- Cap check: if `decals.length > 200`, shift oldest

## Tests

- Test that decals array populates on high-velocity collision events
- Test that CLEAR resets decals
- Test FIFO cap at 200

## Performance

Rendering 200 filled circles per frame is negligible — simpler than the existing trail system. FIFO cap prevents unbounded growth.
