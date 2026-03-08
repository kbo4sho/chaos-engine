# Instant Replay (last 5 seconds)

**Impact:** high  
**Goal alignment:** "more satisfying to play with" — the best moments in a physics sandbox happen once and are gone. Replay lets players savor chain reactions, perfect shots, and spectacular collapses. Every great sports broadcast has instant replay for a reason: the payoff doubles when you can watch it again.

**Why:** Players build elaborate setups, trigger chaos, and the best moment flies by in 1-2 seconds. There's no way to rewatch it. Slow-mo helps you see it live, but replay lets you relive it. This is the "did you SEE that?!" button — captures the last 5 seconds of canvas frames and plays them back at adjustable speed (1×, 0.5×, 0.25×).

## How It Works

**Recording (always-on ring buffer):**
- Every frame, snapshot minimal state: all body positions, rotations, and particle state
- Store in a circular buffer holding ~300 frames (5 seconds at 60fps)
- Memory-efficient: only positions/angles, not full Matter.js state
- ~50 bytes per body × 100 bodies × 300 frames ≈ 1.5MB max

**Playback (on demand):**
- New REPLAY button (📹) in the chaos bar, styled like SNAP
- Pressing it freezes physics and enters replay mode
- Replays the buffered frames as a canvas animation
- Playback speed controls: 1×, 0.5×, 0.25× (tap to cycle)
- Scrub bar at bottom for manual frame-by-frame
- Press again or tap canvas to exit replay and resume physics

**Visual treatment during replay:**
- Subtle "▶ REPLAY" indicator in top-left, pulsing
- Slight vignette overlay to distinguish from live play
- Frame counter showing position in the 5-second window
- CRT scanline effect intensified slightly for cinematic feel

## Changes

### HTML
- Add replay button to chaos bar: `<button class="chaos-btn safe" id="btn-replay"><span class="icon">📹</span>REPLAY</button>`
- Add replay HUD overlay (hidden by default): speed indicator, scrub bar, frame counter

### JavaScript
- `replayBuffer[]` — circular array of frame snapshots (position, angle per body + active particles)
- `captureFrame()` — called each render tick, pushes to ring buffer
- `enterReplay()` — pauses engine, starts playback animation loop
- `exitReplay()` — resumes engine from where it left off
- `renderReplayFrame(index)` — draws bodies at recorded positions using existing `drawBody()` with position overrides
- Speed cycling: tap speed indicator to rotate 1× → 0.5× → 0.25× → 1×

### CSS
- `.replay-overlay` — vignette + HUD positioning
- `.replay-speed` — speed badge styling (matches existing chaos button aesthetic)
- `.replay-scrub` — minimal scrub bar, cyan accent

## Diff (pseudocode — key additions)

```javascript
// Ring buffer for replay
const REPLAY_FPS = 60;
const REPLAY_SECONDS = 5;
const REPLAY_MAX_FRAMES = REPLAY_FPS * REPLAY_SECONDS;
let replayBuffer = [];
let replayMode = false;
let replayIndex = 0;
let replaySpeed = 1;

function captureFrame() {
  if (replayMode || paused) return;
  const frame = {
    bodies: engine.world.bodies.map(b => ({
      id: b.id,
      x: b.position.x,
      y: b.position.y,
      angle: b.angle,
      label: b.label,
      render: b.render // color info
    })),
    particles: particles.map(p => ({...p})),
    timestamp: performance.now()
  };
  replayBuffer.push(frame);
  if (replayBuffer.length > REPLAY_MAX_FRAMES) replayBuffer.shift();
}

function enterReplay() {
  if (replayBuffer.length < 30) return; // need at least 0.5s
  replayMode = true;
  replayIndex = 0;
  replaySpeed = 1;
  Matter.Runner.stop(runner);
  document.getElementById('replay-overlay').classList.add('active');
  requestAnimationFrame(replayTick);
}

function replayTick() {
  if (!replayMode) return;
  renderReplayFrame(replayBuffer[replayIndex]);
  replayIndex += replaySpeed;
  if (replayIndex >= replayBuffer.length) {
    replayIndex = 0; // loop
  }
  requestAnimationFrame(replayTick);
}

function exitReplay() {
  replayMode = false;
  document.getElementById('replay-overlay').classList.remove('active');
  Matter.Runner.run(runner, engine);
}

// Hook into existing render loop
// In the main requestAnimationFrame callback, add:
captureFrame();
```

## Edge Cases
- Replay button disabled (greyed out) when buffer has < 30 frames
- Objects created/destroyed during replay window: only render bodies that exist in each frame
- Particles included for visual fidelity but simplified (no physics)
- Exiting replay restores exact engine state (no physics drift — engine was paused, not rewound)
- Works alongside slo-mo: if slo-mo was active during recording, replay shows slo-mo'd physics at chosen replay speed

## Complexity
~120-150 lines of JS, ~30 lines of CSS, ~10 lines of HTML. No new dependencies. Ring buffer is the only memory cost and it's bounded.
