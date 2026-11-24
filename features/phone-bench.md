# Phone repair bench

On a narrow phone the machine, its spares and the run controls stay together. After a miss a gold rewind marker opens a slow recording of the actual handoff.

## Sub-features

- Compact bench. At up to 640 CSS pixels the note, scrubber, comparison and contact log follow the repair controls. The drawer and recording keep their state across viewport changes.
- Miss marker. Tap the rewind ring to see the measured contact or closest approach at quarter speed. Pause, scrub or return to the exact event. Reduced-motion mode opens a still frame.
- Socket-first fitting. Tap an empty socket, then a spare to place it. Undo fit restores the previous physical setup, including a cleared or replaced part.
- Next repair. The next lesson is the first action after a successful repair.

## How to get to it (user POV)

Choose One Part Missing on a phone. Run the first machine empty and tap the gold marker. Close the recording, choose a spare, tap a socket and test the repair. Follow Next lesson through the belt and trampoline.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with a fresh browser profile. Run `./scripts/verify-chaos-engine drive phone-bench`.

- **Miss.** Tap Run, then tap `#miss-pin`. Observe moving film frames, pause, and return to the measured event.
- **Repair.** Tap the real spare, socket and run controls for each of the first three lessons at 390×664. Their centers must be reachable without scrolling. Save screenshots and the earned repair receipts.
- **Resize.** With reduced motion enabled, open the marker and verify a still frame. Restore a wide viewport and find the film with the cabinet again.

## Gotchas

Touchscreen coordinates must already be visible. Automation that scrolls a selector into view before tapping cannot prove this layout.
