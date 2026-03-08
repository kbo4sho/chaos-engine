# Undo Last Action (Ctrl+Z / Undo Button)

**Impact:** high
**Goal alignment:** "more fun and more satisfying" — removes the fear of mistakes; players experiment more freely when they know they can undo

## Why

Every creative sandbox needs undo. Right now, if you accidentally spawn a block on top of your careful domino chain, your only option is Clear All (nuclear) or… nothing. The eraser proposal lets you tap-delete individual objects, but undo is faster and more intuitive — it reverses your *last action* without requiring you to find and target the object.

This is the #1 missing quality-of-life feature for the build→experiment→refine loop. Players who can undo freely build more ambitiously because mistakes are cheap.

## Changes

### Action History Stack
- Maintain an array `actionHistory` (max 50 entries) tracking spawned bodies
- Each entry: `{ type: 'spawn', bodyIds: [id1, ...], timestamp }`
- Multi-body spawns (seesaw = plank + pivot + constraint, wrecking ball = anchor + ball + chain) recorded as single undoable action
- Rope constraints tracked similarly

### Undo Trigger
- **Mobile:** New undo button (↩️) in the action bar alongside Clear, Pause, etc.
- **Desktop:** Ctrl+Z / Cmd+Z keyboard shortcut
- Button grays out when history is empty

### Undo Behavior
- Pop last entry from `actionHistory`
- Remove all associated bodies/constraints from Matter.js world
- Remove from tracking arrays (`conveyors`, `magnets`, `seesaws`, `wreckingBalls`, `ropes`, `portals`, etc.)
- Play a soft reverse-spawn sound (descending tone, ~100ms)
- Visual: brief fade-out at the object's last position (optional, low-priority)

### Edge Cases
- Clear All flushes the action history (can't undo a clear)
- Pause/unpause is not an undoable action
- Wind, gravity changes, anti-gravity toggle are not undoable (they're state toggles, not spawns)
- If an object was already destroyed (bomb exploded, fell off-screen), undo skips that entry silently
- Portal pairs: undoing one portal removes both

## Diff

```javascript
// Add to state declarations
let actionHistory = []; // stack of {type, bodyIds, constraintIds, meta}
const MAX_UNDO = 50;

function recordAction(bodies, constraints = [], meta = {}) {
  actionHistory.push({
    type: 'spawn',
    bodyIds: bodies.map(b => b.id),
    constraintIds: constraints.map(c => c.id),
    meta, // e.g. {trackingArray: 'conveyors', trackingIndex: conveyors.length - 1}
    timestamp: Date.now()
  });
  if (actionHistory.length > MAX_UNDO) actionHistory.shift();
  updateUndoButton();
}

function undoLastAction() {
  if (actionHistory.length === 0) return;
  const action = actionHistory.pop();
  
  // Remove constraints first
  for (const cId of action.constraintIds) {
    const constraint = world.constraints?.find(c => c.id === cId) 
      || Composite.allConstraints(world).find(c => c.id === cId);
    if (constraint) Composite.remove(world, constraint);
  }
  
  // Remove bodies
  for (const bId of action.bodyIds) {
    const body = Composite.allBodies(world).find(b => b.id === bId);
    if (body) {
      // Clean up tracking arrays
      conveyors = conveyors.filter(c => c.id !== bId);
      magnets = magnets.filter(m => m.body.id !== bId);
      portals = portals.filter(p => p.body?.id !== bId);
      // ... other tracking arrays
      
      Composite.remove(world, body);
    }
  }
  
  // Reverse-spawn sound
  playSound(600, 0.1, 'sine', 0.06); // soft descending blip
  updateUndoButton();
}

function updateUndoButton() {
  const btn = document.getElementById('btn-undo');
  if (btn) btn.style.opacity = actionHistory.length > 0 ? '1' : '0.3';
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLastAction();
  }
});
```

```html
<!-- Add to action bar, before Clear button -->
<button class="chaos-btn" id="btn-undo" style="opacity:0.3"><span class="icon">↩️</span>UNDO</button>
```

### Integration Points
Every `spawnObject()` call and multi-body spawn (seesaw, wrecking ball, etc.) needs a `recordAction()` call after adding to the world. This is ~15 insertions across the spawn switch cases, each one line.

## Testing Notes
- Test undo removes last spawned body
- Test undo with empty history is no-op  
- Test multi-body undo (seesaw removes all 3 pieces)
- Test Ctrl+Z triggers undo
- Test Clear All resets action history
- Test max history cap (51st spawn drops oldest entry)
