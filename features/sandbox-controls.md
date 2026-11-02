# Sandbox controls

Sandbox controls reset or capture the playfield and expose the lesson host that replaces the current scene with a scripted setup.

## Sub-features

- `control-clear` empties the world after `#btn-clear` finishes its animation.
- `control-snap` captures a screenshot of the canvas (`#btn-screenshot`).
- `control-lesson-load` starts a lesson through `ChaosEngine.loadLesson`.
- `control-lesson-end` restores the toolbar via `ChaosEngine.endLesson`.

## How to get to it (user POV)

- Press `CLEAR` on the chaos bar to wipe the scene.
- Press `SNAP` to download a PNG of the canvas.
- A lesson host calls `window.ChaosEngine.loadLesson(config)` and later `ChaosEngine.endLesson()`.

## Driving it with verify-chaos-engine

Preconditions:

- Doctor reports the verification URL.
- For CLEAR, at least one object is already on the playfield.

- **Clear.** Click `#btn-clear`. After the animation, `#obj-count` is `0` and the canvas shows an empty playfield.
- **Lesson.** Call `ChaosEngine.loadLesson({ id:'sample-lesson', hideControls:false, simulation:{ spawnObjects:[{ type:'circle', x:220, y:140, label:'sample-ball' }] } })`. `ChaosEngine.getState().lessonActive` is true and `#obj-count` is non-zero.
- **Proof.** Screenshot the empty world after CLEAR and the lesson world after load. Do not skip CLEAR's animation by calling an internal finish helper unless the user-visible button path already ran.

The save/load journey already drives `loadLesson` as a precondition of persistence. CLEAR is a separate entry; if you cannot wait out the animation, report that path incomplete.

## Gotchas

- Saving during CLEAR shows `CLEARING · WAIT BEFORE SAVING`. Wait, then save.
- `loadLesson` is a clear-plus-setup. Anything placed before the call is gone. That is product behavior.
- `hideControls: true` removes `#toolbar`, `#chaos-bar`, and `#gravity-panel`, which hides SAVE / LOAD. The save/load journey must use `hideControls: false` so the player path stays reachable.
- SNAP is not SAVE. A PNG download does not populate `chaos-engine-save-N`.
