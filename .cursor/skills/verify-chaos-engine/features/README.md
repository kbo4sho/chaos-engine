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

- [Deflect](./deflect.md) covers quarter-turn travel, toolbar selection, touch input and Clear cleanup.

- [Trim](./trim.md) covers one-shot spin removal with travel preserved, toolbar selection after Deflect, touch/desktop input and Clear cleanup.

- [Bank](./bank.md) covers local-axis travel reflection, final toolbar selection after Trim, real touch/desktop input, motion and Clear cleanup.

- [One Part Missing](./one-part-missing.md) covers the puzzle shelf, physical repairs, inspection, replays, generated machines, sharing and sandbox editing.

- [Puzzle campaign](./puzzle-campaign.md) covers 400 progressively harder machines, chapter navigation, reversible rails, multi-body contacts and permanent progress.

- [Powered tool course](./tool-course.md) covers the eight-tool lab, contact inspection, advanced machines and powered sandbox saves.

- [Clockwork and cargo](./clockwork-course.md) covers moving machinery, the two-marble signal and delivery, and saved mechanical assemblies.

- [Guided lessons](./tool-lessons.md) covers the fifty-four-tool path, practice index, classic experiments, slow motion and single-frame stepping.

- [Tool-aware machine press](./tool-press.md) covers themed prints, compatible tool pairs, precise shared layouts and standalone parcel replays.

- [Cable rigs](./rigging-course.md) covers seven connector experiments, pulley delivery, break inspection and restored cable geometry.

- [Two-part repairs](./paired-repairs.md) covers installing, replacing and removing two spares, partial trials and two-part recordings.

- [Power transmissions](./drive-course.md) covers six shaft experiments, timed delivery, saved drive connections and portable replays.

- [Expanded bench and comparison film](./attempt-film.md) covers zoom, panning, old and new paths synchronized by physics frame, and the measured first separation.

- [Work orders](./work-orders.md) covers open-ended deliveries, two personal records, shared fittings and offline record replays.

- [Puzzle library](./puzzle-library.md) covers first-time lessons, route-aware return visits, machine search, working parts and compact course navigation.

- [Sorting room](./sorting-course.md) covers six material-handling parts, size clearance, hold times, two independent receipts and native sandbox transfer.

- [Predict a run](./prediction-lab.md) covers 108 physical predictions, direction-aware timing gates, retries, saved mastery and offline experiments.

- [Build a machine](./design-bench.md) covers editing real hardware, choosing the missing station, recording a receiver and sharing the tested design.

- [Flight school](./flight-course.md) covers gear carried by moving loads, pickup and release, timed parcel flights and saved in-flight equipment.

- [Inspect a missed repair](./repair-coach.md) covers measured approach, hold and timing evidence, working-path comparisons and progressive hints.

- [Operate a machine](./operator-room.md) covers live signals, cue sheets, shift records, recorded motion and portable replay.

- [Three-part repairs](./assembly-course.md) covers forty multi-station machines, partial fitting activity, shared setups and portable triple replays.

- [Field stations](./field-course.md) covers motion impulses, lift and gyro gear, charge pairs, collision filtering, recorded traces and field-tool practice.

- [Commission a production line](./test-bay.md) covers mixed test loads, calibrated stations, measured output, shared settings and offline replay.

- [Grand relays](./grand-relays.md) covers two-load dispatch, filtered contact logs, measured handoff time and recorded path overlays.

- [Fault desk](./fault-desk.md) covers diagnosing a changed station from paired physical runs, testing repairs, best service records and portable cases.

- [Remove a spare](./spare-study.md) covers predictions about earned repairs, matched physics runs, per-spare measurements and offline comparisons.

- [Phone repair bench](./phone-bench.md) covers touch repairs, inline misses and quarter-speed inspection.
- [Friend challenges](./friend-races.md) covers blind work orders and two-way race films.
- [Change one thing](./discovery.md) covers 24 pairs of exploratory and transfer rigs.

- [Replay GIFs](./replay-clips.md) covers local, animated exports of comparison films.

- [Double exposures](./double-exposures.md). Play twelve machines with two adjustable tools and two timed shutter marks.

- [Player shutter puzzles](./shutter-sheets.md). Use a recorded run to set two marks for someone else to match.

- [Offline friend races](./offline-races.md). Play and return a work-order race between disconnected devices.

- [Three-round match cards](./match-cards.md) covers house recordings, three scoring rules, returned scorecards and disconnected play.

- [Inspect a point on a recorded path](./path-reader.md) covers touch and keyboard spatial seeking, repeated visits and offline films.
- [Take a discovery setup into Chaos Engine](./experiment-exchange.md) covers native shutter measurements, editable physics, save slots and exact return links.
- [Resume an unfinished repair](./unfinished-repairs.md) covers durable partial fittings, undo, local privacy and multi-tab recovery.
- [Your tool notebook](./tool-notebook.md) covers actual fitting activity, personalized practice and replayable contacts.
- [Cross training and qualification finals](./qualification-course.md) covers 20 numbered repairs, all 54 compound fittings and the three-spare finals.
- [First repair on a phone](./phone-startup.md) covers cold touch startup, font loading, on-demand films and the machine press worker.
- [Move repairs to another device](./repair-transfer.md) covers a verified personal notebook, unfinished fitting history and safe merges.
- [Practice two tools together](./pair-training.md) covers verified three-machine practice courses for every tool, exact contact predictions and offline files.
- [Read machine diagram](./machine-diagram.md) covers a keyboard and touch release diagram, actual receiver rules and a frame-accurate opening clock.
- [Keep the workshop offline](./offline-workshop.md) covers a complete optional offline edition, verified replacements and cold offline play.
- [Design a multi-part machine](./compound-designer.md) covers 120 editable working machines, selectable missing stations and certified custom repairs across all 54 tools.
- [Exchange working drawings](./drawing-exchange.md) covers portable unfinished designs, independent film review and reversible adoption across browsers.
- [Inspect the design press trials](./release-trials.md) covers seven physical release positions, fourteen films and concrete counterexamples for rejected drawings.
- [Repair celebration](./repair-celebration.md) covers the centered repair signal on the workbench and Fault Desk.
- [Feature flags](./feature-flags.md) covers named switches that hide extra desks and courses. Defaults, URL and storage overrides, and the offline-worker kill switch. See [docs/feature-flags.md](../docs/feature-flags.md) for the full list.
