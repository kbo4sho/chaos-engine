# Commission a production line

Twenty-four commissioning jobs test one set of station adjustments against three physical input conditions. A setting that accepts the nominal load can miss a different size, feed position, heading, mass or shaft speed.

## Sub-features

- The opening six jobs have one five-position control. Later jobs use two separate stations. Each lot displays its physical input value and its receiver on the bench.
- Test one load or queue all three. Pause, change playback speed or stop the batch. The final inspection jobs add timed receiving windows.
- Selecting a completed test reopens its recording. Inspect individual frames, read the closest approach or a rejected arrival, and overlay the three recorded paths and target outlines.
- Moving a control clears the three test results. A line earns a certificate when all three physical runs pass with the same settings. A saved draft, shared link or downloaded job is playable before a new approval.

## How to get to it (user POV)

Open Level map, expand Jump to a tool course, and choose Commission a production line. In Catch height, test the default bed position with small, nominal and large marbles. Inspect the missed load, adjust the bed, and run all three again. Later jobs identify the two adjustable stations with matching letters on the workbench.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive test-bay`. From a phone, compare a two-pass batch, rewind an individual load, change the height, pause and stop a batch, and verify one successful load earns no certificate. Reload the draft and approve every job from its real controls. Inspect the final traces, share the settings to a fresh profile and replay the exported HTML file offline.

## Gotchas

- Each lot has its own marked receiver. The three lots must use identical station settings.
- Selecting another load preserves the current tests. Physically adjusting either station invalidates those test results. A previously earned certificate remains available for recall.
- A downloaded setup includes the engine and its settings. It carries no completed certificates.
