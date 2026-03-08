# Destruction Level-Up Celebration

**Impact:** high  
**Goal alignment:** "more surprising and more satisfying" — the destruction meter silently crosses thresholds with zero fanfare. Adding a celebration moment turns gradual chaos accumulation into punctuated rewards.

**Why:** The destruction meter already tracks chaos across 7 levels (CALM → GODLIKE), but level transitions are invisible — the label just changes. Players never get that dopamine hit of "I just leveled up." A confetti burst, screen flash, and ascending chime at each threshold transforms passive tracking into active reward feedback. Every level-up becomes a "hell yeah" moment.

## Changes

### 1. Track previous destruction level (1 line)

Add a `let lastDestructionLevel = 0;` alongside the existing `destructionMeter` variable (~line 343).

### 2. Detect level-up in the render/update loop (~15 lines)

In the destruction meter drawing section (~line 4370), after computing `level`, compare against `lastDestructionLevel`. On change:

```javascript
// After: const lvl = Math.min(level, levelNames.length - 1);
if (level > lastDestructionLevel && lastDestructionLevel >= 0) {
  // Confetti burst — 40 particles in level color + white + gold
  const burstColors = [col, '#ffffff', '#ffdd00', '#ff3399', '#00ff41'];
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 8;
    particles.push({
      x: meterX + meterW / 2,
      y: meterY - meterH / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3, // bias upward
      life: 0.8 + Math.random() * 0.6,
      color: burstColors[Math.floor(Math.random() * burstColors.length)],
      size: 2 + Math.random() * 4
    });
  }

  // Screen flash
  destructionFlash = 1;
  shakeIntensity = Math.max(shakeIntensity, 8);

  // Ascending chime — pitch rises with level
  const baseFreq = 400 + lvl * 150;
  playSound(baseFreq, 0.15, 'sine', 0.12);
  setTimeout(() => playSound(baseFreq * 1.25, 0.12, 'sine', 0.10), 80);
  setTimeout(() => playSound(baseFreq * 1.5, 0.2, 'sine', 0.08), 160);
}
lastDestructionLevel = level;
```

### 3. Reset level on clear (~1 line)

In the clear button handler (~line 1606), add `lastDestructionLevel = 0;` alongside `destructionMeter = 0;`.

## Why this works

- **Zero new dependencies** — uses existing particle, shake, flash, and sound systems
- **~20 lines of code** — minimal surface area
- **Rewards the core loop** — more chaos → level up → celebration → want more chaos
- **Surprise factor** — first level-up is an unexpected delight; higher levels feel increasingly epic with rising pitch
- **Pairs with everything** — bombs, explosions, slingshots, chaos buttons all feed the meter

## What it doesn't do

- No UI changes to the meter itself (it already looks good)
- No new object types or tools
- No gameplay mechanics change — purely audiovisual feedback
