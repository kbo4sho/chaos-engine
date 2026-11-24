# Repair celebration

## Sub-features

A successful run lights a centered REPAIRED signal with the machine name. The bench and Fault Desk use the same glass panel. It clears after 2.4 seconds or when the player starts the next attempt. Reduced motion keeps the glass steady.

## How to get to it (user POV)

Open The last bell, fit the bridge in the first socket, and test it. Run again, watch the recorded repair, or expand the workbench and repeat. On the Fault Desk, service the faulty station and let its test finish.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with a fresh browser profile. Run `./scripts/verify-chaos-engine drive repair-celebration`.

Use a desktop keyboard and a touch phone to earn the result. Capture the visible viewport, the status, and the saved repair. Check the signal on a repeat, an expanded bench, a reduced-motion run, a replay, and a successful service test. Tap Next through the signal. Reload the repaired machine and also run it empty.

## Gotchas

The final receiver can still be settling while the pilot reads Contact. Observe the transition to Repaired. An old repair receipt, a scrubbed film frame, and a failed service test must never light the panel.
