# Car

Car places a rolling vehicle on the playfield. The default is a sports car. Tapping the already-selected Car button cycles sports car, pickup truck, and bus. Each chassis keeps its chosen type through SAVE / LOAD. The toolbar emoji stays 🚗.

## Sub-features

- `car-select` highlights `[data-tool="car"]` and shows the current type on the button (`SPORT`, `TRUCK`, or `BUS`).
- `car-cycle` reselects that same button to switch type on desktop click and phone tap.
- `car-spawn` taps `#game` to place one car of the current type (chassis plus two wheels) and increment `OBJ`.
- `car-persist` writes the chosen type on the chassis so SAVE / LOAD restore sports, pickup, and bus scenes without a new save version.

## How to get to it (user POV)

- Open CHAOS and choose Car in `#toolbar` (after Rocket). The button reads `SPORT`.
- Tap `#game` to drop a sports car.
- Tap the already-selected Car button to switch to `TRUCK`, then `BUS`, then back to `SPORT`.
- SAVE the scene, reload, and LOAD. Each car keeps the type it was spawned with.

## Driving it with verify-chaos-engine

Preconditions:

- `./scripts/verify-chaos-engine doctor` reports the verification URL.
- Chrome uses a fresh profile.
- No lesson has hidden `#toolbar`.

This journey is driven together with Rocket.

- **Desktop.** Set the viewport to 1280×800. Click `#btn-pause`, then `[data-tool="car"]`. The button is `active` and its `.car-label` is `SPORT`. The icon remains 🚗.
- **Place sports car.** Click `#game` on the left third. `#obj-count` is at least 3. Capture `desktop-01-sports.png`.
- **Place pickup.** Click `[data-tool="car"]` again so the label is `TRUCK`, then click `#game` in the center. Capture `desktop-02-pickup.png`.
- **Place bus.** Click `[data-tool="car"]` again so the label is `BUS`, then click `#game` on the right third. Capture `desktop-03-bus.png`. The three chassis have `render.carKind` values `sports`, `pickup`, and `bus`.
- **Save and load.** Combined with the Rocket types in the same scene: choose slot `1`, click `#btn-save` (confirm if asked), reload, click `#btn-load`, then `#save-accept`. `#save-feedback` contains `LOADED SLOT` and the car kinds are unchanged. Capture `desktop-07-after-load.png`.
- **Clear.** Click `#btn-clear`. After the vortex, `#obj-count` is `0` and the Car button reads `SPORT`.
- **Mobile.** Repeat select, cycle, and one spawn at 390×664 with `hasTouch`, using tap not click. Capture `mobile-01-cycle.png`.
- **Proof.** `./scripts/verify-chaos-engine drive car-rocket` writes `result.json` with `passed: true`.

## Gotchas

- First selecting Car from another tool resets the type to sports, same as Dino resetting to T. rex. Cycle only while Car is already active.
- A drag longer than a tap is a slingshot, not a still spawn.
- One car is a chassis plus two wheels, so `OBJ` increases by 3.
- Old version-1 saves without `carKind` load as a sports car. Do not bump the save version for this field.
- Do not call `serializeGameState` / `restoreGameState` or seed `localStorage` to make the journey pass.
- Do not change the toolbar emoji. Only the short label cycles.
