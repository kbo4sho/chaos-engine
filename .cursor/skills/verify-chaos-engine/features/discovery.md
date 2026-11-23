# Change one thing

Twenty-four hands-on experiments cover cables, signals, transmissions, sorting, flight equipment and electric fields. Players compare one adjustment on a teaching rig and then set up a different machine to put the moving load in a marked exposure.

## Sub-features

- Fixed close-up. A close view on smaller rigs keeps the same scale between settings. Close-up switches back to the whole bench.
- Explore. Run two settings. The dashed earlier path and measured displacement explain how one physical change affects the load. Seek to the first tool action or visible separation.
- Transfer. A fresh rig changes the release, pivot, track, linkage or cargo sizes. Put the load in its marked position at the displayed time. The sieve requires two separate arrivals.
- Instruments. Inspect the recorded changes to charge, carried gear, collision state and shaft rotation on the advanced benches. Reduced-motion play presents the measured exposure directly.
- Progress. Solving the new machine earns the lesson mark. The course selector and earned marks survive reload. Individual experiment and transfer links open directly.

## How to get to it (user POV)

From Level map choose Change one thing. Choose a physical setting and run the machine. Change the setting and run again, then choose Try the new machine. Set its control and take the exposure. Next experiment opens the following bench.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with a fresh profile. Run `./scripts/verify-chaos-engine drive discovery`.

- **Explore.** Open the link from the game, run two settings on every rig and inspect the measured separation. Toggle the earlier path.
- **Transfer.** On each new machine, run an incorrect setting and verify a measured miss and empty completion key. Use the successful setting and check the actual saved completion.
- **Return.** Reload partway through and after all 24. Confirm the marked course options, the two-load sieve result, and keyboard pause.

## Gotchas

Changing the selector or scrubbing an unearned frame does not complete a lesson. A transfer awards credit only after the simulation reaches its exposure with every tracked load on target.
