# Chaos Engine verification map

This directory is the maintained source for verifying the user-facing behavior of Chaos Engine, the Matter.js 2D physics sandbox at `index.html`. Read this index before driving the app, then use the matching feature file as the recipe.

A copy of the same map lives at `.cursor/skills/verify-chaos-engine/features/` so the skill stays self-contained. Edit both when a journey changes.

## Baseline preconditions

- Launch with `./scripts/verify-chaos-engine launch` so the instance listens on `http://127.0.0.1:13003`.
- Run `./scripts/verify-chaos-engine doctor` and require the recorded URL, PID, and served-file SHA-256.
- Use a fresh Chrome profile (`/tmp/chaos-verify-chrome-<run-id>`). Do not attach to a player's existing `localStorage`.
- Never drive an instance that was not started by this verification run. Port 3003 is not the verification instance.
- Sample data is generic (`sample-lesson`, `sample-ball`). Do not put personal names into saves, screenshots, or logs.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer the stable handles in each feature file (`#btn-save`, `[data-tool="ball"]`, `#game`) over coordinates.
- Treat every command as literal. Keep quoted selectors and flags unchanged.
- Run browser journeys through `./scripts/verify-chaos-engine drive <feature-id>`.
- Cleanup removes the server and Chrome profile. Do not remove proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes a screenshot with the CHAOS ENGINE title visible and a dump of `#save-feedback`, `#obj-count`, and relevant `localStorage` keys.
- Mutation proof includes a read-only second view of storage after reload.
- Record the feature ID and origin (`branch` or `main`) with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.
- Never weaken a journey to make it pass.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-chaos-engine` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Save and load](./save-load.md) covers empty-slot save, overwrite confirm, reload, load confirm, lesson callbacks, and storage errors. **Default proof.**
- [Example scenes](./example-scenes.md) covers the three built-in LOAD menu showcases, their descriptions, and slot isolation.
- [Example scenes on a phone](./example-scenes-mobile.md) covers iPhone / Android tap loading of those examples and the user slots.
- [UI layout](./ui-layout.md) covers save-cluster overflow, hint wrapping, and control clipping at 390px and 1280px. **Standard journey — run on every change.**
- [Spawn objects](./spawn-objects.md) covers tool pick, canvas tap, slingshot, and the object counter.
- [Chaos actions](./chaos-actions.md) covers EXPLODE, RAIN, PAUSE, and other chaos-bar one-shots.
- [Gravity](./gravity.md) covers Earth / Moon / Mars / Jupiter / Space presets and the planet label.
- [Sandbox controls](./sandbox-controls.md) covers CLEAR, SNAP, and the lesson host API that replaces the current scene.
