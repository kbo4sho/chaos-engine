# Sorting room and material handling

Jobs 321 through 360 route a small gold marble and a larger blue parcel to separate receivers. Either load can arrive first. Some receivers need a load to settle inside for several consecutive frames.

## Sub-features

- The sieve separates loads by actual clearance. The funnel guides them along its slats, the basket catches them and the low-friction ice rail provides a shallow exit.
- A one-way gate lets a load cross in the arrow direction and stops a return from the other side. A zipline collects a rider at its entrance and releases it along the tangent at its other end.
- The small circle and large diamond correspond to labeled receivers. The film reports each acceptance separately. An empty machine can deliver one of its two loads.
- The tool lab compares three physical load diameters. The same gap can pass the smaller marble and catch the larger one.

## How to get to it (user POV)

Open PUZZLES, Level map and Jump to a tool course. Choose Play the sorting room. Inspect the gold ring and blue diamond, fit a spare, then run both loads. Choose a receipt beneath the scrubber to inspect the state at delivery. Tool lab offers each handling part under three load diameters.

## Driving it with verify-chaos-engine

Preconditions: isolated launch, passing doctor and a fresh Chrome profile.

- Run `./scripts/verify-chaos-engine drive sorting-course`. Try the six tools, compare a 14-unit and a 42-unit load on the same grating, and check that only one load arrives in the empty first machine.
- Repair the first job and inspect the blue receipt and later gold receipt. On Above the gate, check that the same marble passes upward and then lands on the gate from above.
- On desktop, fit the final sorting line. Inspect all four tools and both receipts. Save and reload the sandbox assembly, check its solid bars and basket, press Play and observe both loaded receivers. Download the recording and reproduce the same receipts and events offline.
- Drive `puzzle-campaign`, `tool-lessons`, `tool-press`, `puzzle-library`, `save-load` and `ui-layout` for the related player paths.

## Gotchas

- The bins accept only the matching load. A HOLD receiver needs consecutive slow frames within the actual receiver.
- A sieve can report both a true passage through its opening and a physical contact on its bars. Scrub the run to see which load did each.
- Reaching one bin is partial progress. The repair record appears after both arrive.
