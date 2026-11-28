# Rocket

Rocket places a thrusting craft on the playfield. The default is a classic finned rocket. Tapping the already-selected Rocket button cycles finned rocket, space shuttle, and firework rocket. Each body keeps its chosen type through SAVE / LOAD. The toolbar emoji stays 🚀.

## Sub-features

- `rocket-select` highlights `[data-tool="rocket"]` and shows the current type on the button (`FIN`, `SHUT`, or `SPARK`).
- `rocket-cycle` reselects that same button to switch type on desktop click and phone tap.
- `rocket-spawn` taps `#game` to place one rocket of the current type, add it to the thrust list, and increment `OBJ`.
- `rocket-persist` writes the chosen type on the body so SAVE / LOAD restore finned, shuttle, and firework scenes without a new save version.

## How to get to it (user POV)

- Open CHAOS and choose Rocket in `#toolbar` (after Block). The button reads `FIN`.
- Tap `#game` to drop a finned rocket. It thrusts along its nose while unpaused.
- Tap the already-selected Rocket button to switch to `SHUT`, then `SPARK`, then back to `FIN`.
- SAVE the scene, reload, and LOAD. Each rocket keeps the type it was spawned with.

## Driving it with verify-chaos-engine

Preconditions:

- `./scripts/verify-chaos-engine doctor` reports the verification URL.
- Chrome uses a fresh profile.
- No lesson has hidden `#toolbar`.

This journey is driven together with Car.

- **Desktop.** Set the viewport to 1280×800. Click `#btn-pause`, then `[data-tool="rocket"]`. The button is `active` and its `.rocket-label` is `FIN`. The icon remains 🚀.
- **Place finned rocket.** Click `#game` on the left third. `#obj-count` is at least 1. Capture `desktop-04-classic.png`.
- **Place shuttle.** Click `[data-tool="rocket"]` again so the label is `SHUT`, then click `#game` in the center. Capture `desktop-05-shuttle.png`.
- **Place firework.** Click `[data-tool="rocket"]` again so the label is `SPARK`, then click `#game` on the right third. Capture `desktop-06-firework.png`. The three bodies have `render.rocketKind` values `classic`, `shuttle`, and `firework`.
- **Save and load.** Combined with the Car types in the same scene: choose slot `1`, click `#btn-save` (confirm if asked), reload, click `#btn-load`, then `#save-accept`. `#save-feedback` contains `LOADED SLOT` and the rocket kinds are unchanged.
- **Clear.** Click `#btn-clear`. After the vortex, `#obj-count` is `0` and the Rocket button reads `FIN`.
- **Mobile.** Repeat select, cycle, and one spawn at 390×664 with `hasTouch`, using tap not click.
- **Proof.** `./scripts/verify-chaos-engine drive car-rocket` writes `result.json` with `passed: true`.

## Gotchas

- First selecting Rocket from another tool resets the type to finned, same as Dino resetting to T. rex. Cycle only while Rocket is already active.
- A drag longer than a tap is a slingshot, not a still spawn.
- Old version-1 saves without `rocketKind` load as a finned rocket. Do not bump the save version for this field.
- Every type still uses the original 18×50 hull and the shared thrust list.
- Do not call `serializeGameState` / `restoreGameState` or seed `localStorage` to make the journey pass.
- Do not change the toolbar emoji. Only the short label cycles.
