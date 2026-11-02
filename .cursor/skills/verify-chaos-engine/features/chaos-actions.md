# Chaos actions

Chaos actions are one-shot or toggle events on the chaos bar that disturb the current scene: explosions, rain, pause, and other arcade effects.

## Sub-features

- `chaos-explode` fires `#btn-explode` and disturbs existing bodies.
- `chaos-rain` fires `#btn-rain` and schedules falling objects.
- `chaos-pause` toggles `#btn-pause` so the world stops or resumes.
- `chaos-clear-safe` leaves SAVE / LOAD / CLEAR / PAUSE in the safe group at the right of the bar.

## How to get to it (user POV)

- Press a chaos button under the toolbar (`EXPLODE`, `RAIN`, `PAUSE`, …).
- Keyboard shortcuts exist for some actions (`e` explode, `l` rain) when no dialog is open.

## Driving it with verify-chaos-engine

Preconditions:

- Doctor reports the verification URL.
- At least one spawned object is on the playfield if you are proving EXPLODE.
- `#save-confirm` is not open (the game ignores shortcuts while the dialog is open).

- **Rain.** Click `#btn-rain`. New bodies appear over the following beats and `#obj-count` rises.
- **Pause.** Click `#btn-pause`. The button state / world no longer advances until you click again.
- **Proof.** Screenshot before and after the action. Record `#obj-count` both times.

There is no dedicated `drive chaos-actions` helper yet. Use the same Chrome recipe and these ids. Do not call internal `schedulePhysicsAction` to fake rain.

## Gotchas

- EXPLODE on an empty world is a weak proof. Place an object first.
- Confirm dialogs pause the world and swallow shortcuts. Close `#save-confirm` before chaos keys.
- Some actions are timed (freeze, vortex). Wait for the visible effect, not a fixed sleep alone.
- SNAP writes an image download; it is not a scene save. Scene persistence is SAVE / LOAD.
