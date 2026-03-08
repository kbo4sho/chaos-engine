# Rare Object Variants

**Impact:** high  
**Goal alignment:** "more surprising" — creates organic discovery moments without any new UI

## Why

Every spawn is predictable. A ball is always the same ball. A block is always the same block. There's no "wait, what was THAT?!" moment. Adding rare variants (5-8% spawn chance) gives every tap a slot-machine quality — most of the time it's normal, but occasionally something special appears and changes the scene dynamics.

This amplifies every existing feature. Bombs, slingshot, rain, shuffle — anything that spawns objects now has a chance to surprise.

## Changes

Add a `rollVariant(body, type)` function called after `spawnObject` creates the Matter.js body. On a random roll (configurable, default ~6%), apply one of these modifiers:

### Variant Types

| Variant | Visual | Physics | Rarity |
|---------|--------|---------|--------|
| **Golden** | Gold tint + subtle glow trail | 2× restitution (super bouncy) | 2% |
| **Glass** | Semi-transparent, white-ish tint | Shatters into 4-6 smaller pieces on first hard impact (relVel > 4) | 2% |
| **Giant** | 2.5× scale | 3× mass, same density | 1% |
| **Tiny** | 0.4× scale | 0.2× mass | 1% |
| **Ghostly** | Pulsing low-opacity, cyan glow | Passes through static bodies for 3s, then solidifies | 0.5% |

### Implementation

1. **In `spawnObject()`** — after the body is created and added to world, call `rollVariant(body, type)`:

```javascript
function rollVariant(body, type) {
  // Skip static/special objects
  if (body.isStatic || body.isBomb || body.isTarget) return;
  
  const roll = Math.random();
  if (roll < 0.005) {
    applyVariant(body, 'ghostly');
  } else if (roll < 0.015) {
    applyVariant(body, 'giant');
  } else if (roll < 0.025) {
    applyVariant(body, 'tiny');
  } else if (roll < 0.045) {
    applyVariant(body, 'glass');
  } else if (roll < 0.065) {
    applyVariant(body, 'golden');
  }
}

function applyVariant(body, variant) {
  body.variant = variant;
  
  switch(variant) {
    case 'golden':
      body.restitution = Math.min((body.restitution || 0.5) * 2, 1.0);
      // Render handles the gold tint
      break;
    case 'glass':
      body.isGlass = true;
      // Shatter logic added to collision handler
      break;
    case 'giant':
      Body.scale(body, 2.5, 2.5);
      break;
    case 'tiny':
      Body.scale(body, 0.4, 0.4);
      break;
    case 'ghostly':
      body.collisionFilter = { ...body.collisionFilter, mask: 0x0002 }; // only dynamic
      body.ghostTimer = 3.0;
      break;
  }
  
  // Spawn announcement particle burst
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const variantColors = {
      golden: '#ffd700', glass: '#ffffff', giant: '#ff6600',
      tiny: '#66ffcc', ghostly: '#0abdc6'
    };
    particles.push({
      x: body.position.x, y: body.position.y,
      vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
      life: 0.6, color: variantColors[variant], size: 3
    });
  }
}
```

2. **In render loop** — add variant-specific rendering:
   - Golden: draw with `globalAlpha` shimmer + gold `strokeStyle` halo
   - Glass: draw with `globalAlpha: 0.5` + white highlight
   - Giant/Tiny: handled by Matter.js scale (no render change needed beyond size)
   - Ghostly: pulsing `globalAlpha` between 0.2-0.6 + cyan glow

3. **In collision handler** — add glass shatter:
   - On `collisionStart`, if body `isGlass` and `relVel > 4`: remove body, spawn 4-6 small triangular fragments with inherited velocity + random spread, play tinkling sound

4. **In update loop** — tick ghost timer, restore collision mask when expired

### Spawn notification
When a variant spawns, briefly flash a small label near it: "✨ GOLDEN!" / "💎 GLASS!" / etc. Fades in 1.5s. Adds to the surprise moment.

## What This Doesn't Touch
- No new buttons or UI elements
- No new tools or object types
- No changes to existing object behavior (only adds to new spawns)
- No new dependencies

## Why Not Something Else
- This multiplies the surprise factor of every existing spawn mechanism (tap, rain, slingshot, shuffle)
- Zero UI complexity added — it's purely emergent discovery
- Each variant is simple to implement individually; can ship subset if needed
- Glass shatter is the "block shattering" concept from a previous proposal, but scoped to rare variants (less overwhelming, more special)
