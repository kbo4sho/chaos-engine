# Align travel tool

Align turns a moving part’s local horizontal axis to face its travel in one tap, preserving velocity and spin. Unlike Rotate’s fixed turn or Gyro’s ongoing stabilization, this is a one-shot heading match.

## Sub-features

- `align-select`: Appended after Bank; selecting exits Draw.
- `align-heading`: Tap a movable solid part to match its heading to travel.
- `align-feedback`: Still/empty guidance, transient accessible status and Clear/tool-change cleanup.

## How to get to it (user POV)

Scroll the bottom toolbar to the end, choose `[data-tool="align"]`, then tap a moving part on `#game`.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and doctor pass; fresh browser profile.

- **mobile-selection / desktop-selection:** `./scripts/verify-chaos-engine drive align` uses real touchscreen taps at 390×664 and mouse/keyboard at 1280×800; checks final placement after Bank, selection and Draw exit.
- **mobile-heading / desktop-heading:** Create a Block with the existing tool, aim with Launch, select Align and tap the paused block; observe heading equals travel direction, unchanged velocity/spin and visible feedback.
- **mobile-motion / desktop-motion:** Resume, observe real canvas travel, pause and capture resulting state.
- **mobile-cleanup / desktop-cleanup:** Clear removes player bodies and feedback; capture screenshots and storage. All console/runtime errors fail the journey.

## Gotchas

- Still, static, sensor and phased parts do not rotate. Spin continues after this instantaneous action.
- Connected parts may subsequently be turned by their joints. Compound parts rotate around the parent center.
- Run all mapped journeys and UI layouts before shipping; use private `CHAOS_VERIFY_ARTIFACTS`. Never seed motion or storage for browser proof.
