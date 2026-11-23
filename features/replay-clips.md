# Replay GIFs

Turn a pair of recorded setups or a returned friend challenge into a looping animated GIF. The file shows the real trajectories, synchronized clock and measured outcome.

## Sub-features

- Film. Solid and dashed paths identify each setup. A challenge includes both receipt times. The loop holds on the delivery result.
- Export. Make replay GIF prepares a file in this browser. Cancel or close the film to stop. Save GIF downloads it. Share GIF opens the device share sheet when file sharing is supported.

## How to get to it (user POV)

Choose Compare last two setups after two distinct trials, or open a returned friend challenge. Select the hardware to show, choose Make replay GIF, then Save GIF.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass. Run `./scripts/verify-chaos-engine drive replay-clips`.

- **Capture.** Deliver a work order, pass the phone, return a different delivery and open the comparison.
- **Cancel.** Begin making the GIF and close the modal. Reopen and verify the earlier export has cleared.
- **Save.** Make and download the film. Check the recorded dimensions, looping extension, changing frames and final hold. Open the downloaded file in an offline browser and decode it.

## Gotchas

A race link opens the interactive physics replay. A GIF is an ordinary image file. Closing its comparison releases the prepared download.
