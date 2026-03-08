# Block Shattering on High-Velocity Impact
**Impact:** high
**Goal alignment:** "more surprising and more satisfying" — visible destruction is the #1 missing feedback loop. Objects collide hard but nothing breaks. Shattering turns every high-speed collision into a moment of delight and creates secondary chaos from fragments.

## Why

Right now, blocks are indestructible. You can slam them at terminal velocity and they just bounce. In a physics sandbox about chaos, the absence of *breakage* is conspicuous. Every great physics toy (Angry Birds, Besiege, Teardown) rewards force with destruction.

Shattering blocks into 3-5 smaller fragments on hard impact (relVel > 8) would:
1. Create visible consequences for force — satisfying cause-and-effect
2. Generate secondary collisions from fragments — cascading chaos
3. Pair beautifully with bombs, slingshot, and wrecking ball
4. Feed the destruction meter with fragment impacts
5. Add discovery moments ("wait, they BREAK?!")

## Changes

### Collision handler (around line 2024, in the collision event listener)

Add a shatter check after the existing destruction meter logic:

```javascript
// Block shattering on hard impact
if (relVel > 8) {
  [pair.bodyA, pair.bodyB].forEach(b => {
    if (b.isStatic || b.hasShattered) return;
    if (b.render?.type !== 'block') return;
    
    const size = b.render.size;
    if (size < 16) return; // fragments don't shatter further
    
    // Remove original block
    Composite.remove(world, b);
    b.hasShattered = true;
    
    // Spawn 3-5 smaller fragments
    const fragCount = 3 + Math.floor(Math.random() * 3);
    const fragSize = size * 0.45;
    const color = b.render.color;
    
    for (let i = 0; i < fragCount; i++) {
      const angle = (Math.PI * 2 * i) / fragCount + Math.random() * 0.5;
      const spread = size * 0.3;
      const fx = b.position.x + Math.cos(angle) * spread;
      const fy = b.position.y + Math.sin(angle) * spread;
      
      const frag = Bodies.rectangle(fx, fy, fragSize, fragSize * (0.6 + Math.random() * 0.8), {
        restitution: 0.3,
        friction: 0.6,
        angle: Math.random() * Math.PI * 2,
        render: { type: 'block', color, size: fragSize }
      });
      frag.material = 'wood';
      
      // Inherit velocity + explosion outward
      const burstSpeed = relVel * 0.3;
      Body.setVelocity(frag, {
        x: b.velocity.x * 0.5 + Math.cos(angle) * burstSpeed,
        y: b.velocity.y * 0.5 + Math.sin(angle) * burstSpeed
      });
      Body.setAngularVelocity(frag, (Math.random() - 0.5) * 0.3);
      
      Composite.add(world, frag);
    }
    
    // Dust particles at shatter point
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      particles.push({
        x: b.position.x, y: b.position.y,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 0.4 + Math.random() * 0.3,
        color: '#aa8844',
        size: 2 + Math.random() * 3
      });
    }
    
    // Crunch sound
    playSound(150 + Math.random() * 100, 0.12, 'square', 0.1);
    
    // Bump destruction meter
    destructionMeter += size * 2;
    destructionFlash = 0.6;
  });
}
```

### Fragment size limit
Fragments with `size < 16` won't shatter again, preventing infinite recursion. But fragments from large blocks (size 50+) CAN shatter on their next hard impact, creating a satisfying two-stage destruction.

### Drawing
No drawing changes needed — fragments use the existing `block` render type and will draw normally.

### Tests to add
- Block shatters when relVel > 8
- Block does NOT shatter when relVel <= 8
- Fragments are smaller than original
- Small fragments (size < 16) don't shatter
- Shatter produces particles
- Destruction meter increases on shatter

## Risks
- **Performance:** Many fragments from many blocks could stress the engine. Mitigation: fragments < 16px don't shatter further (max 2 levels deep), and Matter.js handles dozens of small bodies fine.
- **Cleanup:** Fragments accumulate. Existing "clear all" handles this. Could add a fragment TTL (fade out after 10s) if needed.
