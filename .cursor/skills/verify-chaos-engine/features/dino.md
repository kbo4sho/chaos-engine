# Dino

Dino places a physical dinosaur on the playfield. The default is a T. rex. Tapping the already-selected Dino button cycles T. rex, triceratops, and a long-neck sauropod. Each body keeps its chosen type through SAVE / LOAD.

## Sub-features

- `dino-select` highlights `[data-tool="dino"]` and shows the current type on the button (`REX`, `TRI`, or `LONG`).
- `dino-cycle` reselects that same button to switch type on desktop click and phone tap.
- `dino-spawn` taps `#game` to place one dinosaur of the current type and increment `OBJ`.
- `dino-persist` writes the chosen type on the body so SAVE / LOAD restore T. rex, triceratops, and sauropod scenes without a new save version.

## How to get to it (user POV)

- Open CHAOS and choose Dino in `#toolbar` (after Car). The button reads `REX`.
- Tap `#game` to drop a T. rex.
- Tap the already-selected Dino button to switch to `TRI`, then `LONG`, then back to `REX`.
- SAVE the scene, reload, and LOAD. Each dinosaur keeps the type it was spawned with.

## Driving it with verify-chaos-engine

Preconditions:

- `./scripts/verify-chaos-engine doctor` reports the verification URL.
- Chrome uses a fresh profile.
- No lesson has hidden `#toolbar`.

This journey covers the dinosaur tool, save/load of those bodies, and CLEAR.

- **Desktop.** Set the viewport to 1280×800. Click `#btn-pause`, then `[data-tool="dino"]`. The button is `active` and its `.dino-label` is `REX`.
- **Place T. rex.** Click `#game` on the left third. `#obj-count` is at least 1. Capture `desktop-01-trex.png`.
- **Place triceratops.** Click `[data-tool="dino"]` again so the label is `TRI`, then click `#game` in the center. Capture `desktop-02-triceratops.png`.
- **Place sauropod.** Click `[data-tool="dino"]` again so the label is `LONG`, then click `#game` on the right third. Capture `desktop-03-sauropod.png`. The three bodies have `render.dinoKind` values `trex`, `triceratops`, and `sauropod`.
- **Save and load.** Choose slot `1`, click `#btn-save` (confirm if asked), reload the page, click `#btn-load`, then `#save-accept`. `#save-feedback` contains `LOADED SLOT` and the three kinds are unchanged. Capture `desktop-04-after-load.png`.
- **Clear.** Click `#btn-clear`. After the vortex, `#obj-count` is `0` and the Dino button reads `REX`.
- **Mobile.** Repeat select, cycle, and one spawn at 390×664 with `hasTouch`, using tap not click. Capture `mobile-01-cycle.png`.
- **Proof.** `./scripts/verify-chaos-engine drive dino` writes `result.json` with `passed: true`.

## Gotchas

- First selecting Dino from another tool resets the type to T. rex, same as Resize resetting to grow. Cycle only while Dino is already active.
- A drag longer than a tap is a slingshot, not a still spawn.
- Old version-1 saves without `dinoKind` load as T. rex. Do not bump the save version for this field.
- Do not call `serializeGameState` / `restoreGameState` or seed `localStorage` to make the journey pass.
