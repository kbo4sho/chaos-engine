# Bank travel tool

Bank reflects a moving part’s travel across its own local horizontal axis, keeping speed, spin and orientation. Tilted parts bank in different directions; tapping twice restores the original travel.

## Sub-features

- `bank-select`: Bank appends after Trim and exits Draw when selected.
- `bank-reflect`: Tap a moving solid part to reflect travel about its own axis.
- `bank-feedback`: Still and empty targets give guidance; tool change and Clear remove feedback.

## How to get to it (user POV)

Scroll the bottom object toolbar to the end, select `[data-tool="bank"]`, then tap a moving part on `#game`.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and doctor pass; fresh browser profile.

- **mobile-selection / desktop-selection:** `./scripts/verify-chaos-engine drive bank` uses 390×664 real touchscreen taps and 1280×800 mouse/keyboard input, checks Bank is final after Trim and exits Draw.
- **mobile-reflection / desktop-reflection:** The journey creates a Ball and aims it diagonally with Launch, taps Bank on the paused part, and observes reflected velocity, preserved spin/orientation and visible feedback.
- **mobile-motion / desktop-motion:** Resume the canvas, observe real travel, pause and capture resulting position.
- **mobile-cleanup / desktop-cleanup:** CLEAR leaves zero player bodies and no Bank feedback; capture storage and state. All console errors and runtime errors fail the journey.

## Gotchas

- Bank uses the part’s angle, not a fixed screen direction. Travel parallel to its axis remains unchanged.
- Static, sensor and phased parts are excluded. A still part reports guidance.
- Run `ui-layout` and every mapped journey before shipping. Keep evidence private using `CHAOS_VERIFY_ARTIFACTS`; never seed storage or motion to pass a browser journey.
