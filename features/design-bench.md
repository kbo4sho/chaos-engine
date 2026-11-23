# Build a machine

Six editable starter machines cover powered transfers, parcel release, cable rigs, shaft drives and two-load sorting. A player can change hardware, move a station, adjust physical settings, capture a receiver from a simulated run and choose the missing station.

## Sub-features

- Play or scrub the complete and incomplete machines. Choose any station as the missing part.
- Replace compatible parts and adjust mounting positions, cable length, shaft speed, gear ratio, aperture and other settings where they affect physics.
- Capture the final target from the gold or blue load at a chosen frame. Undo and Redo cover hardware, placement and receiver changes. The latest draft survives reload.
- The press checks seven release points with the completed machine and with the chosen station missing. It also tests the spare drawer. Issued designs have reproducible links, sandbox transfer and standalone replay files.

## How to get to it (user POV)

Open Build a machine below the Machine press. Choose a starter machine, choose a station to edit and try the available hardware. Use Preview and Frame to inspect the delivery. Choose which station to remove for the puzzle, then Test & play this design. Copy puzzle link shares the finished machine. A recipient can open Build a machine and choose Edit this shared machine.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive design-bench`. Start from the sandbox launcher on a phone. Replace a conveyor with a trampoline, select it as the missing station, reject the old target, capture the moving load and verify the draft after reload. Complete the new puzzle in a separate browser profile. Drive the six kits with a different missing station, change a motor setting on desktop, save and restore a custom sorting machine in the sandbox, and watch its downloaded replay offline.

## Gotchas

- A starter offers a working reference. A change to the mechanism can require moving the receiver. The status gives separate diagnoses for an unnecessary station and an unreliable delivery.
- Cable and shaft connections retain their named endpoints. Linked controls show physical calibration where it applies.
- A shared design encodes its geometry and selected missing part. Editing a shared machine produces another drawing and preserves its original link.
