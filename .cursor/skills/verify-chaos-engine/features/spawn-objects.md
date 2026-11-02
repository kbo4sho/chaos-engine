# Spawn objects

Spawn objects lets a player pick a tool from the bottom toolbar and place a physical body on the playfield by tapping the canvas, or fling one with a short drag.

## Sub-features

- `spawn-select-tool` highlights a toolbar button such as Ball or Block.
- `spawn-tap` places one object at the tap point and increments `OBJ`.
- `spawn-slingshot` drags before release to launch with velocity.
- `spawn-counter` updates `#obj-count` for dynamic bodies.

## How to get to it (user POV)

- Choose a tool in `#toolbar` (Ball is selected on a fresh load).
- Tap `#game` to drop that object.
- Drag on `#game` and release to slingshot-launch it.
- Read `OBJ: N` in the top status.

## Driving it with verify-chaos-engine

Preconditions:

- Doctor reports the verification URL.
- No lesson has hidden `#toolbar`.
- The canvas is visible and at least a few hundred pixels tall.

- **Select Ball.** Click `[data-tool="ball"]`. The button has class `active`.
- **Tap to place.** Click `#game` at one point (mousedown and mouseup on the same coordinates). `#obj-count` increases by at least one.
- **Proof.** Screenshot the canvas with the CHAOS ENGINE title and a non-zero `OBJ` count. Record `#obj-count` in `page-state.json`.

There is no dedicated `drive spawn-objects` helper yet. A later run can extend `scripts/lib/chaos-verify-drive.mjs`. Until then, drive these handles with the same Chrome recipe used by `drive save-load`, and do not skip the tap.

## Gotchas

- A drag longer than a tap is a slingshot, not a stationary spawn. Use a click, not a swipe, when you need a still object.
- `#obj-count` counts dynamic bodies, not every Matter body (walls are excluded).
- Some tools (eraser, grab, draw, snip) do not spawn. Assert spawn only for placement tools.
- `loadLesson` and CLEAR remove what you just placed. Prove spawn before those actions, or prove it again after.
