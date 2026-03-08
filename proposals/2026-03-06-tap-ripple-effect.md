# Tap ripple effect

**Impact:** medium
**Goal alignment:** "more satisfying to play with" — every tap/click gets immediate visual feedback; the canvas feels alive and responsive before the spawned object even appears

## Why

Every interaction starts with a tap. Right now, the only feedback is the spawned object appearing. Adding an expanding ring ripple at the touch point creates an instant "the world heard me" response — the same trick every great touch-based game uses (Fruit Ninja, Cut the Rope, etc). It's the difference between tapping on glass and tapping on water.

This is pure juice: no gameplay change, no new UI, no new buttons. Just a satisfying pulse wherever you touch.

## Changes

Add a `ripples` array alongside the existing `particles` array. On every canvas `pointerdown`, push a ripple at that position. Each ripple:

- Starts at radius 5, expands to radius 40 over ~400ms
- Starts at opacity 0.6, fades to 0
- Ring stroke (not filled) in the current tool's accent color
- 2px line width, shrinking to 0.5px as it expands
- Removed from array when opacity hits 0

Render ripples in the main draw loop, after background but before objects (so objects spawn "on top" of the ripple).

## Diff

```javascript
// Add to state variables (near particles array ~line 320)
let ripples = []; // {x, y, radius, maxRadius, opacity, color, age}

// Add to pointerdown handler (where spawnObject is called)
function addRipple(x, y) {
  const toolColors = {
    ball: '#00ff41', block: '#0abdc6', bomb: '#ff3333',
    balloon: '#ff3399', star: '#ffdd00', rocket: '#ff6600',
    default: '#0abdc6'
  };
  const color = toolColors[currentTool] || toolColors.default;
  ripples.push({
    x, y,
    radius: 5,
    maxRadius: 40,
    opacity: 0.6,
    color,
    age: 0,
    duration: 400 // ms
  });
}

// Add to update loop (near particle update)
function updateRipples(dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.age += dt;
    const progress = Math.min(r.age / r.duration, 1);
    r.radius = 5 + (r.maxRadius - 5) * easeOutCubic(progress);
    r.opacity = 0.6 * (1 - progress);
    if (progress >= 1) ripples.splice(i, 1);
  }
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// Add to render loop (after background, before objects)
function drawRipples(ctx) {
  for (const r of ripples) {
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = r.opacity;
    ctx.lineWidth = 2 - 1.5 * (r.radius / r.maxRadius);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
```

~30 lines of implementation. No new dependencies. No DOM changes. No test changes needed (visual-only, doesn't affect body count or physics).
