# Inspect a missed repair

After a failed run, players can inspect the first unfinished receiver, request a comparison with a working motion, then reveal a single fitting. Each step is optional.

## Sub-features

- The first view uses the player's recorded frames. It identifies a rejected timed or directional pass, the best consecutive hold inside a sorting bin, an absent required striker or the closest center-to-receiver distance.
- The next view simulates a working setup and overlays its dashed path on the player's hardware. First separation finds the first of three consecutive frames where the two paths are at least one load radius apart.
- Show one fitting reveals the tool, socket and orientation. A reference repair prioritizes retaining the player's existing fittings. A two-part machine can reveal its remaining changes one at a time.
- Selecting the suggested spare returns to the normal parts drawer and focuses its socket. The player fits it and runs the machine to earn the repair.

## How to get to it (user POV)

Run an empty or incorrect machine. Choose Inspect this miss below the parts drawer. Scrub the recorded approach or choose See the working motion. Use First separation or hide the working path to return to the longer original recording. Choose Show one fitting when ready for the part and location.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive repair-coach`. Start on a phone with an empty first level, inspect the measured distance before a comparison, and reveal and fit the bridge using the keyboard. Verify the notebook only records a win on delivery. Preserve the installed conveyor on a two-part job, distinguish an incomplete bin hold and a closed drive receiver, inspect a missing striker and an open work order, and compare a missed run in a downloaded puzzle offline.

## Gotchas

- The distance is measured from the tracked body's center to the receiver rectangle. It can be zero while a hold, direction or ordered contact remains incomplete.
- The working overlay ends at the final common frame. Hiding it restores the full missed recording.
- Revealing a hint does not write a repair or either work-order record.
