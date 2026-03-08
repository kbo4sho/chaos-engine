# Grow/Shrink Tool — Tap Objects to Resize Them

**Impact:** high  
**Goal alignment:** "more fun, more surprising, and more satisfying" — discovering you can make a duck the size of a house or shrink an anvil to a pebble is a pure delight moment. Enables emergent play: giant bowling pins, tiny bombs, mismatched Rube Goldberg chains.

**Why:** Every object spawns at a semi-random but constrained size. There's no way to modify objects after creation. A grow/shrink tool adds a new verb to the sandbox that multiplies the creative space of every existing object type without adding new objects. It's the highest-leverage interaction addition because it compounds with everything already in the game.

## UX Design

**Two new tool buttons** in the object toolbar:
- 🔍+ **GROW** — tap any non-static object to scale it up 1.5×  
- 🔍- **SHRINK** — tap any non-static object to scale it down to 0.67×

**Constraints:**
- Min scale: 0.25× original (prevents invisibly small objects)
- Max scale: 4× original (prevents physics instability from enormous bodies)
- Each tap applies one step of scaling (not continuous — deliberate, satisfying clicks)
- Static objects (trampolines, conveyors, fans, magnets, bumpers) are excluded
- Composites (cars, ragdolls, wrecking balls) are excluded (too complex to rescale reliably)

**Feedback per tap:**
- Size change animates over ~150ms (not instant — satisfying rubber-band feel)
- Pitch-shifted sound: growing = descending tone, shrinking = ascending tone
- Small particle burst matching object color
- Mass scales with area (density stays constant) so physics stays natural

## Implementation

### 1. Add tool buttons (HTML)
After the existing rope button in the toolbar:
```html
<button class="tool-btn" data-tool="grow" style="color:#44ff88;"><span class="icon">🔍</span>Grow</button>
<button class="tool-btn" data-tool="shrink" style="color:#ff8844;"><span class="icon">🔎</span>Shrink</button>
```

### 2. Add resize logic (JS)

```javascript
// In onDown handler, when currentTool is 'grow' or 'shrink':
if (currentTool === 'grow' || currentTool === 'shrink') {
  const pos = getPointerPos(e);
  const bodies = Composite.allBodies(world);
  
  // Find clicked body via point query
  const clicked = bodies.find(b => {
    if (b.isStatic) return false;
    if (b.parent !== b) return false; // skip composite parts
    return Matter.Bounds.contains(b.bounds, pos) && 
           Matter.Vertices.contains(b.vertices, pos);
  });
  
  if (!clicked) return;
  
  // Track cumulative scale
  if (!clicked._scaleLevel) clicked._scaleLevel = 1;
  
  const factor = currentTool === 'grow' ? 1.5 : 0.667;
  const newScale = clicked._scaleLevel * factor;
  
  // Enforce bounds
  if (newScale < 0.25 || newScale > 4) {
    playSound(200, 0.1, 'square', 0.05); // "nope" sound
    return;
  }
  
  // Apply scale
  Body.scale(clicked, factor, factor);
  clicked._scaleLevel = newScale;
  
  // Update render properties for custom drawing
  const r = clicked.render;
  if (r.radius) r.radius *= factor;
  if (r.size) r.size *= factor;
  if (r.width) r.width *= factor;
  if (r.height) r.height *= factor;
  if (r.outerR) r.outerR *= factor;
  
  // Sound: pitch shifts with size
  if (currentTool === 'grow') {
    playSound(400 / newScale, 0.15, 'sine', 0.1);
  } else {
    playSound(200 * newScale, 0.15, 'sine', 0.1);
  }
  
  // Particle burst
  const cx = clicked.position.x, cy = clicked.position.y;
  const burstColor = r.color || '#00ff41';
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
      size: 3, life: 0.3, color: burstColor
    });
  }
  
  // Screen shake proportional to scale
  shakeIntensity = Math.min(newScale * 2, 8);
  
  pointerDown = false;
  return;
}
```

### 3. Update test count
Add tests for:
- Grow button exists and selects tool
- Shrink button exists and selects tool
- Body.scale is called on non-static body click
- Scale bounds enforced (can't exceed 4× or go below 0.25×)
- Static bodies are not affected

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Physics instability at large scales | Hard cap at 4× with "nope" feedback |
| Render properties out of sync | Explicitly update all render size props |
| Composites break when scaled | Exclude composites entirely |
| Performance with many large objects | Matter.js handles this fine; scale cap prevents abuse |

## Why Not Something Else

This was chosen over other candidates because:
- **Zero new physics concepts** — uses existing `Body.scale()` API
- **Multiplies existing content** — every object becomes a family of sizes
- **Discovery moment** — "wait, I can make things BIGGER?" is inherently delightful
- **Pairs with everything** — giant duck + slingshot, tiny bomb in a domino line, huge beachball bowling
