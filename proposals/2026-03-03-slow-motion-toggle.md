# Slow-Motion Toggle

**Impact:** high
**Goal alignment:** "more satisfying to play with" — watching physics unfold at 0.25× speed transforms every collision, explosion, and cascade into a cinematic moment. Every existing feature becomes more satisfying.

## Why

The sandbox has pause but no speed control. Slow-mo is the single most satisfying camera trick in physics games (Garry's Mod, Besiege, Kerbal). It costs almost nothing to implement (Matter.js has `engine.timing.timeScale` built in) and amplifies every other feature — bombs, chain reactions, ragdolls, dominoes all become dramatically more watchable.

Players will organically discover the "set up chaos → trigger → hit slow-mo" loop. That's the core satisfaction cycle of every great sandbox.

## Changes

### 1. Add SLO-MO button to chaos bar (next to PAUSE)

```html
<button class="chaos-btn safe" id="btn-slowmo" style="border-color:#ff00ff;color:#ff00ff;background:#1a001a;">
  <span class="icon">🐌</span>SLO-MO
</button>
```

### 2. Add slow-motion state and toggle logic

```javascript
let slowmo = false;

const slowmoBtn = document.getElementById('btn-slowmo');
slowmoBtn.addEventListener('click', () => {
  slowmo = !slowmo;
  engine.timing.timeScale = slowmo ? 0.25 : 1;
  slowmoBtn.classList.toggle('active', slowmo);
  slowmoBtn.querySelector('.icon').textContent = slowmo ? '⚡' : '🐌';
  slowmoBtn.querySelector('.icon').nextSibling.textContent = slowmo ? 'NORMAL' : 'SLO-MO';
  playSound(slowmo ? 150 : 600, 0.15, 'sine', 0.1);
});
```

### 3. Visual feedback — subtle vignette + color shift in slow-mo

Add a CSS class toggled on `#canvas-wrap` or a canvas overlay:

```javascript
// In the render loop, when slowmo is active:
if (slowmo) {
  ctx.save();
  // Subtle radial vignette
  const grad = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, W*0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
```

### 4. Interaction with pause

- If paused and slow-mo activated → unpause into slow-mo
- If slow-mo active and pause pressed → pause (slow-mo state preserved for resume)
- CLEAR resets slow-mo state

### 5. Tests

Add tests for:
- `btn-slowmo` exists and is clickable
- Toggling sets `engine.timing.timeScale` to 0.25 / 1
- Button text/icon swaps correctly
- Slow-mo + pause interaction

## Complexity

Low. ~30 lines of JS, 1 HTML button, optional vignette overlay. Uses built-in Matter.js API (`engine.timing.timeScale`) — no custom physics needed.
