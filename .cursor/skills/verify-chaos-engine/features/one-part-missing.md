# One Part Missing

Players fit one spare part to a broken machine, test the repair, inspect the run and open the assembly in the sandbox. The machine press prints shareable puzzles. Its Original track press option preserves seed-based track machines.

## Sub-features

- `shelf` contains the [280-level campaign](./puzzle-campaign.md) and local repair progress.
- `repair` accepts drawer-to-socket dragging or separate part and socket selections. Any physical solution counts.
- `replay` plays a recorded fitting after reload. The inspection slider reviews individual moments of the latest run.
- `press` generates a machine, tests its repairs and copies a link to its original setup.
- `remix` moves the final target and shares edited positions that pass the same physics trials.
- `compare` overlays the previous distinct setup and the latest attempt at the same physics tick. Expand enlarges the working board and keeps the controls live.
- `sandbox` opens the current assembly paused in a separate sandbox tab. Manual saves use ordinary game slots.

## How to get to it (user POV)

Choose PUZZLES in the sandbox or open `one-part-missing/`. Older `one-part-missing.html` links forward to the same level. Press Run machine, pick a drawer part, select a lettered socket and press Test repair. The shelf, machine press and Open in sandbox link are available on the same page.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and doctor pass, fresh browser profile, system Chrome and installed dev dependencies.

- **Repair and retry.** Run `./scripts/verify-chaos-engine drive one-part-missing`. Enter through the sandbox. Watch the unmodified machine miss, inspect the start frame, fit a wrong part, then use the bridge. Prove drag on desktop and two taps on a phone.
- **Replay and edit.** Reload the bench and watch the stored repair. Open the assembly in the sandbox, add a block, SAVE, return to the ordinary sandbox, then LOAD and confirm. Observe the actual bodies in the restored machine. Start the repaired domino chain in the sandbox and observe contact at the signal flag on both viewport sizes.
- **Shelf.** Solve the other five original machines on desktop with keyboard part and socket selection. Use the alternate drum solution on Wrong-way freight. Observe six completed repairs in the 280-level map.
- **Print and share.** On desktop and mobile, generate a new machine, expand its trial record, read the link through the share action and open it. Fit a certified repair through the player controls. Observe the saved repair, screenshot and restored setup.
- **Remix.** Move the last bell eight notches to the right and observe the failed proof. Move it one notch left of center, print the verified puzzle, reload its link, fit the bridge and ring the bell.
- **Portable file.** Download the bell puzzle from the parts drawer. Open the saved HTML with network access disabled, solve it and verify it requests zero HTTP resources. Save the alternate freight repair as a replay file and play it offline.
- **Layout.** Run `./scripts/verify-chaos-engine drive ui-layout` in a separate launch to prove the sandbox toolbar and save controls still fit.

## Gotchas

- A share link opens the unsolved machine. The local replay uses the recorded part and socket. Clearing local browser data removes saved replays.
- Simulation outcomes depend on actual contacts. A failed repair is an expected, inspectable outcome.
- The sandbox tab contains editable parts and its own controls. It writes a slot only when the player saves.
