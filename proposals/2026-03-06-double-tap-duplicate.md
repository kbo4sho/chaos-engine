# Double-tap to duplicate object
**Impact:** high
**Goal alignment:** "more fun and more satisfying" — removes the tedium of repeatedly spawning and positioning identical objects; lets players build patterns, rows, and structures by cloning from a perfectly-placed original

## Why
Building anything structured (domino rows, block walls, pin formations) requires selecting the tool, tapping, repositioning mentally, tapping again. Double-tapping an existing object to spawn a clone slightly offset is the missing "copy-paste" of sandbox play. It's discoverable (accidental double-taps reveal it), requires zero new UI, and makes the build phase as fluid as the destroy phase.

Every great sandbox has fast duplication: Minecraft (place blocks rapidly), Algodoo (Ctrl+D), Garry's Mod (duplicator tool). Chaos Engine has none.

## Changes

### Interaction: double-tap detection on canvas
- Track last tap time and position on `pointerdown`
- If second tap within 300ms and within 30px of first tap, treat as double-tap
- On double-tap, find the body under the pointer using `Matter.Query.point()`
- If a body is found (non-static, non-ground), clone it

### Clone logic
- Read the body's `label` to determine object type
- Call the existing `spawnObject(type, x + 25, y - 10)` with a slight offset so the clone doesn't overlap exactly
- Play a short "pop" sound (reuse `playSound(600, 0.06, 'sine', 0.1)`)
- Brief white flash on the cloned object (0.1s)

### Edge cases
- Skip if current tool is `grab`, `draw`, `slomo`, or `rope` (these need their own tap behavior)
- Skip if body is static (ground, walls)
- Skip for compound objects (ragdoll, seesaw, wrecking ball) — their multi-body spawn is complex; clone only simple single-body objects
- Rate-limit: max 1 clone per 200ms to prevent spam

## Diff

```javascript
// Add near the top of the pointer handling section, after existing pointerdown handler:

let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;

// In the pointerdown handler, before spawn logic:
const now = Date.now();
const dx = x - lastTapX;
const dy = y - lastTapY;
const dist = Math.sqrt(dx * dx + dy * dy);

if (now - lastTapTime < 300 && dist < 30) {
  // Double-tap detected — try to clone object under pointer
  const bodies = Matter.Query.point(Composite.allBodies(world), { x, y });
  const cloneable = bodies.find(b =>
    !b.isStatic &&
    b.label !== 'ground' &&
    b.label !== 'wall' &&
    !['ragdoll', 'seesaw', 'wrecking', 'rope'].some(t => b.label.includes(t))
  );

  if (cloneable && !['grab', 'draw', 'slomo', 'rope'].includes(currentTool)) {
    const type = cloneable.label.split('-')[0] || cloneable.label;
    const oldTool = currentTool;
    currentTool = type;
    spawnObject(type, x + 25, y - 10);
    currentTool = oldTool;
    playSound(600, 0.06, 'sine', 0.1);
    lastTapTime = 0; // Reset to prevent triple-tap chains
    pointerDown = false;
    return;
  }
}

lastTapTime = now;
lastTapX = x;
lastTapY = y;
```

## Testing notes
- Test double-tap on ball → clone appears offset
- Test double-tap on empty canvas → normal spawn (no crash)
- Test double-tap on ground → no clone
- Test during grab mode → no clone (grab takes priority)
- Test rapid triple-tap → only one clone (rate limit)
