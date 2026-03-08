# Balloon Popping on Hard Impact

**Impact:** medium-high
**Goal alignment:** "more surprising and more satisfying" — balloons currently float forever. Popping them on hard impact creates a discovery moment ("wait, they POP?!") and a satisfying micro-reward loop (aim slingshot → pop balloon → colorful burst + pop sound).

**Why:** Balloons are one of the most visually distinct objects but they have no unique interaction beyond floating. Adding a pop threshold turns them from passive decoration into targets. Players will naturally start aiming at them, creating emergent gameplay without any UI changes. The pop itself — a quick color-matched confetti burst, a cartoonish pop sound, and the balloon vanishing — is pure sensory satisfaction.

## Changes

In the `collisionStart` event handler, add a check for balloon bodies:

1. When a balloon collides with any non-static body at `relVel > 5` (moderate impact), OR when a balloon collides with a bomb explosion force, trigger a pop
2. Pop effect:
   - Remove the balloon body from the world
   - Spawn 15-20 particles in the balloon's color (from `body.render.color`) radiating outward
   - Spawn 3-5 small "string" particles falling downward (the balloon string remnant)
   - Play a pop sound: short high-frequency burst (~1200Hz, 0.06s duration, sine wave) with a quieter low undertone (~300Hz, 0.04s) for the "thump"
   - Small screen shake (`shakeIntensity = Math.max(shakeIntensity, 3)`)
   - Add to destruction meter: `destructionMeter += 50`
3. Balloons should NOT pop from gentle collisions (drifting into walls, bumping each other softly) — only impacts above the velocity threshold

## Diff

```javascript
// Add inside Events.on(engine, 'collisionStart', ...) handler,
// after the duck squeak check and before the wall dust check:

// Balloon pop on hard impact
const balloonBody = pair.bodyA.isBalloon ? pair.bodyA : (pair.bodyB.isBalloon ? pair.bodyB : null);
const popHitter = balloonBody === pair.bodyA ? pair.bodyB : pair.bodyA;
if (balloonBody && popHitter) {
  const bVel = balloonBody.velocity || {x:0,y:0};
  const hVel = popHitter.velocity || {x:0,y:0};
  const popRelVel = Math.sqrt(
    Math.pow(bVel.x - hVel.x, 2) + Math.pow(bVel.y - hVel.y, 2)
  );
  if (popRelVel > 5) {
    // Pop particles in balloon's color
    const popColor = balloonBody.render.color || '#ff3399';
    const bx = balloonBody.position.x;
    const by = balloonBody.position.y;
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: bx, y: by,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        color: popColor,
        size: 2 + Math.random() * 4
      });
    }
    // Falling string remnants
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: bx + (Math.random() - 0.5) * 10,
        y: by + 10,
        vx: (Math.random() - 0.5) * 1,
        vy: 1 + Math.random() * 2,
        life: 0.8 + Math.random() * 0.6,
        color: '#aaaaaa',
        size: 1 + Math.random()
      });
    }
    // Pop sound — high snap + low thump
    playSound(1200 + Math.random() * 400, 0.06, 'sine', 0.15);
    playSound(300, 0.04, 'sine', 0.06);
    // Feedback
    shakeIntensity = Math.max(shakeIntensity, 3);
    destructionMeter += 50;
    // Remove balloon
    Composite.remove(world, balloonBody);
  }
}
```

## Test additions

```javascript
// In the balloon section of tests:
test('balloon pops on hard impact (relVel > 5)', () => {
  // Verify balloon is removed from world after high-velocity collision
});

test('balloon survives gentle collision (relVel <= 5)', () => {
  // Verify balloon persists after low-velocity contact
});

test('balloon pop spawns particles', () => {
  // Verify particle array grows after balloon pop
});
```
