# Bomb Chain Reactions

**Impact:** high
**Goal alignment:** "more surprising and more satisfying" — cascading explosions create emergent Rube Goldberg moments from simple setups

## Why

Right now, when a bomb explodes it pushes nearby objects but doesn't trigger other bombs. This means placing multiple bombs is just "more of the same." With chain reactions, placing 5 bombs in a line creates a cascading detonation sequence — each explosion triggering the next with a slight delay. Players discover this organically and immediately start engineering chain reaction setups. It's the single highest surprise-per-line-of-code improvement available.

The staggered timing (50ms delay per chain link) creates a satisfying "pop-pop-pop-POP" rhythm instead of one simultaneous blast. Combined with existing screen shake (which accumulates), a 5-bomb chain will feel seismic.

## Changes

In `explodeBomb()`, after applying force to nearby bodies, check if any nearby body is a bomb and schedule it to explode after a short delay. Add a guard to prevent double-detonation (bombs already queued).

## Diff

```javascript
// In explodeBomb(), after the allBodies.forEach force loop (around line 1138),
// add before the Composite.remove call:

  // Chain reaction — trigger nearby bombs with staggered delay
  let chainDelay = 0;
  allBodies.forEach(b => {
    if (b === bomb || b.isStatic || !b.isBomb) return;
    if (b._chainQueued) return; // already scheduled
    const dx = b.position.x - pos.x;
    const dy = b.position.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius * 0.8) { // slightly tighter than force radius
      chainDelay += 50; // stagger each bomb by 50ms
      b._chainQueued = true;
      setTimeout(() => {
        if (Composite.get(world, b.id, 'body')) {
          explodeBomb(b);
        }
      }, chainDelay);
    }
  });
```

Also need to confirm bombs have `isBomb` set. Check spawn code:

```javascript
// In spawnObject(), case 'bomb' (around line 643):
// Verify the body has: isBomb: true
// Current code already sets label but need to check for isBomb property
```

If `isBomb` isn't already a property, add it in the bomb case:
```javascript
    case 'bomb': {
      body = Bodies.circle(spawnX, spawnY, 18, {
        ...opts,
        isBomb: true, // add this if not present
        render: { type:'bomb', color:'#ff3333' }
      });
      break;
    }
```

And in the click-to-explode handler, verify `b.isBomb` is used (line ~1766):
```javascript
    if (b.isBomb && Matter.Bounds.contains(b.bounds, pos)) {
```

This already checks `b.isBomb`, confirming the property exists on bomb bodies. ✓

## Test coverage needed

- Chain reaction triggers: place 2 bombs adjacent, explode one, verify second detonates
- Chain doesn't infinite loop: verify `_chainQueued` guard prevents re-triggering
- Non-bomb objects unaffected: verify balls near explosion don't trigger chain logic
- Stagger timing: verify delays accumulate (50ms, 100ms, 150ms...)
