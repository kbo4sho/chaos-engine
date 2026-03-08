# Animated Clear: Vortex Drain

**Impact:** medium-high
**Goal alignment:** "more satisfying to play with" — the clear button is the most-used action between setups, and right now it's a dead moment. Turning it into a visual payoff makes the reset loop itself fun.

## Why

Every physics sandbox session follows a loop: build → chaos → clear → repeat. The clear is the transition point, and currently it's instant deletion — all objects just vanish. That's a missed opportunity. A 0.6s vortex animation where every object spirals toward the center and shrinks to nothing turns a utilitarian reset into a mini-spectacle. It rewards the player for having built up a messy scene ("look at all that getting sucked away") and creates a satisfying visual period at the end of each play cycle.

The best sandbox games make even cleanup feel good (Garry's Mod cleanup tool, Besiege reset). This is that.

## Changes

Modify the `btn-clear` click handler:

1. On click, calculate screen center point
2. For each non-static body, apply a force toward center (proportional to distance) over ~600ms
3. Simultaneously scale down each body's render size via a lerp
4. Add a spiral rotation (apply torque in consistent direction)
5. Spawn a small "vortex" particle effect at center (concentric spinning rings, cyan, fading)
6. Play a descending whoosh sound (high→low frequency sweep, ~0.5s)
7. After 600ms, do the actual removal (existing cleanup logic)
8. Disable spawning during the animation to prevent weird interactions

Edge cases:
- If scene has 0 objects, skip animation (instant clear as before)
- If user taps clear again during animation, force-complete immediately
- Balloons (negative gravity) still get pulled in — force overrides buoyancy during clear

## Diff

```javascript
// Replace the instant clear handler with:
let clearAnimating = false;

document.getElementById('btn-clear').addEventListener('click', () => {
  if (clearAnimating) {
    // Double-tap: force immediate clear
    finishClear();
    return;
  }
  
  const allBodies = Composite.allBodies(world);
  const dynamicBodies = allBodies.filter(b => !b.isStatic);
  
  if (dynamicBodies.length === 0) {
    finishClear(); // Nothing to animate
    return;
  }
  
  clearAnimating = true;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const duration = 600;
  const start = performance.now();
  
  // Descending whoosh sound
  const a = getAudioCtx();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain);
  gain.connect(a.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, a.currentTime + 0.5);
  gain.gain.setValueAtTime(0.12, a.currentTime);
  gain.gain.linearRampToValueAtTime(0, a.currentTime + 0.6);
  osc.start();
  osc.stop(a.currentTime + 0.6);
  
  // Vortex particle at center
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    particles.push({
      x: cx + Math.cos(angle) * 30,
      y: cy + Math.sin(angle) * 30,
      vx: -Math.cos(angle) * 2,
      vy: -Math.sin(angle) * 2,
      life: 40,
      maxLife: 40,
      color: '#0abdc6',
      radius: 3
    });
  }
  
  function vortexStep() {
    const elapsed = performance.now() - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = t * t; // ease-in for accelerating pull
    
    dynamicBodies.forEach(b => {
      if (!Composite.get(world, b.id, 'body')) return;
      const dx = cx - b.position.x;
      const dy = cy - b.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = 0.008 * eased * b.mass;
      Body.applyForce(b, b.position, {
        x: (dx / dist) * force,
        y: (dy / dist) * force
      });
      Body.setAngularVelocity(b, b.angularVelocity + 0.05);
      // Scale down render
      if (b.render) b.render.vortexScale = 1 - eased * 0.8;
    });
    
    if (t < 1) {
      requestAnimationFrame(vortexStep);
    } else {
      finishClear();
    }
  }
  
  requestAnimationFrame(vortexStep);
});

// In render code, multiply drawn size by (body.render.vortexScale || 1)
```

The `finishClear()` function contains all existing cleanup logic. The render scaling requires a one-line multiply in each object's draw function (e.g., `const scale = body.render.vortexScale || 1;` applied to radius/width/height).

## Testing Notes

- Add test: "clear button with objects triggers vortex animation" (verify bodies exist for 600ms then removed)
- Add test: "clear button with empty scene skips animation"  
- Add test: "double-tap clear force-completes immediately"
- Existing clear tests continue to verify final state is clean
