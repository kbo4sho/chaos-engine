# Power transmissions

Levels 281–320 teach players to trace power from a gold input wheel to a blue parcel. Four chapters progress from a single rack to connected shafts, timed deliveries and assemblies with powered fields.

## Sub-features

- The motor drives a shaft, a gearbox reverses rotation, and a clutch shares angular velocity. The torsion spring stores twist, the ratchet holds against reverse motion and the rack trades spin for travel.
- The lab compares a fitted drive with an empty mount. Its release selector varies input speed.
- A receiver can require a direction of entry, an open interval, or both. The film identifies a closed passage, a wrong approach and a successful entry when they occur.
- Sandbox saves preserve shaft connections, the parcel guide and the receiver clock. A portable repair file includes the full simulation.

## How to get to it (user POV)

Choose PUZZLES, Level map, expand Jump to a tool course, then choose Play the drive table. Open Tool lab to try a transmission at three speeds. Choose Timing shop in the chapter selector for marked receivers. Fit a repair, run it and tap a receiver event to inspect the clock at that instant.

## Driving it with verify-chaos-engine

Preconditions: isolated launch, passing doctor and a fresh Chrome profile.

- Run `./scripts/verify-chaos-engine drive drive-course`. On a phone, try each transmission at the faster input setting. Run the first bench empty, fit its rack and deliver the carriage.
- On Early return, inspect a closed passage and the later successful one. Check the indicated approach and the clock at each selected frame.
- On desktop, solve The master shaft. Check all five tools, save and reload the fitted sandbox assembly, then play it and observe its receiver register the parcel. Download the repair and watch the same contacts offline.
- Drive `puzzle-campaign` for all 500 levels, `tool-lessons` for the 103 guided jobs and `tool-press` for a shared gearbox and rack print. Drive `save-load` and `ui-layout` for persistence and layout.

## Gotchas

- A parcel can touch a closed receiver and continue moving. Only entry while open and in its indicated direction completes the job.
- The input's physical center can stay still while its marked rim turns. Follow the rim, relay shaft and parcel in sequence.
