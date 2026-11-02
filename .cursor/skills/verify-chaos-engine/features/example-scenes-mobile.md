# Example scenes on a phone

On a phone, the three example scenes and the three user slots load from the visible save cluster by tap. Choosing an example opens the confirm dialog. LOAD and SAVE stay on screen; they are not buried in the horizontal chaos scroller.

## Sub-features

- `mobile-save-cluster` keeps `#save-slot`, `#btn-save`, and `#btn-load` inside `#save-cluster`, in the viewport on an iPhone-width screen.
- `mobile-tap-example` starts `#save-confirm` when an `example:*` option is chosen. A tap on `#save-accept` loads that scene.
- `mobile-tap-slots` saves and loads Slot 1–3 with `tap`, not `click`.
- `mobile-slots-safe` leaves the user slot payload unchanged after the three example loads.

## How to get to it (user POV)

- Open CHAOS. The save menu is on its own row above EXPLODE / QUAKE / …
- The picker, SAVE, and LOAD share the first row. The scene description sits on the full-width row under them (at most two lines).
- Open `Save slot`. Tap `⚙️ Kinetic Cascade`, `🌙 Halo Garden`, or `🏗️ Wreck Deck`.
- Tap `Load example` in the confirm dialog.
- To keep a personal scene, pick Slot 1–3, tap the canvas, tap `SAVE`, later tap `LOAD`.

## Driving it with verify-chaos-engine

Preconditions:

- `./scripts/verify-chaos-engine doctor` reports the verification URL.
- Chrome uses a fresh profile. The drive emulates Playwright-style device profiles from puppeteer `KnownDevices`: **iPhone 13** (`hasTouch: true`) and **Pixel 5**.
- Every pointer action after emulate is `page.tap` / `touchscreen.tap`, not `page.click`.

- **Controls visible.** On the iPhone viewport, `#save-slot` and `#btn-load` have a positive `getBoundingClientRect` inside the viewport without scrolling `#chaos-actions`. Capture `iphone-13-01-menu.png`.
- **Keep a user slot.** Select Slot 1, tap Ball, tap `#game`, tap SAVE. Remember `localStorage['chaos-engine-save-1']`.
- **Tap each example.** For each `example:*` value, `select` it (the native picker path). `#save-confirm` opens from that change. Tap `#save-accept`. Feedback is `LOADED KINETIC CASCADE` / `HALO GARDEN` / `WRECK DECK`. Capture `iphone-13-02-kinetic-cascade.png`, `iphone-13-03-halo-garden.png`, `iphone-13-04-wreck-deck.png`.
- **Tap the user slot.** Select Slot 1, tap LOAD, tap `#save-accept`. Feedback contains `LOADED SLOT`.
- **Android pass.** Repeat the same taps on Pixel 5 (`pixel-5-*.png`).
- **Proof.** `./scripts/verify-chaos-engine drive example-scenes-mobile` writes `result.json` with `passed: true`.

## Gotchas

- Do not use `page.click` to make the journey pass. If `tap` cannot hit `#save-accept`, the dialog is not actually usable on a touch device.
- `page.select` is the harness stand-in for choosing a `<select>` option. The product path that must follow it is the `change` handler, not a hidden `click('#btn-load')`.
- Main (pre-fix) keeps SAVE / LOAD at the far right of a ~1600px `touch-action: pan-x` bar. A journey that `scrollIntoView`s `#btn-load` before asserting visibility hides the bug.
- Halo Garden still uses Moon gravity on a 390-wide canvas. If `#planet-name` is EARTH, the scene did not apply.
- GitHub Pages serves the same `index.html` as main (`cache-control: max-age=600`). There is no service worker. After merge, a hard refresh is enough if a 10-minute edge cache is still hot.
