# UI layout

The chrome has to stay readable. Labels do not collapse into a one-word column, do not paint over buttons, and SAVE / LOAD / the slot picker stay fully on screen at a phone width and at a desktop width.

## Sub-features

- `layout-mobile` measures the save cluster at **390×664**.
- `layout-desktop` measures the same controls at **1280×800**.
- `layout-hint` keeps `#save-slot-hint` at least **200px** wide and at most **2** lines after an example is selected.
- `layout-no-overlap` fails if that hint's box intersects `#btn-save`, `#btn-load`, `#btn-clear`, or `#btn-pause`.
- `layout-no-clip` fails if `#save-slot` is narrower than **180px** or if SAVE / LOAD / the picker sit outside the viewport.

## How to get to it (user POV)

- Open the page on a phone (~375–390px) or a desktop window.
- Open CHAOS. The slot picker, SAVE, and LOAD are on the first save-cluster row.
- Choose `⚙️ Kinetic Cascade`. The description sits on the full-width row under the picker, not beside it in a squeezed column.

## Driving it with verify-chaos-engine

Preconditions:

- `./scripts/verify-chaos-engine doctor` reports the verification URL.
- Chrome uses a fresh profile.

This journey is **standard**. Drive it on every behavior or UI change, not only when save/load changed.

- **Mobile.** Set the viewport to 390×664 with `hasTouch`. `#save-slot`, `#btn-save`, and `#btn-load` are inside the viewport without scrolling `#chaos-actions`.
- **Select the long hint.** Choose `example:kinetic-cascade`. If `#save-confirm` opens, dismiss it with `#save-cancel` so the cluster stays visible. `#save-slot-hint` contains the Kinetic Cascade description.
- **Measure.** Compare bounding boxes. Hint width ≥ 200, hint line count ≤ 2, slot width ≥ 180, hint does not intersect SAVE / LOAD / CLEAR / PAUSE, hint `scrollWidth` is not larger than its box. Capture `ui-layout-mobile.png`.
- **Desktop.** Repeat at 1280×800. Capture `ui-layout-desktop.png`.
- **Proof.** `./scripts/verify-chaos-engine drive ui-layout` writes `result.json` with `passed: true` and `layout.json`.

## Gotchas

- Main (pre-fix) puts the hint in the chaos scroller with `max-width:120px` on a 600px media query. On a 390px phone that column is one or two words per line and overlaps SAVE. Do not `scrollIntoView` before the in-view check.
- Do not stub `#save-slot-hint` text to a short string to make the line count pass.
- Line count is `scrollHeight / line-height`. A clamp of 2 is the product limit; a 10-line wrap is the bug.
- Full-page screenshots are evidence. A crop that hides the bar is not.
