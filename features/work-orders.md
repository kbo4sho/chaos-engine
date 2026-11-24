# Open-ended work orders

Twenty-four delivery jobs keep two personal records. One spare can always finish the order. On every board there is also a quicker route using two working fittings.

## Sub-features

- [Friend challenges](./friend-races.md) send a blind time to beat and return a synchronized two-run replay.

- Four order books move from basic powered tracks to signals, cables and shaft transmissions. Each order has its own receiver, parts drawer and bench note.
- Fewest parts favors a compact build, then the quicker delivery with that part count. Fastest favors elapsed simulation time, then fewer parts. Players can refit either record and continue experimenting.
- Copy fitted setup shares an exact arrangement. Opening it fits the spares and lets the recipient test them. A delivery earns credit only when the recipient runs it.
- Save replay file can export either personal record after choosing Fit setup. Open in sandbox transfers the current fittings.

## How to get to it (user POV)

From One Part Missing choose Level map, then Work orders. Pick an order book and a job. Fit one or two spares and test the delivery. The record buttons return either setup to the bench. Choose Compare last two setups after two different trials to inspect their routes.

## Driving it with verify-chaos-engine

Preconditions: isolated launch, passing doctor and a fresh Chrome profile.

- Drive `./scripts/verify-chaos-engine drive work-orders`. The opening empty run leaves the records blank. Fit and run a working one-part and faster two-part setup in every order. Check the physical arrival time, fitting-specific storage, both record rows and the completed order book.
- On a phone, compare the two winning routes. Open the copied two-spare link in a fresh context, verify it starts with empty records and make the same delivery. Reload the original tab, refit the economy record and play its saved file offline.
- On desktop, open the fitted final order in the sandbox. Inspect the transferred tools, press Play and observe the target register the delivery. Run `save-load` and `ui-layout` for the supported layouts and sandbox save routes.

## Gotchas

- The clock stops at real contact with the receiver. The finished run includes a short tail for inspection.
- Copy puzzle link shares the starting board. Copy fitted setup includes the selected spares. A shared arrangement can still miss.
- Campaign progress and order-book counts are separate. Replaying a recorded file does not award a new personal record.
