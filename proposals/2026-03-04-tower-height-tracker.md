# Tower Height Tracker

**Impact:** medium-high
**Goal alignment:** "more fun, more surprising, more satisfying" — gives building a goal, makes destruction moments hit harder

## Why

The sandbox has incredible destruction tools but no emergent *building* goal. Players spawn objects and watch them fall — but there's no "how tall can I build?" feedback loop. A real-time tower height tracker creates two gameplay loops at once:

1. **Build loop** — careful stacking with a visible height record to beat
2. **Destroy loop** — the taller the tower, the more spectacular the collapse

Every great physics sandbox has this tension between construction and destruction. Right now Chaos Engine only has destruction.

## Changes

### 1. Tower Height Detection
Scan non-static bodies each frame. Find the highest point of the tallest connected vertical stack (bodies resting on each other within X tolerance). Track:
- Current tower height (in approximate "blocks")
- Session best height
- All-time best (persisted to localStorage)

### 2. Height HUD
Minimal CRT-styled readout in the top-right corner (near existing stats):
```
TOWER: 4 ▏ BEST: 7
```
- Appears only when tower ≥ 2 blocks tall
- Pulses green when approaching/beating record
- Flash + screen shake when record broken

### 3. Record-Breaking Celebration
When tower height exceeds session best:
- Brief screen flash (cyan, 100ms)
- "NEW RECORD" text floats up from tower top
- Small screen shake (3px)
- Synth chime ascending (C5→E5→G5, 50ms each)
- New best saved to localStorage

### 4. Tower Collapse Detection
When a tower ≥ 3 blocks collapses (height drops by 50%+ within 200ms):
- "TOPPLED!" text at collapse point
- Dust particles from base
- Satisfying low rumble sound

## Implementation Notes

**Height calculation approach:**
- Each render frame, find the highest non-static body whose Y < canvas midpoint
- Approximate height = (ground_Y - highest_body_top) / avg_block_size
- Don't need actual connectivity graph — simple vertical extent works for the "fun" metric
- Only update every 10 frames to avoid jitter

**Performance:** Negligible — one pass over bodies array, already iterated in render loop.

**No new dependencies.** Uses existing particle system, screen shake, sound system, and localStorage patterns.

## Diff

Changes to `index.html`:

1. Add state variables (~5 lines near existing state):
```js
let towerHeight = 0, towerBest = 0, towerAllTime = parseInt(localStorage.getItem('ce-tower-best') || '0');
let towerCollapseTimer = 0, lastTowerHeight = 0;
```

2. Add `updateTowerHeight()` function (~40 lines) called from render loop every 10th frame

3. Add tower HUD rendering in the existing `drawHUD()` or stats area (~15 lines)

4. Add collapse detection in `updateTowerHeight()` (~15 lines)

5. Add celebration effects using existing `particles.push()` and `playSound()` patterns (~20 lines)

**Total: ~95 lines added, 0 lines removed.**
