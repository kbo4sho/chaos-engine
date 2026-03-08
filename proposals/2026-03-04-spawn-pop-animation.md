# Spawn Pop Animation (Scale-Up Entrance)

**Impact:** medium-high
**Goal alignment:** "more satisfying to play with" — the most frequent user action (tapping to spawn) has zero visual feedback beyond the object appearing. A quick pop animation makes every single tap feel punchy and alive.

## Why

Objects currently materialize instantly — one frame they don't exist, the next they do. This is the most-repeated interaction in the entire sandbox and it feels flat. A 150ms spring scale-up (0 → 1.1 → 1.0) with a brief radial glow gives every spawn a "pop" that makes tapping feel responsive and satisfying. This is the same juice pattern used in every polished physics game (Angry Birds egg hatches, Cut the Rope candy spawns, etc).

Zero new UI. Zero new buttons. Amplifies every existing object type automatically.

## Changes

### 1. Track spawn time on every body

In `spawnObject()`, after creating any body and before `Composite.add()`:

```js
body.spawnTime = performance.now();
```

### 2. Apply scale animation in the render loop

In the main `loop()` function, after stepping the engine and before rendering, iterate all bodies and apply a scale multiplier:

```js
// Spawn pop animation
const SPAWN_ANIM_MS = 150;
const now = performance.now();
const allBodies = Composite.allBodies(world);
for (const b of allBodies) {
  if (b.spawnTime && !b.isStatic) {
    const elapsed = now - b.spawnTime;
    if (elapsed < SPAWN_ANIM_MS) {
      // Spring overshoot: 0 → 1.1 → 1.0
      const t = elapsed / SPAWN_ANIM_MS;
      const scale = t < 0.6
        ? (t / 0.6) * 1.15          // grow to 1.15×
        : 1.15 - (t - 0.6) / 0.4 * 0.15; // settle to 1.0×
      b.spawnScale = Math.max(0.01, scale);
    } else {
      b.spawnScale = 1;
      delete b.spawnTime; // animation complete, stop checking
    }
  }
}
```

### 3. Use spawnScale in drawBody()

In `drawBody(b)`, after the `ctx.translate` and `ctx.rotate`, apply:

```js
const sc = b.spawnScale || 1;
if (sc !== 1) ctx.scale(sc, sc);
```

### 4. Spawn glow ring

During the animation, draw a fading radial glow behind the object:

```js
if (b.spawnTime) {
  const elapsed = now - b.spawnTime;
  const t = elapsed / SPAWN_ANIM_MS;
  const glowAlpha = (1 - t) * 0.4;
  const glowR = (b.circleRadius || 20) * (1 + t * 2);
  ctx.beginPath();
  ctx.arc(b.position.x, b.position.y, glowR, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 255, 65, ${glowAlpha})`;
  ctx.fill();
}
```

### 5. Note on physics

The scale is purely visual — Matter.js body bounds stay at full size from frame 1. This avoids any physics glitches. The body is physically correct immediately; only the rendering "pops" in.

## Estimated effort

~30 lines of code. No new dependencies. No new UI elements. Compatible with all 25 object types.

## Risks

- **Performance:** One `performance.now()` call + loop check per frame. Negligible — same pattern as trail rendering which already works fine.
- **Visual clutter:** At 150ms the animation is fast enough to feel snappy, not distracting.
