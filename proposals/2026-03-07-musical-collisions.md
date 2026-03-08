# Musical Collisions (Pentatonic Impact Sounds)

**Impact:** medium
**Goal alignment:** "more satisfying to play with" — transforms random noise into emergent harmony; chaos becomes a generative music box

**Why:** Every collision plays a random frequency — `200 + Math.random()*300` for bounces, `800 + Math.random()*600` for glass, etc. The result is noise, not music. Snapping impact frequencies to a pentatonic scale (C, D, E, G, A across octaves) means every collision sounds *good* together. More objects = richer composition. The sandbox becomes an instrument you play by throwing things.

Pentatonic scales are inherently consonant — any combination of notes sounds pleasant. This is the same trick wind chimes, xylophones, and games like Proteus use. Zero new UI, zero new controls. Just swap random frequencies for scale-quantized ones.

## Changes

Replace random frequency generation in `playImpactSound()` and `playBounce()` with pentatonic scale selection based on object properties:

```javascript
// Pentatonic scale frequencies (C major pentatonic, 3 octaves)
const PENTATONIC = [
  // Octave 3
  130.81, 146.83, 164.81, 196.00, 220.00,
  // Octave 4
  261.63, 293.66, 329.63, 392.00, 440.00,
  // Octave 5
  523.25, 587.33, 659.25, 783.99, 880.00,
];

function musicalFreq(material, intensity) {
  // Material determines octave range (heavier = lower)
  const octaveOffset = {
    'metal': 0,    // low clang
    'wood': 5,     // mid thunk
    'stone': 0,    // low thud
    'glass': 10,   // high tinkle
    'rubber': 5,   // mid boing
  }[material] || 5;
  
  // Intensity picks note within the octave (harder hit = higher note)
  const noteIdx = Math.min(Math.floor(intensity * 4), 4);
  return PENTATONIC[octaveOffset + noteIdx];
}
```

### In `playBounce()`:
```diff
- function playBounce() { playSound(200 + Math.random()*300, 0.08, 'sine', 0.08); }
+ function playBounce() {
+   const note = PENTATONIC[Math.floor(Math.random() * 5) + 5]; // random mid-octave note
+   playSound(note, 0.08, 'sine', 0.08);
+ }
```

### In `playImpactSound()`:
Replace each material branch's random `freq` with `musicalFreq(material, intensity)`:

```diff
  // Glass impacts
- const freq = 800 + Math.random() * 600;
+ const freq = musicalFreq('glass', intensity);
  
  // Wood impacts  
- const freq = 150 + Math.random() * 200;
+ const freq = musicalFreq('wood', intensity);

  // Metal impacts
- const freq = 100 + Math.random() * 100;
+ const freq = musicalFreq('metal', intensity);

  // Rubber impacts
- const freq = 1200 + Math.random() * 800;
+ const freq = musicalFreq('rubber', intensity);

  // Stone impacts
- const freq = 400 + Math.random() * 300;
+ const freq = musicalFreq('stone', intensity);

  // Default
- playSound(200 + Math.random() * 300, 0.08, 'sine', vol);
+ playSound(PENTATONIC[Math.floor(Math.random() * 5) + 5], 0.08, 'sine', vol);
```

### Squeak (duck) — also harmonize:
```diff
- playSound(900 + Math.random()*400, 0.15, 'sine', 0.15);
- setTimeout(() => playSound(1100 + Math.random()*300, 0.1, 'sine', 0.1), 50);
+ playSound(PENTATONIC[12], 0.15, 'sine', 0.15);  // E5
+ setTimeout(() => playSound(PENTATONIC[14], 0.1, 'sine', 0.1), 50);  // A5
```

## Why Pentatonic?

The pentatonic scale has no dissonant intervals. Any two notes played together sound good. This is why:
- Wind chimes use it (random strikes always harmonize)
- Bobby McFerrin demonstrates it with any audience (the scale is neurologically intuitive)
- Games like Proteus, Journey, and Flower use it for generative music

Random frequencies = noise. Pentatonic frequencies = music. Same code complexity, radically different feel.

## Risk

Low. Pure audio change, no physics or rendering impact. If it sounds wrong in practice, revert is trivial (restore the random ranges). Existing test suite unaffected since tests don't assert on audio frequencies.
