# Contextual Discovery Hints
**Impact:** high
**Goal alignment:** "more fun, more surprising" — the sandbox has 26 tools, chain reactions, portals, magnets, fans, and hidden interactions (bomb chains, balloon pops, block shattering) that most players never discover. Surfacing them at the right moment turns "nice toy" into "holy shit what else can this do?"

## Why

The sandbox is deep but looks shallow. A player who taps ball→block→bomb and clicks detonate has seen maybe 10% of what's possible. There's no onboarding, no contextual nudges, no "did you know?" moments. The best sandbox games (Garry's Mod, Algodoo, Besiege) teach through play — showing you possibilities at the exact moment they're relevant.

This isn't a tutorial. It's a whisper system — brief, CRT-styled hints that appear based on what you're doing and fade after 3 seconds. They feel like the engine is talking to you.

## Changes

Add a hint system triggered by player actions:

**Triggers → Hints:**
- First spawn: `"> TRY SLINGSHOT: DRAG FROM EMPTY SPACE"`
- Place 2+ bombs near each other: `"> BOMBS CHAIN REACT"`
- Place a balloon: `"> BALLOONS POP ON HARD IMPACT"`  
- Build a 3+ block stack: `"> HIT IT WITH AN ANVIL"`
- Place a portal: `"> PLACE A SECOND PORTAL TO LINK THEM"`
- Use grab tool for first time: `"> FLICK TO THROW"`
- Place a seesaw: `"> DROP SOMETHING HEAVY ON ONE END"`
- Place a domino: `"> LINE THEM UP. PUSH THE FIRST ONE."`
- 30 seconds with no interaction: `"> TRY: 🧲 MAGNET + ⚽ BALLS"` (random combo suggestion)
- First conveyor placed: `"> STACK THEM FOR A FACTORY LINE"`
- Place a fan: `"> FANS PUSH LIGHT OBJECTS"`

**Rendering:**
- Bottom-center of canvas, VT323 font, #0abdc6 with terminal glow
- Typewriter effect (characters appear one at a time, 30ms/char)
- Fades out after 3 seconds
- Max one hint at a time; new hint replaces current
- Each hint shown at most once per session (tracked in a Set)
- Total of ~60 lines of code

**State tracking:**
- `hintsShown: Set<string>` — prevents repeats within session
- No localStorage — hints reset each visit (intentional; rediscovery is part of the fun)

## Diff

```javascript
// ── DISCOVERY HINTS ──
const hintsShown = new Set();
let activeHint = null;
let hintTimer = 0;
let hintText = '';
let hintCharIndex = 0;

function showHint(id, text) {
  if (hintsShown.has(id)) return;
  hintsShown.add(id);
  activeHint = id;
  hintText = text;
  hintCharIndex = 0;
  hintTimer = 180; // 3 seconds at 60fps
}

function updateHint() {
  if (!activeHint) return;
  if (hintCharIndex < hintText.length) {
    hintCharIndex += 0.5; // typewriter speed
  }
  hintTimer--;
  if (hintTimer <= 0) activeHint = null;
}

function drawHint() {
  if (!activeHint) return;
  const displayed = hintText.substring(0, Math.floor(hintCharIndex));
  const alpha = hintTimer < 30 ? hintTimer / 30 : 1;
  ctx.save();
  ctx.font = '20px VT323, monospace';
  ctx.textAlign = 'center';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#0abdc6';
  ctx.shadowColor = '#0abdc6';
  ctx.shadowBlur = 8;
  ctx.fillText(displayed, W / 2, H - 30);
  ctx.restore();
}

// Trigger hooks (insert into spawnObject and event handlers):
// After first spawn: showHint('slingshot', '> TRY SLINGSHOT: DRAG FROM EMPTY SPACE');
// After 2+ bombs within 80px: showHint('chain', '> BOMBS CHAIN REACT');
// After balloon spawn: showHint('balloon-pop', '> BALLOONS POP ON HARD IMPACT');
// After portal spawn: showHint('portal-pair', '> PLACE A SECOND PORTAL TO LINK THEM');
// etc.
```

Integration points:
1. Call `updateHint()` in the main loop (before render)
2. Call `drawHint()` at end of render pass (after UI overlays)
3. Add `showHint()` calls in `spawnObject()` switch cases and interaction handlers

No new dependencies. No test changes needed (hints are visual-only, no state mutation).
