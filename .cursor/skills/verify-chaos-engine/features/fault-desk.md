# Fault desk

Eighteen diagnostic cases use complete installed machines. One station is reversed, displaced, out of service or slack. The mechanic can inspect any listed station and service one at a time.

## Sub-features

- Watch the failed film and the working reference from the same release. The dashed reference path breaks at real portal transfers. Step the frame slider or jump to the first visible divergence.
- Tap a letter on the drawing or choose the matching inspection control. Compare the station’s first recorded action in both runs before choosing a repair.
- Servicing a station restores its commissioned specification and runs the physical machine again. Only a successful delivery earns a record. The best number of completed, distinct service tests stays local.
- Save a playable case with both machines and the physics engine. A file reopens the case at its failed starting condition.

## How to get to it (user POV)

Open PUZZLES, Level map, Jump to a tool course and Diagnose a faulty machine. Watch the film, inspect the first visible difference, select a lettered station and choose Service and test. The case directory opens any of the eighteen jobs.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive fault-desk`. Inspect the failed trajectory, rewind, pause, cancel a repair, test a healthy station and complete all eighteen physical repairs. Check local best records after reload and prove a fresh offline copy of the final case. Drive save/load and ui-layout as well.

## Gotchas

A downstream station can show no action because the load never arrived. The view compares recorded bodies at the same physics step. An incorrect service leaves the actual fault in place. Pausing or canceling a test does not award a repair.
