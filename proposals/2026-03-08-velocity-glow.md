# Velocity Glow — Dynamic Light Emission from Fast Objects

**Impact:** high
**Goal alignment:** "more satisfying to play with" — fast objects become visually exciting; explosions create momentary light shows; the scene dynamically illuminates itself

## Why

Every object renders at the same visual intensity regardless of speed. A block sitting still looks identical to one screaming across the screen at terminal velocity. This means the most exciting moments (launches, explosions, chain reactions) have no velocity-specific visual language beyond motion blur that the eye can barely track.

Adding a soft radial glow around objects proportional to their speed creates emergent lighting — slingshot launches streak like comets, bomb blasts produce momentary sunbursts as debris radiates outward, and a calm scene gradually dims as objects settle. The sandbox starts telling a visual story about energy.

This pairs with every existing feature: slingshot launches glow on release, bomb debris radiates, bumper hits flash, anti-grav drops create cascading light as everything accelerates. Zero new UI, zero new controls — pure ambient juice.

## Changes

In `drawBody(b)`, before the existing draw logic, check the body's velocity magnitude. If above a threshold (speed > 3), draw a radial gradient glow behind the body using the object's own color with alpha proportional to speed. Cap the glow radius and alpha to prevent visual overload.

```javascript
// At the top of drawBody(b), before ctx.save():
const vel = b.velocity || {x:0, y:0};
const speed = Math.sqrt(vel.x*vel.x + vel.y*vel.y);
if (speed > 3 && !b.isStatic) {
  const glowAlpha = Math.min((speed - 3) * 0.04, 0.35);
  const glowRadius = Math.min(speed * 3, 60);
  const color = (b.render && b.render.color) || '#00ff41';
  ctx.save();
  const grad = ctx.createRadialGradient(
    b.position.x, b.position.y, 0,
    b.position.x, b.position.y, glowRadius
  );
  grad.addColorStop(0, color + Math.floor(glowAlpha * 255).toString(16).padStart(2,'0'));
  grad.addColorStop(1, color + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.position.x, b.position.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
```

Key details:
- **Threshold:** speed > 3 (walking pace objects don't glow, only fast ones)
- **Max alpha:** 0.35 (subtle, not blinding)
- **Max radius:** 60px (contained, not scene-filling)
- **Color source:** object's own render color (green blocks glow green, red bombs glow red)
- **Performance:** single radial gradient per fast body; no glow for static/slow objects; negligible cost

## Diff

The change is ~15 lines inserted at the top of the `drawBody` function (before the existing `ctx.save()` call), plus the glow needs to render in world-space coordinates (before the translate/rotate), so it wraps in its own save/restore.

No test changes needed — this is purely visual. Existing tests verify object spawning and physics behavior, which are unaffected.
