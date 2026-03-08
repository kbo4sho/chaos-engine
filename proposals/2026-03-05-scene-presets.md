# Scene Presets (One-Tap Starter Scenes)

**Impact:** high  
**Goal alignment:** "more fun, more surprising" — gives players instant inspiration and a starting point; transforms blank-canvas paralysis into immediate play

## Why

The sandbox starts empty every time. Players who don't know what to build tap randomly. Scene presets solve cold-start by dropping pre-built setups that are immediately playable:

- **Bowling** — 10 pins in formation, heavy ball on a slingshot, satisfying strike potential
- **Domino Run** — 20+ dominoes in a winding path, one tap to topple the first
- **Rube Goldberg** — multi-stage chain: ball → ramp → domino → bomb → balloon pop
- **Demolition** — tall block tower with bombs at the base, one tap to detonate
- **Pinball** — bumpers + trampolines arranged as a pinball machine, ball at top

Each preset clears the scene, spawns objects at specific positions/angles, and optionally auto-triggers the first action (e.g., nudge the first domino). Players can then modify, add objects, or just watch.

## UX

Add a `🎬 SCENES` button to the chaos bar (safe style, like SNAP/PAUSE). Tapping opens a small overlay with 5 preset buttons. Tapping a preset:
1. Clears existing objects (with vortex animation if that proposal ships, otherwise instant)
2. Spawns the preset layout
3. Shows a brief toast: "🎳 BOWLING — knock 'em down!"
4. Closes the overlay

No new dependencies. Pure JavaScript object spawning using existing `createObject()` calls with hardcoded positions.

## Implementation Sketch

```javascript
const PRESETS = {
  bowling: {
    label: '🎳 Bowling',
    toast: 'Knock em down!',
    setup: (W, H) => [
      // 10 pins in triangle at right side
      ...bowlingPins(W * 0.7, H - 80),
      // Heavy ball on left
      { type: 'ball', x: W * 0.15, y: H - 60, scale: 1.5 }
    ]
  },
  dominoes: {
    label: '🀄 Domino Run',
    toast: 'Tip the first one...',
    setup: (W, H) => generateDominoPath(W, H, 25)
  },
  // ... etc
};

function loadPreset(name) {
  clearAll(); // existing clear function
  const preset = PRESETS[name];
  const items = preset.setup(canvas.width, canvas.height);
  items.forEach(item => createObject(item.type, item.x, item.y, item.options));
  showToast(`${preset.label} — ${preset.toast}`);
}
```

## Diff Scope

- ~120 lines: preset definitions + overlay UI + button handler
- Touches: HTML (one button + overlay div), CSS (~30 lines for overlay), JS (preset data + spawn logic)
- No new dependencies
- Uses only existing `createObject()` / spawn infrastructure

## Testing

- Test each preset spawns correct number/type of objects
- Test overlay open/close
- Test clear-before-spawn behavior
- Test responsive positioning (presets should work at any canvas size)
