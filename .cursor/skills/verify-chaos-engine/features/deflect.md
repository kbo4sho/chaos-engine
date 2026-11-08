# Deflect

Deflect turns a moving part’s travel clockwise by 90° in one tap, preserving speed, spin, orientation and shape.

## Sub-features

- quarter-turn: each tap redirects current linear velocity clockwise.
- guidance: still parts and empty space show a short status message.
- cleanup: tool changes and Clear remove feedback; no attachment remains.

## How to get to it (user POV)

- Scroll the bottom object toolbar to its end and select Deflect after Clutch.
- Launch a Ball with Launch, then tap the moving part using Deflect.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and doctor pass; fresh browser storage.

- Run: `./scripts/verify-chaos-engine drive deflect` exercises 390×664 touch and 1280×800 desktop.
- Select: tap `[data-tool="draw"]`, then `[data-tool="deflect"]`; the last toolbar button is visible and active and drawing exits.
- Redirect: create a Ball and use Launch through canvas taps, then tap it with Deflect; travel turns 90° without changing speed, spin or orientation. Resume physics and observe downward travel.
- Reset: click `#btn-clear`; after the vortex, no parts or Deflect feedback remain. Capture screenshots, read-only body observations, storage and runtime errors.

## Gotchas

- A still part has no travel to redirect; use Launch first.
- Static scenery, targets, sensors and phased parts are ineligible.
- Gravity and collisions affect travel after the instantaneous turn.
- Do not seed bodies, velocities or storage through internal setters for browser proof.
