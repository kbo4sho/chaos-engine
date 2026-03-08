# Slingshot Trajectory Preview

**Impact:** high
**Goal alignment:** "more satisfying to play with" — knowing where your shot will land makes every launch feel deliberate and rewarding instead of random

## Why

The slingshot mechanic is the core interaction. Right now you pull back and guess where things will go. Adding a dotted trajectory arc turns every launch from "hope for the best" into "I planned that." It's the difference between throwing darts blindfolded and actually aiming.

Every great physics game (Angry Birds, etc.) shows you where things will land. It's table stakes for satisfying physics play.

## Changes

In `drawSlingshot()`, after drawing the rubber band line, render 8-12 dotted trajectory points showing the parabolic arc the object will follow based on current pull direction, power, and gravity.

```javascript
// Inside drawSlingshot(), after existing code:
const power = Math.min(dist / 15, 25);
const vx = (dx / dist) * power;
const vy = (dy / dist) * power;
const gx = engine.gravity.x;
const gy = engine.gravity.y;

// Trajectory dots
const dots = 12;
const timeStep = 0.3;
ctx.fillStyle = '#00ff4166';
for (let i = 1; i <= dots; i++) {
  const t = i * timeStep;
  const px = slingStart.x + vx * t + 0.5 * gx * t * t * 60;
  const py = slingStart.y + vy * t + 0.5 * gy * t * t * 60;
  const dotSize = 3 * (1 - i / (dots + 2)); // fade smaller
  const alpha = 1 - (i / dots) * 0.7;
  ctx.globalAlpha = alpha * 0.6;
  ctx.beginPath();
  ctx.arc(px, py, dotSize, 0, Math.PI * 2);
  ctx.fill();
}
ctx.globalAlpha = 1;
```

## What this gives you

- Visual feedback during every slingshot pull
- Dots fade and shrink along the arc (looks polished, not cluttered)
- Respects current gravity setting (Moon shots arc differently than Jupiter)
- Zero performance cost (12 tiny circles per frame, only while dragging)
- Works with gravity flip directions too
