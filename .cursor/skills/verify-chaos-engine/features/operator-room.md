# Operate a machine

Thirty live shifts build from one brake signal to three independently timed inputs on a working parcel line. The same fixed-step engine reads the live signal button and the editable cue sheet.

## Sub-features

- Five acts introduce eight commands. The desk shows which load to watch, explains each command, and marks its permitted interval.
- Run live at five selectable speeds. Pause, step or press Space on the focused bench to send a signal on the next simulation frame.
- Program the cue sheet with keyboard or touch. A recorded signal can be inspected to see its incoming and outgoing motion. The fastest successful sheet is stored per shift. A bare shift also restores a locally edited draft.
- Open a shared sheet in a fresh browser, edit it and earn the delivery. A playable HTML copy includes the engine, board, exact sheet, fonts and licenses for offline use.

## How to get to it (user POV)

Open One Part Missing from the sandbox. Open Level map, expand Jump to a tool course and choose Operate a machine. Start with Stop short. Run live, pause and step until the brake window opens, then send the signal. The cue sheet offers the same controls without a reaction-time requirement.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive operator-room`. Operate a phone-sized bench from a fresh profile, miss the first run and earn the first delivery using the live signal. Inspect the brake and restore its editable draft after reload. Complete all thirty from their cue controls, follow a copied final-shift link in a fresh profile, and play a saved file offline. Capture the phone, inspector, final desktop console, deliveries and persisted records.

## Gotchas

- A complete sheet can still miss. Each receiver listens to the named load, and ordered contacts must happen in sequence.
- A queued signal applies immediately before its numbered physics step. Inspecting a signal shows the exact incoming and outgoing velocities at that instant.
- The benchmark sheets used for verification are excluded from both the player and the standalone file.
