# Pinball Flippers

**Impact:** high
**Goal alignment:** "more fun, more surprising, more satisfying" — flippers turn the sandbox into an emergent pinball table. Combined with bumpers, pins, balls, and ramps, players discover pinball gameplay without being told. The active "hit the ball" moment is fundamentally different from passive spawning — it's the first object that demands timing and skill.

**Why:** Every object in the sandbox is either passive (blocks, pins, dominoes) or set-and-forget (fans, magnets, conveyors). Nothing requires real-time player skill. Pinball flippers change that — they're placeable paddles that fire upward on tap/key press, demanding timing and creating the "one more try" loop that makes pinball machines eat quarters. Players who discover they can build a full pinball table from existing parts (bumpers + flippers + pins + ramps + balls) will lose an hour.

## Changes

### New tool: Flipper (🏓)
- Add `flipper-left` and `flipper-right` to the toolbar (or a single `flipper` that alternates, keeping toolbar compact)
- Each flipper is a rectangular body pinned at one end via `Matter.Constraint`
- **Activation:** Tap the flipper directly, or use `Z` (left) / `/` (right) keys — matching arcade pinball layout
- On activation: apply angular impulse to swing upward ~60°, then gravity returns it. Spring-damped via constraint stiffness
- Visual: colored paddle shape with a pivot dot, subtle glow on activation
- Sound: satisfying thwack (short square wave burst, pitch-shifted by hit velocity)

### Implementation sketch (~80 lines)
```javascript
// In spawnObject():
case 'flipper': {
  const isLeft = flippers.length % 2 === 0; // alternate L/R
  const w = 100, h = 14;
  const pivotX = isLeft ? x - w/2 : x + w/2;
  const body = Matter.Bodies.rectangle(x, y, w, h, {
    label: 'flipper', density: 0.005,
    render: { fillStyle: '#ff6600' },
    collisionFilter: { category: 0x0001 }
  });
  const pin = Matter.Constraint.create({
    pointA: { x: pivotX, y },
    bodyB: body,
    pointB: { x: isLeft ? -w/2 : w/2, y: 0 },
    stiffness: 0.9, length: 0
  });
  // Store flipper metadata for activation
  body.flipperSide = isLeft ? 'left' : 'right';
  Matter.Composite.add(engine.world, [body, pin]);
  flippers.push({ body, pin, side: body.flipperSide });
  break;
}

// Activation (in keydown/touch handler):
function activateFlipper(side) {
  flippers.filter(f => f.side === side).forEach(f => {
    const dir = side === 'left' ? -1 : 1;
    Matter.Body.setAngularVelocity(f.body, dir * -0.3);
    playSound(600, 0.06, 'square', 0.15); // thwack
  });
}
```

### UI additions
- Toolbar button: `<button class="tool-btn" data-tool="flipper" style="color:#ff6600;"><span class="icon">🏓</span>Flip</button>`
- Keyboard hint in any future shortcut overlay: `Z = left flipper, / = right flipper`

### Edge cases
- Multiple flipper pairs: all left flippers fire together, all right fire together (like real multi-flipper tables)
- Grab tool interaction: flippers can be grabbed and repositioned like any object
- Clear All: flippers array cleared alongside world
- No flipper limit needed — physics handles density naturally

## Diff

Toolbar HTML: +1 button
JavaScript: ~80 lines (spawn case, activation handler, flipper array management)
Tests: +3-5 tests (flipper spawns, constraint exists, activation changes angular velocity)
