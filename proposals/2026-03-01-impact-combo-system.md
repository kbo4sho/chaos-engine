# Impact Combo System

**Impact:** high  
**Goal alignment:** "more surprising and more satisfying" — combos reward chaos with escalating audiovisual feedback, turning random collisions into moments of delight  
**Why:** The destruction meter tracks cumulative energy but there's no reward for *bursts* of chaos. A combo counter that fires when multiple hard impacts happen within a short window creates a feedback loop: more chaos → bigger reward → desire for more chaos. This is the core satisfaction mechanic in games like Burnout, Peggle, and pinball.

## Changes

### New state variables (after existing `destructionMeter` vars ~line 340)
```javascript
let comboCount = 0;
let comboTimer = 0;        // frames remaining in combo window
const COMBO_WINDOW = 90;   // 1.5s at 60fps to chain hits
const COMBO_MIN_VEL = 5;   // minimum relVel to count as a combo hit
let comboBest = 0;         // session best combo
let comboFlash = 0;        // visual flash intensity
```

### Collision handler addition (inside the `relVel > 2` block, ~line 2040)
After the existing confetti burst block (`if (relVel > 8)`), add:

```javascript
// ── COMBO SYSTEM ──
if (relVel > COMBO_MIN_VEL) {
  if (comboTimer > 0) {
    comboCount++;
    comboFlash = 1;
  } else {
    comboCount = 1;
  }
  comboTimer = COMBO_WINDOW;

  if (comboCount > comboBest) comboBest = comboCount;

  // Escalating rewards
  if (comboCount >= 3) {
    // Rising pitch with each hit in the combo
    const pitch = 400 + comboCount * 80;
    playSound(Math.min(pitch, 2000), 0.08, 'sine', 0.06 + Math.min(comboCount * 0.01, 0.1));

    // Extra particles scale with combo
    const extraCount = Math.min(comboCount * 2, 20);
    const comboColors = ['#ffdd00', '#ff3399', '#00ff41', '#0abdc6', '#ff6600', '#cc00ff'];
    for (let c = 0; c < extraCount; c++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      particles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1.0 + Math.random() * 0.5,
        color: comboColors[Math.floor(Math.random() * comboColors.length)],
        size: 3 + Math.random() * 3,
        isConfetti: true
      });
    }
  }

  // Milestone bursts at 5, 10, 20, 50
  if ([5, 10, 20, 50].includes(comboCount)) {
    shakeIntensity = Math.max(shakeIntensity, 8 + comboCount * 0.3);
    chromaticAberration = Math.max(chromaticAberration, 5 + comboCount * 0.2);
    playBoom();
  }
}
```

### Main loop update (inside `loop()`, before render section ~line 3769)
```javascript
// Combo timer decay
if (comboTimer > 0) {
  comboTimer--;
  if (comboTimer <= 0 && comboCount >= 3) {
    // Combo ended — brief slowdown for dramatic effect
    // (only if combo was impressive)
    comboCount = 0;
  }
}
if (comboFlash > 0) comboFlash -= dt * 3;
```

### HUD rendering (near the destruction meter rendering, ~line 4395)
```javascript
// Combo counter display (only when active and >= 3)
if (comboCount >= 3 && comboTimer > 0) {
  const comboScale = 1 + Math.min(comboCount * 0.05, 0.5);
  const flashAlpha = 0.7 + comboFlash * 0.3;
  ctx.save();
  ctx.globalAlpha = flashAlpha;
  ctx.font = `${Math.floor(28 * comboScale)}px 'VT323', monospace`;
  ctx.textAlign = 'center';

  // Glow effect
  ctx.shadowColor = '#ffdd00';
  ctx.shadowBlur = 10 + comboCount;
  ctx.fillStyle = comboCount >= 20 ? '#ff3399' : comboCount >= 10 ? '#ff6600' : '#ffdd00';
  ctx.fillText(`${comboCount}x COMBO`, canvas.width / 2, 80);

  // Sub-text for milestones
  if (comboCount >= 50) {
    ctx.font = "18px 'VT323', monospace";
    ctx.fillStyle = '#ff3399';
    ctx.fillText('LEGENDARY', canvas.width / 2, 105);
  } else if (comboCount >= 20) {
    ctx.font = "18px 'VT323', monospace";
    ctx.fillStyle = '#ff6600';
    ctx.fillText('UNSTOPPABLE', canvas.width / 2, 105);
  } else if (comboCount >= 10) {
    ctx.font = "18px 'VT323', monospace";
    ctx.fillStyle = '#ffdd00';
    ctx.fillText('ON FIRE', canvas.width / 2, 105);
  }

  ctx.restore();
}
```

## Why This Works

1. **Emergent gameplay** — Players discover combos organically. Drop a bunch of objects, hit the anti-gravity button, watch the combo counter climb. It rewards experimentation.
2. **Escalating feedback** — Rising pitch, growing particles, color shifts, and milestone screen shakes create a crescendo that feels *amazing*.
3. **Zero new UI** — No buttons, no settings. It just appears when chaos happens.
4. **Pairs with existing features** — Bowling pins, Jenga tower, bombs, bumpers, and the chaos button all naturally trigger combos. Every existing feature becomes more fun.
5. **Session memory** — `comboBest` creates a soft goal ("can I beat my 23x combo?") without any formal scoring system.

## Complexity

~80 lines of code. No new dependencies. No architectural changes. Touches: collision handler, main loop, render section.
