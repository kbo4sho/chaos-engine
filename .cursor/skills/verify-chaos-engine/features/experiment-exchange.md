# Take a discovery setup into Chaos Engine

Open a machine with its current settings in the full sandbox. Add tools and see where the physical loads land when its shutters fire.

## Sub-features

- Each of the 24 single-instrument studies carries its teaching reference or transfer targets. The 12 two-control machines carry both timed marks. Player-made sheets retain their own marks.
- A shutter measures the named marble, parcel, drop weight or marked point on the flywheel rim. The ring or diamond shows when the exposure is due and whether the load reached it.
- Save a machine between exposures in a normal sandbox slot. Loading it restores the recorded position, the pending shutter clock and the link to the originating setup.
- The Puzzles link returns to the exact settings, including a player-authored sheet or a returned take. A sandbox measurement is local to that experiment.

## How to get to it (user POV)

On the puzzle map, open a discovery puzzle or a double exposure. Choose settings and follow Open this setup in Chaos Engine. Press Play. Pause to add a tool or save to a slot. Choose Puzzles to reopen the originating experiment.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with an empty browser profile. Run `./scripts/verify-chaos-engine drive experiment-exchange`.

Open every machine from its desk. Compare the native readings to the corresponding puzzle positions for successful and missed exposures, including two simultaneous loads. Return through the link, change the physics with a native bumper, save between two exposures, and finish in a fresh sandbox tab. Verify that a returned take remains a spectator view.

## Gotchas

Study references photograph the selected setting. Transfer machines carry fixed targets. Sandbox edits change the current physical run. A slot preserves those edits. The return link restores the original puzzle controls. Offline film files play independently of the hosted sandbox.
