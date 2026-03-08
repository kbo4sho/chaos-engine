# Save & Load Scenes

**Impact:** high
**Goal alignment:** "more fun and more satisfying" — players build elaborate setups (domino chains, Rube Goldberg machines, Jenga towers) but lose everything on clear or page refresh. Save/load transforms throwaway experiments into replayable creations. Build once, destroy many ways.

**Why:** The sandbox has 25+ object types, ropes, portals, magnets, seesaws — incredible creative depth. But zero persistence. A player who spends 5 minutes building the perfect domino chain watches it topple once and it's gone forever. Save/load closes the loop: build → save → destroy → reload → destroy differently.

## Changes

### New UI
- Two buttons in the chaos toolbar (safe section, near SNAP/CLEAR):
  - 💾 **SAVE** — serializes current scene to localStorage
  - 📂 **LOAD** — restores last saved scene
- Optional: hold SAVE to show slot picker (slots 1-3), tap for quick-save to slot 1

### Serialization
Serialize all Matter.js bodies and constraints to a JSON snapshot:

```js
function serializeScene() {
  const bodies = Composite.allBodies(engine.world)
    .filter(b => !b.isStatic || b.label === 'seesaw-plank') // skip walls
    .map(b => ({
      label: b.label,
      position: { x: b.position.x, y: b.position.y },
      angle: b.angle,
      velocity: { x: b.velocity.x, y: b.velocity.y },
      isStatic: b.isStatic,
      // Store custom properties needed to reconstruct
      objectType: b.objectType,
      material: b.material,
      color: b.render?.fillStyle,
      width: b.width,
      height: b.height,
      radius: b.circleRadius,
    }));
  
  const constraints = Composite.allConstraints(engine.world)
    .filter(c => c.label !== 'wall') // skip wall constraints
    .map(c => ({
      label: c.label,
      bodyAIndex: bodies.findIndex(b => b === c.bodyA),
      bodyBIndex: bodies.findIndex(b => b === c.bodyB),
      pointA: c.pointA,
      pointB: c.pointB,
      length: c.length,
      stiffness: c.stiffness,
    }));

  return JSON.stringify({ bodies, constraints, gravity: engine.gravity });
}
```

### Deserialization
- Clear current scene (reuse existing clear logic)
- Reconstruct each body using `spawnObject` or direct `Bodies.create` based on `objectType`
- Reconstruct constraints (ropes, seesaws, wrecking ball chains)
- Restore gravity setting

### Edge cases
- Portal pairs: save portal positions and re-link on load
- Magnets: save attract/repel state
- Wrecking balls: save as compound (ball + chain + anchor)
- Seesaws: reconstruct plank + pivot + constraint

### Feedback
- Save: brief green flash + "💾 Scene saved!" notification (reuse existing notification system)
- Load: brief blue flash + "📂 Scene loaded!" notification
- Sound: reuse existing UI sounds (playSpawn for save, playBounce for load)

### Storage
- `localStorage.setItem('chaos-scene-1', serialized)`
- Max 3 slots, ~50KB each (more than enough for complex scenes)
- Graceful fallback if localStorage unavailable (hide buttons)

## Complexity
Medium — the serialization needs careful handling of each object type's reconstruction, but the game already has `spawnObject()` covering all types. Main challenge is constraints/compound bodies (ragdolls, cars, wrecking balls, seesaws).

## Diff
Not included (propose mode) — implementation touches:
- HTML: 2 new buttons in chaos toolbar safe section
- JS: `serializeScene()`, `deserializeScene()`, button handlers
- CSS: minimal (reuse existing `.chaos-btn.safe` styling)
- Estimated: ~150-200 lines of JS

## Testing
- Serialize empty scene → load → verify empty
- Serialize scene with basic bodies → load → verify positions/types match
- Serialize scene with constraints → load → verify constraints reconnected
- Save/load across page refresh → verify persistence
- Multiple save slots → verify independence
