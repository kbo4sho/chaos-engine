# Causal Chain Detection & Celebration

**Impact:** high  
**Goal alignment:** "more surprising and more satisfying" — rewards creative Rube Goldberg setups with escalating fanfare, turning accidental chain reactions into moments of delight

**Why:**  
Players already try to build chain reactions (domino → ball → bomb → explosion), but the game has no awareness of causal sequences. A combo system tracks rapid impacts (burst damage), and the destruction meter tracks cumulative energy — but neither recognizes that object A knocked into B which triggered C which caused D to explode.

Detecting and celebrating causal chains would:
1. Reward the most creative play pattern (setup → trigger → watch cascade)
2. Create "holy shit" moments when accidental chains go long
3. Give players an implicit goal (beat their longest chain) without any new UI beyond a brief overlay
4. Make every object interaction feel more meaningful — any collision could be the start of a chain

## Changes

### Causal chain tracker (in collision handler)
- On each `collisionStart`, record `{ hitter → target }` with timestamp
- A "chain" is a sequence where the target of collision N becomes the hitter (or causal agent) of collision N+1 within a short time window (~500ms)
- Track the chain length in a `currentChain` variable

### Chain celebration (escalating feedback)
| Chain length | Feedback |
|---|---|
| 3 | Subtle flash + "x3" text popup |
| 5 | Screen shake + rising pitch chime + "x5 CHAIN!" |
| 7 | Chromatic aberration + bass boom + "x7 MEGA CHAIN!" |
| 10+ | Full-screen flash + all-the-juice + "x10 LEGENDARY!" + record check |

### Chain record
- Store longest chain in `localStorage` alongside existing records
- Brief "NEW RECORD!" overlay when beaten (reuse existing CRT text style)

### Implementation notes
- Track causality via `lastCollidedBy` property on each body — set to the other body's ID on collision
- Chain detection: when body B (which was hit by A) subsequently hits C, that's chain link A→B→C
- Time window: only count if B→C happens within 500ms of A→B
- Bombs exploding count as chain links for everything in the blast radius (bomb was "hitter")
- Domino-to-domino collisions are the primary chain type but any object-to-object sequence counts
- ~80 lines of JS total: ~30 for tracking, ~30 for celebration rendering, ~20 for record/display

## Diff (pseudocode)

```javascript
// ── CAUSAL CHAIN TRACKING ──
let chainLength = 0;
let chainTimer = 0;
let chainRecord = parseInt(localStorage.getItem('chaos-chain-record') || '0');
let chainDisplay = null; // { length, x, y, timer }

// In collisionStart handler, after existing logic:
if (relVel > 2 && !impactBodyA.isStatic && !impactBodyB.isStatic) {
  const now = performance.now();
  // If bodyA was recently hit (within 500ms), this extends the chain
  if (impactBodyB.lastHitTime && (now - impactBodyB.lastHitTime) < 500) {
    chainLength = (impactBodyB.chainDepth || 1) + 1;
    impactBodyA.chainDepth = chainLength;
  } else {
    chainLength = 1;
    impactBodyA.chainDepth = 1;
  }
  impactBodyA.lastHitTime = now;
  
  if (chainLength >= 3) {
    triggerChainCelebration(chainLength, contact.x, contact.y);
  }
}

function triggerChainCelebration(length, x, y) {
  chainDisplay = { length, x, y, timer: 1.5 };
  
  if (length >= 5) shakeIntensity = Math.max(shakeIntensity, length);
  if (length >= 7) chromaticAberration = Math.max(chromaticAberration, length * 0.8);
  if (length >= 10) { /* full screen flash */ }
  
  // Rising pitch chime based on chain length
  playSound(400 + length * 100, 0.15, 'sine', 0.1);
  
  if (length > chainRecord) {
    chainRecord = length;
    localStorage.setItem('chaos-chain-record', chainRecord.toString());
    chainDisplay.isRecord = true;
  }
}

// In render loop, draw chain popup:
if (chainDisplay && chainDisplay.timer > 0) {
  const alpha = Math.min(chainDisplay.timer, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${24 + chainDisplay.length * 2}px 'VT323', monospace`;
  ctx.fillStyle = chainDisplay.length >= 7 ? '#ff3399' : '#ffdd00';
  ctx.textAlign = 'center';
  const label = chainDisplay.length >= 10 ? 'LEGENDARY!' 
    : chainDisplay.length >= 7 ? 'MEGA CHAIN!' : 'CHAIN!';
  ctx.fillText(`x${chainDisplay.length} ${label}`, chainDisplay.x, chainDisplay.y - 30);
  if (chainDisplay.isRecord) {
    ctx.font = "18px 'VT323', monospace";
    ctx.fillStyle = '#00ff41';
    ctx.fillText('NEW RECORD!', chainDisplay.x, chainDisplay.y - 55);
  }
  ctx.restore();
  chainDisplay.timer -= dt;
}
```

## Testing approach
- Unit test: chain detection logic (mock collision sequence with timestamps)
- Unit test: celebration thresholds (3, 5, 7, 10)
- Unit test: record persistence (localStorage mock)
- Integration: verify chain counter doesn't fire for simultaneous unrelated collisions
