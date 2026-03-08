# Microphone-Reactive Mode (Clap to Chaos)

**Impact:** high  
**Goal alignment:** "more fun, more surprising, more satisfying" — turns the player's voice and body into a physics controller; the physical-to-digital mapping creates genuine delight and surprise ("wait, it HEARD me?!")

**Why:** The sandbox responds to taps, buttons, and tilts — but it's deaf. A mic-reactive mode using the Web Audio API's `AnalyserNode` detects volume spikes (claps, shouts, bangs) and triggers physics events proportional to intensity. Quiet tap → small ripple. Loud clap → explosion. Sustained yelling → gravity goes haywire. This is the audio equivalent of the tilt-gravity proposal — a sensory bridge that makes the sandbox feel alive.

## Design

### Activation
- New chaos button: `🎤 MIC` — toggles mic-reactive mode on/off
- First tap requests `navigator.mediaDevices.getUserMedia({ audio: true })` — graceful no-op if denied
- Active state: pulsing glow on button + subtle waveform visualizer in top bar (4-5 bars, CRT green)

### Audio Processing
- `AudioContext` → `MediaStreamSource` → `AnalyserNode` (FFT size 256)
- Sample RMS amplitude every animation frame (~60fps)
- Normalize against a rolling baseline (auto-calibrates to ambient noise over 2 seconds)
- Threshold tiers:
  - **Tap** (0.3-0.5 normalized): spawn a random object at canvas center with small velocity
  - **Clap** (0.5-0.7): random explosion at a random point, screen shake
  - **Shout** (0.7-0.9): gravity flip or vortex (alternates)
  - **Scream** (0.9+): black hole at center for 2 seconds

### Cooldown
- 200ms minimum between triggers (prevents rapid-fire from sustained noise)
- Visual flash on trigger so players learn the mapping

### Desktop & Mobile
- Works on both (getUserMedia is universal in modern browsers)
- No-op if permission denied or unavailable — button grays out with tooltip

### Resource Management
- Stops audio stream when mode is toggled off or page hidden (`visibilitychange`)
- No audio is recorded or stored — pure real-time analysis

## Code Sketch

```javascript
// ── MIC REACTIVE MODE ──
let micActive = false;
let micStream = null;
let micAnalyser = null;
let micData = null;
let micBaseline = 0;
let micCooldown = 0;

document.getElementById('btn-mic').addEventListener('click', async () => {
  if (micActive) {
    // Stop
    micActive = false;
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    document.getElementById('btn-mic').classList.remove('active');
    return;
  }
  
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = getAudio();
    const source = ctx.createMediaStreamSource(micStream);
    micAnalyser = ctx.createAnalyser();
    micAnalyser.fftSize = 256;
    source.connect(micAnalyser);
    micData = new Uint8Array(micAnalyser.frequencyBinCount);
    micActive = true;
    micBaseline = 0;
    document.getElementById('btn-mic').classList.add('active');
  } catch(e) {
    // Permission denied or unavailable
    document.getElementById('btn-mic').style.opacity = '0.3';
  }
});

// In render loop:
function processMic() {
  if (!micActive || !micAnalyser) return;
  micAnalyser.getByteTimeDomainData(micData);
  
  // Calculate RMS
  let sum = 0;
  for (let i = 0; i < micData.length; i++) {
    const v = (micData[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / micData.length);
  
  // Rolling baseline (slow adapt)
  micBaseline = micBaseline * 0.98 + rms * 0.02;
  const normalized = Math.min((rms - micBaseline) / 0.3, 1);
  
  if (normalized < 0.3 || Date.now() < micCooldown) return;
  micCooldown = Date.now() + 200;
  
  const cx = canvas.width / 2, cy = canvas.height / 2;
  
  if (normalized > 0.9) {
    // SCREAM → black hole
    // (reuse existing blackhole logic)
  } else if (normalized > 0.7) {
    // SHOUT → gravity flip or vortex
  } else if (normalized > 0.5) {
    // CLAP → explosion
    randomExplosion();
  } else {
    // TAP → spawn random object
    const tools = ['ball','block','star','duck','balloon'];
    const old = currentTool;
    currentTool = tools[Math.floor(Math.random() * tools.length)];
    spawnObject(cx + (Math.random()-0.5)*200, cy + (Math.random()-0.5)*200);
    currentTool = old;
  }
}
```

## HTML Addition

```html
<button class="chaos-btn" id="btn-mic" style="border-color:#ff3399;color:#ff3399;background:#1a0a1a;">
  <span class="icon">🎤</span>MIC
</button>
```

## Estimated Scope
- ~80 lines of JavaScript
- 1 new button in chaos bar
- Zero new dependencies (Web Audio API is native)
- Graceful degradation on unsupported browsers

## Why This Clears the Bar
Every great physics sandbox eventually discovers that the best input device isn't on screen — it's the player's body. Tilt-gravity uses the accelerometer. This uses the microphone. Together they turn a phone into a physical chaos controller. The discovery moment ("holy shit it responds to my voice") is worth the entire feature.
