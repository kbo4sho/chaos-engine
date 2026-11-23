# Design a multi-part machine

The design library contains 120 working machines spanning the 54 tools. A player can design a repair around one, two or three empty stations.

## Sub-features

- Open a working machine after earning its repair, or browse two- and three-spare machines by chapter from Build a machine.
- Leave a station installed, choose the missing tools, swap compatible hardware, move a mount, change a physical setting or capture the final receiver from the actual delivery actor.
- Preview the intact and incomplete machines. Undo, redo and reload preserve the drawing. Issue a playable link after physical verification. The link, native sandbox and standalone replay use the same fittings.

## How to get to it (user POV)

Repair an eligible campaign machine and choose **Design this machine**, or open **Build a machine** and choose a design library. Use the checkboxes to decide which stations the player must restore. Make a change and choose **Test & play this design**. Fit the spares and run the delivery. A recipient can play from a blank bench and edit the shared machine.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass. Run `./scripts/verify-chaos-engine drive compound-designer`. Open the final campaign machine, repair it, change its pulse calibration and leave the middle station installed. Undo and redo, reload the draft, issue it, miss a partial repair, win with both spares, open it on a fresh device, edit the shared drawing and watch its downloaded film offline. Reject two identical removable spares. Issue and repair all 120 stock designs through the controls. Also drive design-bench, machine-diagram, pair-training, qualification-course, phone-bench, offline-workshop, save-load and ui-layout.

## Gotchas

- Each part in the drawer can be placed once. A checked station is removed for play. At least one station must remain checked.
- The press checks seven release positions and tests the available shorter repairs. Every removed tool must act on the completed delivery. Its explanation identifies which condition failed.
- A permanent station can change playable socket numbers. Existing single-part shared links keep their published addresses.
