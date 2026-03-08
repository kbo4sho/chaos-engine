# Charge-to-Spawn: Hold longer for bigger objects

**Impact:** high
**Goal alignment:** "more fun, more surprising, more satisfying" — adds a skill-based charge mechanic to the most frequent action (spawning), making every tap a deliberate choice between quick small objects and powerful charged giants

## Why

Every spawn is identical regardless of how you interact. Tap = object at fixed size. There's no way to express *intent* through the spawn gesture itself. A charge mechanic — hold longer to spawn bigger — adds a skill dimension that:

1. **Makes spawning feel powerful.** A 2-second hold producing a massive anvil that crashes through a tower is viscerally satisfying.
2. **Creates discovery delight.** First-time players tap normally, then accidentally hold and get a surprise giant. "Wait, I can do THAT?!"
3. **Adds strategic depth.** Small objects for precision placement, charged giants for destruction. Same tool, different outcomes based on player intent.
4. **Works with every object type.** Giant ducks, massive bombs, huge beach balls — each has different emergent gameplay at 2-3× scale.

## How It Works

- **Tap (< 300ms):** Normal spawn, current behavior, zero change.
- **Hold (300ms–2000ms):** Growing preview circle appears at touch point, pulsing with CRT glow. Size scales linearly from 1× to 3×.
- **Release:** Object spawns at charged size. Brief "power-up" sound (ascending pitch). Scale factor applied to Matter.js body dimensions.
- **Visual feedback:** Concentric rings expand during charge, color shifts from green → orange → red at max. Subtle screen pulse at max charge.

## Changes

### `index.html` — Touch/mouse handling
- Track `pointerdown` timestamp on canvas
- On hold > 300ms, start rendering charge preview (growing rings at pointer position)
- On `pointerup`, calculate hold duration → scale factor (1× to 3×)
- Pass scale factor to `spawnObject()` function

### `index.html` — `spawnObject()` modifications
- Accept optional `scale` parameter (default 1)
- Multiply body dimensions (radius, width, height) by scale
- Adjust mass proportionally (scale²)
- Works for: ball, block, balloon, duck, anvil, beachball, domino, pin, ice, bomb, ragdoll, trampoline, conveyor, seesaw, fan, magnet, bumper

### `index.html` — Charge preview rendering
- In render loop: if charge active, draw expanding concentric rings at pointer
- Color gradient: `#00ff41` → `#ff8800` → `#ff3333` based on charge level
- Pulsing glow effect matching CRT aesthetic
- ~30 lines of render code

### Excluded from charging
- Slingshot (has its own hold mechanic)
- Draw mode (uses hold for drawing)
- Grab tool (uses hold for grabbing)
- Portal (placement is position-critical, not size-critical)
- Rope (constraint-based, not scalable)

## Complexity

~60 lines. No new dependencies. No new UI elements. Graceful — short taps are completely unchanged.

## Diff

```javascript
// === New state variables ===
let chargeStart = null;
let chargePos = null;
let chargeScale = 1;
const CHARGE_DELAY = 300;   // ms before charge begins
const CHARGE_MAX = 2000;    // ms to reach max size
const SCALE_MAX = 3;

// === Modified pointerdown handler (add to existing) ===
// After existing sling/grab/draw checks:
chargeStart = performance.now();
chargePos = { x: px, y: py };

// === Modified pointerup handler (add to existing) ===
// Before spawnObject call:
const holdTime = performance.now() - chargeStart;
if (holdTime > CHARGE_DELAY) {
  chargeScale = 1 + (Math.min(holdTime - CHARGE_DELAY, CHARGE_MAX - CHARGE_DELAY) 
    / (CHARGE_MAX - CHARGE_DELAY)) * (SCALE_MAX - 1);
} else {
  chargeScale = 1;
}
chargeStart = null;
// Pass chargeScale to spawn, then reset
chargeScale = 1;

// === Charge preview in render loop ===
if (chargeStart && !slingStart && !drawMode && currentTool !== 'grab') {
  const elapsed = performance.now() - chargeStart;
  if (elapsed > CHARGE_DELAY) {
    const progress = Math.min((elapsed - CHARGE_DELAY) / (CHARGE_MAX - CHARGE_DELAY), 1);
    const radius = 15 + progress * 45;
    const hue = 120 - progress * 120; // green → red
    
    // Pulsing rings
    for (let i = 3; i >= 0; i--) {
      const ringR = radius + i * 8;
      const alpha = (0.3 - i * 0.06) * (0.8 + Math.sin(performance.now() / 80) * 0.2);
      ctx.beginPath();
      ctx.arc(chargePos.x, chargePos.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Size text
    ctx.font = '14px VT323';
    ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.7)`;
    ctx.textAlign = 'center';
    ctx.fillText(`${chargeScale.toFixed(1)}×`, chargePos.x, chargePos.y - radius - 12);
  }
}

// === spawnObject modification (example for 'ball') ===
// Before: Bodies.circle(x, y, 18, ...)
// After:  Bodies.circle(x, y, 18 * scale, ...)
// mass adjusts automatically via area
```

## Testing Notes

- Existing tests unaffected (they don't simulate hold duration)
- New tests needed: charge timing → scale calculation, preview render trigger, excluded tools bypass
