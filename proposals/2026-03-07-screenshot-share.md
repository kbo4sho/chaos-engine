# Screenshot & Share Button

**Impact:** medium
**Goal alignment:** "more satisfying to play with" — the payoff of building epic chaos setups doubles when you can capture and share the result. Every physics sandbox's best moments deserve to outlive the session.

## Why

Players create spectacular scenes — Rube Goldberg chain reactions, perfect domino topples, 50-object pile-ups — and have no way to capture them. The only audience is the person holding the phone. A single 📸 button that screenshots the canvas (hiding UI chrome) and triggers a download/share gives every moment a second life. On mobile, `navigator.share()` opens the native share sheet (Messages, Instagram, etc.); on desktop, it downloads a PNG.

This is the social multiplier. Every feature in the sandbox becomes more fun when you can show someone what happened.

## Changes

### New button
Add a 📸 button to the chaos bar (or as a floating action button in the corner). Styled consistently with existing chaos buttons.

### Screenshot logic (~25 lines)
```javascript
async function takeScreenshot() {
  // Temporarily hide UI overlays
  const uiElements = document.querySelectorAll('#toolbar, #chaos-bar, #gravity-bar, .bar-toggle, #destruction-meter-container');
  uiElements.forEach(el => el.style.display = 'none');
  
  // Wait one frame for UI to hide, then capture
  await new Promise(r => requestAnimationFrame(r));
  
  const canvas = document.querySelector('canvas');
  const dataUrl = canvas.toDataURL('image/png');
  
  // Restore UI
  uiElements.forEach(el => el.style.display = '');
  
  // Flash effect (white overlay fade) for camera feel
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;background:white;opacity:0.8;z-index:9999;pointer-events:none;transition:opacity 0.3s';
  document.body.appendChild(flash);
  requestAnimationFrame(() => { flash.style.opacity = '0'; });
  setTimeout(() => flash.remove(), 400);
  
  // Play shutter sound
  playSound(1200, 0.05, 'sine', 0.1);
  setTimeout(() => playSound(800, 0.03, 'sine', 0.08), 60);
  
  // Share or download
  if (navigator.share && navigator.canShare) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'chaos-engine.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Chaos Engine' });
        return;
      }
    } catch (e) { /* User cancelled or unsupported — fall through to download */ }
  }
  
  // Fallback: download
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `chaos-${Date.now()}.png`;
  a.click();
}
```

### Button HTML
```html
<button class="chaos-btn" id="btn-screenshot" style="border-color:#ffcc00;color:#ffcc00;background:#1a1a0a;">
  <span class="icon">📸</span>SNAP
</button>
```

### Event listener
```javascript
document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
```

### Test additions
- Test that the screenshot button exists and is clickable
- Test that `takeScreenshot` function is defined
- Test flash element creation and cleanup

## What makes this staff-engineer quality

- **Camera flash effect** — the white flash + shutter sound makes the capture feel physical, not programmatic
- **Progressive enhancement** — native share sheet on mobile, PNG download on desktop, graceful fallback chain
- **UI hide/restore** — screenshots capture the scene, not the chrome
- **Zero new dependencies** — canvas `toDataURL`, `navigator.share`, and a download link
- **~30 lines of actual logic** — minimal surface area, maximum satisfaction
