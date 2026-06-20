# Chain Link Tool: Auto-connecting metal links

**Impact:** high
**Goal alignment:** "more fun, more surprising, more satisfying" - adds a buildable physics material that turns loose objects into dangling bridges, wrecking rigs, traps, and improvised machines while preserving the current layout.

## Why

The sandbox already has ropes and wrecking balls, but there is no small, repeatable part for building flexible structures. A Chain Link tool gives players a tactile construction primitive: tap to drop a metal link, and it automatically connects to nearby chain links or objects. Players can build hanging chains, pendulums, drag nets, breakable-looking barriers, and odd little machines without any new layout region.

This is a feature upgrade, not a redesign. The only control change is one new object button inside the existing bottom `#toolbar` scrolling section.

## Changes

### Existing bottom toolbar
- Add a single tool button to `#toolbar`: `🔗 Chain`.
- Keep `#toolbar` and `#chaos-bar` as the two bottom horizontally scrolling sections.
- Do not add panels, drawers, sidebars, or new layout regions.

### Chain link behavior
- Add `chainLinks = []` state for placed links and their connection counts.
- Add `currentTool` support for `chain-link`.
- `spawnObject()` creates a small metal capsule/rounded rectangle body with moderate density, friction, and restitution.
- On spawn, find nearby eligible bodies within about 55px:
  - Prefer existing chain links.
  - Fall back to the nearest dynamic object if no chain link is nearby.
  - Skip walls, static UI-like bodies, and already over-connected links.
- Create up to two Matter.js constraints from the new link to nearby bodies so chains stay flexible instead of becoming rigid blocks.
- Play a short metallic click and emit a tiny cyan spark burst when a connection is made.

### Rendering
- Add a `chain-link` render case that draws a small rotated oval/rounded metal link with a hollow center and CRT cyan edge glow.
- Mark chain-link constraints so `drawConstraints()` renders them as alternating mini metal links, reusing the existing wrecking-ball chain visual style.

### Cleanup and tests
- Clear `chainLinks` during scene reset/clear.
- Update tests to expect one additional tool button and verify:
  - The `chain-link` toolbar button exists.
  - `spawnObject()` has a `case 'chain-link'`.
  - The code defines chain link state and uses `Constraint.create()` for chain connections.

## Diff

```html
<!-- Add inside existing #toolbar, near Rope/Wrecking -->
<button class="tool-btn" data-tool="chain-link" style="color:#99ccff;">
  <span class="icon">🔗</span>Chain
</button>
```

```javascript
// State
let chainLinks = []; // { body, connections }

// spawnObject()
case 'chain-link': {
  const link = Bodies.rectangle(x, y, 36, 12, {
    restitution: 0.25,
    friction: 0.35,
    density: 0.004,
    chamfer: { radius: 6 },
    label: 'chain-link',
    render: { type: 'chain-link', color: '#99ccff', width: 36, height: 12 }
  });
  link.material = 'metal';
  body = link;
  break;
}

// After adding the body to world:
connectChainLink(body);

function connectChainLink(link) {
  const candidates = Composite.allBodies(world)
    .filter(b => b !== link && b.label !== 'wall' && !b.isStatic)
    .map(b => ({ body: b, dist: Vector.magnitude(Vector.sub(b.position, link.position)) }))
    .filter(item => item.dist <= 55)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 2);

  candidates.forEach(({ body: target, dist }) => {
    const constraint = Constraint.create({
      bodyA: link,
      bodyB: target,
      length: Math.max(18, dist),
      stiffness: 0.7,
      damping: 0.08,
      render: { type: 'chain-link-constraint' }
    });
    Composite.add(world, constraint);
  });
}
```

## Testing Notes

- Existing DOM button tests should increase `.tool-btn` count by one.
- Add static pattern tests for `chainLinks`, `case 'chain-link':`, and `chain-link-constraint`.
- Run `npm test`.
