# Inspect a point on a recorded path

Tap a moving load’s recorded route to inspect the nearest physics frame. A stationary input wheel is tracked by its rim notch. Dominos and drop weights appear when they actually move.

## Sub-features

- A highlighted stroke follows one named load and setup. Each reading reports a time and a position in bench units. Portals split the stroke at the teleport.
- Repeated visits offer Next pass here. Keyboard users can choose the highest, lowest, leftmost or rightmost visible point.
- The bench, comparison films, discovery puzzles and double exposures use the same interaction. Zoomed discovery views map taps back to the original coordinates.
- Paths become available after a physical recording. A returned race and its downloaded file expose both recorded setups.

## How to get to it (user POV)

Finish a run. Expand Inspect a point on the path near the film controls. Choose the setup or load if several are available. Tap its route on the machine or choose a landmark. On an overlapping route, choose Next pass here to inspect another visit.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with fresh profiles. Run `./scripts/verify-chaos-engine drive path-reader`.

Release the first machine empty, select its rightmost landmark and tap an actual point on a phone. Tap empty glass, reset and verify the old route disappears. Cycle repeated visits on a returned freight race, export the file and select a landmark offline. Pick a previous setup on a cropped discovery bench, switch back to full view and check that the same physical point selects the same frame. Select the square weight on a hoist recording.

## Gotchas

The target is a sampled frame. A fast load can travel across the selected point between frames. The landmark menu uses the current camera view. Jumping to a recorded position changes the film cursor, and watching a clip leaves the viewer’s repair book untouched.
