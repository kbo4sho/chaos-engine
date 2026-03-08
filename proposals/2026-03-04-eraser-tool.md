# Eraser Tool — Tap to Delete Individual Objects

**Impact:** high
**Goal alignment:** "more fun and more satisfying" — completes the create→arrange→destroy→refine sandbox loop; right now the only way to remove objects is Clear All, which is a nuclear option

## Why

Every great sandbox has selective deletion. Without it, one bad placement ruins the scene and forces a full reset. An eraser tool lets players curate their chaos — remove the stray block, clear the path for a domino chain, clean up after an explosion without losing the setup they built. It transforms the sandbox from "spawn and hope" to "sculpt and play."

The satisfaction factor: each deleted object gets a 200ms poof animation (scale down + particle burst in the object's color) with a soft pop sound. Deletion itself becomes a micro-moment of fun.

## Changes

### HTML — Add eraser button to toolbar (after rope, before draw)
```html
<button class="tool-btn" data-tool="eraser" style="color:#ff4444;"><span class="icon">🧹</span>Erase</button>
```

### JS — Handle eraser tool in `onDown()`
After the existing bomb-click check and before `slingStart = pos`:

```javascript
// Eraser tool — tap to delete
if (currentTool === 'eraser') {
  const allB = Composite.allBodies(world);
  let nearest = null, nearDist = 40;
  for (const b of allB) {
    if (b.isStatic && b.label !== 'drawn') continue; // skip walls, allow drawn walls
    const dx = b.position.x - pos.x, dy = b.position.y - pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearDist) { nearest = b; nearDist = d; }
  }
  if (nearest) {
    // Poof particles in object's render color
    const color = nearest.render?.fillStyle || '#ff4444';
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: nearest.position.x, y: nearest.position.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        color: color,
        size: 2 + Math.random() * 4
      });
    }
    // Remove connected constraints (ropes, joints)
    const allConstraints = Composite.allConstraints(world);
    allConstraints.forEach(c => {
      if (c.bodyA === nearest || c.bodyB === nearest) {
        Composite.remove(world, c);
        // Clean from ropes array if present
        const ri = ropes.indexOf(c);
        if (ri !== -1) ropes.splice(ri, 1);
      }
    });
    // Remove from magnets array if present
    const mi = magnets.findIndex(m => m.body === nearest);
    if (mi !== -1) magnets.splice(mi, 1);
    // Remove from seesaws if part of one
    const si = seesaws.findIndex(s => s.plank === nearest || s.pivot === nearest);
    if (si !== -1) {
      const sw = seesaws[si];
      Composite.remove(world, sw.constraint);
      if (sw.plank !== nearest) Composite.remove(world, sw.plank);
      if (sw.pivot !== nearest) Composite.remove(world, sw.pivot);
      seesaws.splice(si, 1);
    }
    Composite.remove(world, nearest);
    playSound(600, 0.12, 'sine', 0.1);
    playSound(300, 0.08, 'triangle', 0.06);
  }
  pointerDown = false;
  return;
}
```

### JS — Include eraser in tool button setup
The existing tool button click handler (which sets `currentTool` and toggles `.active`) already works via `data-tool` attribute — no changes needed there.

### CSS — Optional: eraser cursor feedback
```css
.tool-btn[data-tool="eraser"].active ~ #canvas-wrap { cursor: crosshair; }
```
(Nice-to-have, not critical)

## Test additions

```javascript
test('eraser tool button exists', () => {
  const btn = dom.querySelector('[data-tool="eraser"]');
  expect(btn).toBeTruthy();
  expect(btn.textContent).toContain('Erase');
});
```

## Considerations

- Eraser skips boundary walls (static bodies without `label: 'drawn'`) — can't delete the floor/ceiling
- Drawn walls (freehand lines) ARE deletable since they have `label: 'drawn'`
- Composite objects (cars, ragdolls): deleting one part removes its constraints but leaves other parts. This is intentional — partial destruction is fun and surprising. A ragdoll losing a limb is more interesting than vanishing entirely.
- The 40px hit radius is forgiving for touch targets on tablet
