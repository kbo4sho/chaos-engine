# Pinch-to-Zoom & Pan

**Impact:** high
**Goal alignment:** "more satisfying to play with" — transforms passive observation into active exploration; zooming into a pile of ragdolls or a chain reaction in progress is viscerally satisfying in a way that fixed-camera never can be

**Why:** Every great physics sandbox (Algodoo, Garry's Mod, Powder Toy) has camera control. Right now Chaos Engine is locked at a fixed zoom — you can't lean in to watch gears mesh, zoom out to see a full Rube Goldberg chain, or pan to follow a rocket across the screen. This is the single biggest interaction gap. Adding zoom+pan doesn't add complexity for the user (it's an expected gesture), but it massively increases the depth of engagement with everything that already exists.

## Changes

### Camera State
Add a camera transform object tracking `offsetX`, `offsetY`, and `scale` (default 1.0, range 0.3–3.0). All canvas rendering wraps in this transform via `ctx.save() → ctx.translate(offsetX, offsetY) → ctx.scale(scale, scale)`.

### Input Handling

**Pinch-to-zoom (touch):**
- Detect two-finger touch in `onDown`/`onMove`
- Track initial pinch distance; scale camera proportionally as fingers move
- Zoom anchored to midpoint between fingers (not screen center)
- When two fingers are active, suppress object spawning/slingshot

**Scroll-to-zoom (desktop):**
- `wheel` event on canvas scales camera ±0.1 per tick
- Zoom anchored to mouse position
- Ctrl+scroll or just scroll (since canvas already has `touch-action: none`)

**Pan:**
- Two-finger drag (touch): translate camera offset by finger movement delta
- Middle-click drag (desktop): pan camera
- When zoomed beyond 1.0×, single-finger drag on empty space could pan (but this conflicts with slingshot — safer to use two-finger only)

**Double-tap to reset:**
- Double-tap/double-click with two fingers resets camera to `{offsetX: 0, offsetY: 0, scale: 1.0}`
- Smooth animated return (lerp over 300ms)

### Coordinate Mapping
All pointer position calculations (`getPointerPos`, `getPointerPosFromEnd`) must account for camera transform:
```javascript
function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  const screenX = (touch.clientX - rect.left) * (canvas.width / rect.width);
  const screenY = (touch.clientY - rect.top) * (canvas.height / rect.height);
  // Transform screen coords to world coords
  return {
    x: (screenX - camera.offsetX) / camera.scale,
    y: (screenY - camera.offsetY) / camera.scale
  };
}
```

### Render Pipeline
Wrap the existing render in camera transform (after shake offset, before everything else):
```javascript
ctx.save();
ctx.translate(shakeOffset.x, shakeOffset.y);
ctx.translate(camera.offsetX, camera.offsetY);
ctx.scale(camera.scale, camera.scale);
// ... all existing rendering ...
ctx.restore();
```

HUD elements (stats, destruction meter, wind indicator, grid labels) render OUTSIDE the camera transform so they stay screen-fixed.

### Zoom Level Indicator
When zoomed != 1.0, show a small "2.1×" label in the corner (CRT-styled, fades after 1.5s of no zoom change). Optional: mini-map in corner showing viewport position when zoomed in past 1.5×.

### Edge Cases
- Slingshot trajectory preview must render in world space (inside camera transform) ✓
- Portal placement must use world coordinates ✓
- Black hole center must be in world space ✓
- Object rain should spawn in visible viewport area, not fixed canvas coords
- Grid should scale with zoom (or switch density at breakpoints)
- Particles render in world space ✓

## Diff

Core changes are structural (coordinate system), so a full diff is large. Key touchpoints:
1. New `camera` object (~5 lines)
2. Modified `getPointerPos` / `getPointerPosFromEnd` (~6 lines each)
3. New touch handlers for pinch detection (~40 lines)
4. New wheel handler (~15 lines)
5. Render pipeline wrap (~8 lines)
6. HUD extraction to render outside camera (~20 lines)
7. Zoom indicator UI (~15 lines)
8. Rain/spawn viewport adjustment (~5 lines)

**Estimated total: ~120 lines added, ~20 lines modified**

## Risks
- Coordinate mapping bugs (spawning objects at wrong position) — mitigated by centralizing through `getPointerPos`
- Performance at high zoom with many objects — canvas already handles 200+ bodies fine; zoom doesn't change draw call count
- Two-finger gesture conflicts with slingshot — resolved by suppressing slingshot when 2+ touches active
