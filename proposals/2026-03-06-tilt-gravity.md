# Tilt-to-Gravity (Device Orientation)
**Impact:** high
**Goal alignment:** "more fun, more surprising, more satisfying" — turns your phone into a physical controller; gravity becomes something you *feel* in your hands

## Why

Every gravity change in the sandbox is a button press — Moon, Jupiter, Anti-Grav. They're fun but abstract. On mobile devices, the accelerometer is sitting there unused. Tilting your phone to make objects slide, tumble, and pool in corners is the kind of interaction that makes people say "wait, do that again." It's physical, intuitive, and immediately delightful.

This is the missing bridge between the digital sandbox and the physical world. Kids especially will lose their minds tilting the tablet and watching everything slide.

## Changes

### New button
Add a `🔄 TILT` toggle button to the chaos buttons row. When active:

1. Request `DeviceOrientationEvent` permission (required on iOS 13+)
2. Listen to `deviceorientation` events
3. Map `beta` (front-back tilt, -90° to 90°) and `gamma` (left-right tilt, -90° to 90°) to gravity vector
4. Override `engine.gravity.x` and `engine.gravity.y` based on tilt, scaled by current planet's gravity magnitude
5. Show a subtle gravity-direction indicator arrow on canvas

### Implementation details

```javascript
// In chaos buttons section
let tiltActive = false;

document.getElementById('btn-tilt').addEventListener('click', async () => {
  if (tiltActive) {
    tiltActive = false;
    // Restore gravity to current planet setting
    engine.gravity.x = 0;
    engine.gravity.y = currentGravityY;
    window.removeEventListener('deviceorientation', handleTilt);
    return;
  }
  
  // iOS 13+ requires permission
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== 'granted') return;
    } catch (e) { return; }
  }
  
  tiltActive = true;
  window.addEventListener('deviceorientation', handleTilt);
});

function handleTilt(e) {
  if (!tiltActive) return;
  const mag = Math.abs(currentGravityY) || 1;
  // gamma = left-right (-90 to 90), beta = front-back (-90 to 90)
  const gx = Math.max(-1, Math.min(1, (e.gamma || 0) / 45)) * mag;
  const gy = Math.max(-1, Math.min(1, (e.beta || 0) / 45)) * mag;
  engine.gravity.x = gx;
  engine.gravity.y = gy;
}
```

### Gravity direction indicator
When tilt is active, render a small arrow in the bottom-right corner showing current gravity direction — a thin line from center of a circle pointing in the gravity vector direction, with the CRT cyan color.

### Graceful degradation
- Desktop browsers: button is hidden (no accelerometer)
- Browsers without `DeviceOrientationEvent`: button hidden
- iOS permission denied: button reverts to inactive, brief "DENIED" flash

### Deactivation
- Tapping TILT again restores normal gravity
- Selecting a planet button also deactivates tilt
- Clear All does not deactivate (tilt is a mode, not content)

## Edge cases
- Anti-gravity planet: tilt magnitude uses negative base, so tilt direction inverts — surprisingly fun
- Zero-G (space): magnitude is ~0, so tilt has almost no effect — correct behavior
- Slo-mo: works normally, tilt just changes gravity direction at any time scale

## Why this clears the quality bar
- ~40 lines of implementation
- Zero new dependencies
- Graceful no-op on unsupported devices
- Leverages an unused hardware capability
- The physical-to-digital mapping is inherently satisfying
- Pairs with every existing feature without modification
