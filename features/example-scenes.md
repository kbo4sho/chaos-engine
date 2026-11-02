# Example scenes

Example scenes are three built-in showcase saves that always appear in the LOAD menu. Anyone can load them. They are not removable, and loading one never writes over the player's three browser slots.

## Sub-features

- `examples-listed` shows Kinetic Cascade, Halo Garden, and Wreck Deck in an `Examples` optgroup beside `Your slots`.
- `examples-hint` updates `#save-slot-hint` with the selected scene's one-line description and emoji.
- `examples-load` confirms, then restores the scene through `readGameSave` / `restoreGameState`.
- `examples-immutable` keeps the three options after LOAD or CLEAR and refuses SAVE onto an example.
- `examples-slots-safe` leaves `chaos-engine-save-1..3` unchanged when an example loads.

## How to get to it (user POV)

- Open the `Save slot` select in the chaos bar. The first group is `Examples`.
- Choose `⚙️ Kinetic Cascade`, `🌙 Halo Garden`, or `🏗️ Wreck Deck`. The hint under the menu names the scene.
- Press `LOAD`, then `Load example` in the confirm dialog.
- To keep your own work, pick Slot 1–3 and press `SAVE`. Examples cannot be overwritten.

## Driving it with verify-chaos-engine

Preconditions:

- `./scripts/verify-chaos-engine doctor` reports the verification URL.
- Chrome uses a fresh profile, then the recipe first saves a user ball into Slot 1 so slot isolation can be proved.
- `#save-slot` is visible.

- **Menu.** Open `#save-slot`. It contains `example:kinetic-cascade`, `example:halo-garden`, `example:wreck-deck`, and slots `1`–`3`. `#save-slot-hint` is populated. Capture `01-menu.png`.
- **Keep a user slot.** Choose Slot 1, tap a ball onto `#game`, press SAVE. `localStorage['chaos-engine-save-1']` is a version-1 payload. Remember that string.
- **Load each example.** For each `example:*` value, select it, press LOAD, then `#save-accept`. `#save-feedback` is `LOADED KINETIC CASCADE` / `HALO GARDEN` / `WRECK DECK`. `#obj-count` is well above zero. Wait for the world to step, then capture `02-kinetic-cascade.png`, `03-halo-garden.png`, and `04-wreck-deck.png` while objects are in motion.
- **Slots untouched.** After all three loads, `localStorage['chaos-engine-save-1']` is the same string as after the user SAVE. Keys `chaos-engine-save-2` and `3` stay empty. The three example options are still in the menu.
- **Proof.** `./scripts/verify-chaos-engine drive example-scenes` writes `result.json` with `passed: true`.

## Gotchas

- Examples are listed first, but the default selection stays Slot 1 so a first-time SAVE still writes a user slot.
- SAVE while an example is selected shows `EXAMPLE SCENE · PICK SLOT 1–3 TO SAVE YOUR GAME` and writes nothing.
- Loading an example replaces the live world only. It is not a special restore path: the builder snapshots a SAVE_VERSION=1 graph and `restoreGameState` applies it.
- Do not delete example options from the DOM to make a "user slots only" screenshot. If they are missing, the journey failed.
- Halo Garden uses Moon gravity. If `#planet-name` is still EARTH after that load, the scene did not apply.
