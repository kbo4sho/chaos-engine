# Player shutter puzzles

Use a recorded run to set two marks for someone else to match.

## Sub-features

Capture one frame per shutter. Test every knob pair to check whether the challenge is solvable and both controls and targets matter. A returned take verifies its two hits on the recipient’s machine. A standalone file carries the rig, physics, recording tools and GIF exporter.

## How to get to it (user POV)

Finish a run in Double exposures and expand Make a shutter puzzle. Set two frames and choose Test shutter puzzle. Open or copy the resulting puzzle. After matching both marks, copy the return replay.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with fresh profiles. Run `./scripts/verify-chaos-engine drive shutter-sheets`.

Create a fresh pair of targets on every coupled rig, reject a reversed pair, and solve each link in a fresh profile. Return and independently replay each result. Download a challenge and a returned file, disconnect the browser and create a GIF in both files.

## Gotchas

The invitation encodes the target coordinates and frames. A fair starting fit is recomputed on opening. Custom receipts are separate from the six official machines and watching a return earns no receipt.
