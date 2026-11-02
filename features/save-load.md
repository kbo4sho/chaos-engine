# Save and load

Save and load let a player store the current sandbox in one of three browser slots, reload the page, and bring that scene back — including an active hosted lesson — without a misleading storage error.

## Sub-features

- `save-empty-slot` writes the current scene to an empty slot and shows `SAVED TO SLOT`.
- `save-overwrite` asks `Replace Slot N?` and only replaces after `#save-accept`.
- `save-feedback` reports success or a specific failure; it must not blame quota when encode failed.
- `load-empty` reports `SLOT N IS EMPTY` when the slot has no payload.
- `load-confirm` asks before replacing the live scene, then shows `LOADED SLOT`.
- `save-across-reload` keeps `chaos-engine-save-N` in `localStorage` after a full page reload.
- `save-with-lesson-callbacks` saves after `ChaosEngine.loadLesson` even when the lesson config has functions.

## How to get to it (user POV)

- Choose slot `1`, `2`, or `3` from the `Your slots` group in the `Save slot` select. Built-in examples live in the same menu; see [example-scenes.md](./example-scenes.md).
- Press `SAVE` (`#btn-save`) to store the current game in that slot on this browser.
- Press `LOAD` (`#btn-load`) to replace the current game with the selected slot.
- Confirm or cancel in the `#save-confirm` dialog (`Replace save` / `Load game` / `Cancel`).
- A lesson host starts a lesson with `window.ChaosEngine.loadLesson(config)` (no toolbar button). SAVE / LOAD stay on the chaos bar unless the lesson hid controls.

## Driving it with verify-chaos-engine

Preconditions:

- `./scripts/verify-chaos-engine doctor` reports `http://127.0.0.1:13003` (branch) or `http://127.0.0.1:13004` (main snapshot).
- Chrome uses a fresh profile so slots 1–3 are empty.
- The page title bar shows `CHAOS ENGINE` and `#btn-save` is visible.

- **Build a scene.** Choose Ball and tap the canvas. The drive recipe clicks `[data-tool="ball"]` then `#game` at a single point. `#obj-count` becomes `1` or higher. Capture `02-scene-built.png`.
- **Start a lesson with callbacks.** From the page console / harness, run the public host API (not an internal setter):

  ```js
  ChaosEngine.loadLesson({
    id: 'sample-lesson',
    hideControls: false,
    setup() {},
    onTick() {},
    simulation: {
      gravity: 'earth',
      goals: [{ type: 'count-placed', target: 1 }],
      fixtures: [{ type: 'rectangle', x: 400, y: 320, width: 220, height: 18, label: 'sample-platform' }],
      spawnObjects: [{ type: 'circle', x: 220, y: 140, count: 1, label: 'sample-ball' }]
    }
  })
  ```

  `ChaosEngine.getState().lessonId` is `sample-lesson`, `#obj-count` is non-zero, and the balls placed before the lesson are gone. Capture `03-lesson-started.png`.
- **Save.** Press SAVE. Run `./scripts/verify-chaos-engine drive save-load` (it clicks `#btn-save`). `#save-feedback` reads `SAVED TO SLOT 1 · STORED IN THIS BROWSER`. `#save-slot` no longer says `empty`. `localStorage['chaos-engine-save-1']` is JSON with `version: 1`, `savedAt`, `checksum`, and `graph`. Feedback must **not** contain `FREE BROWSER STORAGE` or `ALLOW SITE DATA`. Capture `04-after-save.png` and `localStorage.json`.
- **Reload.** Reload the page (`location.reload()`). The playfield is a new session (object count may drop to the empty-world default). The slot label still shows a timestamp. The `chaos-engine-save-1` key is still present. Capture `05-after-reload.png`.
- **Load.** Press LOAD, then confirm. The recipe clicks `#btn-load` then `#save-accept`. The dialog title is `Load Slot 1?`. After accept, `#save-feedback` is `LOADED SLOT 1`. `ChaosEngine.getState().lessonId` is `sample-lesson` and a `sample-ball` object is present. Capture `06-load-confirm.png` and `07-after-load.png`.
- **Proof.** `artifacts/verify-chaos-engine/<run-id>/result.json` records `passed: true` on the fixed branch. Console log has no uncaught exception. On `main`, the same lesson+SAVE step shows `SAVE FAILED · FREE BROWSER STORAGE OR ALLOW SITE DATA, THEN RETRY` and no valid `chaos-engine-save-1` payload — that is a failed journey, not a skip.

One-shot:

```bash
./scripts/verify-chaos-engine drive save-load
```

## Gotchas

- `ChaosEngine.loadLesson` clears the world. Saving after a lesson restores the lesson scene, not the pre-lesson balls. Do not drop the lesson step to make object counts easier.
- There is no in-page “Start lesson” button. The host API is the user-facing entry for lessons. If `window.ChaosEngine` is missing, report the journey unreachable — do not invent a toolbar substitute.
- First save to an empty slot writes immediately. A second save to the same slot opens `Replace Slot N?`. Load always confirms.
- `#save-accept` label changes (`Replace save` vs `Load game`). Click the id, not the text.
- `#save-feedback` clears after about 5 seconds. Read it immediately after the click.
- Old encode aborted on function properties in `lessonState.config` and the UI blamed browser storage. A green run on a lesson with `setup` / `onTick` is the regression proof.
- Do not seed `localStorage` from the harness and call that a save.
- Quota, missing `save-codec.js`, and “scene cannot be saved” are different messages. Assert the exact feedback you observed.
