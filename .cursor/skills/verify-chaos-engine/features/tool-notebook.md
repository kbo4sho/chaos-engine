# Your tool notebook

See which tools acted during your own deliveries. Replay the first contact beside a recording of the same machine running empty.

## Sub-features

- Seen, fitted and combined record three different observations. A fitted spare earns a mark when its own body acts before delivery. A combined mark also names a second fitted spare that acted.
- Each tool has a practice recommendation drawn from machines where every certified solution requires that tool. Choosing an unfitted tool moves to another entry in the same selector.
- Older saved repairs are played through the current physics in short background steps when practice opens. Shared pre-fitted setups and returned films keep their own results.
- The first observation at each grade remains available with its actual machine, part settings, contact time and load. Replaying a notebook entry leaves the current bench and its fittings in place.

## How to get to it (user POV)

Open Level map, then Practice by tool. Select a tool, follow its fitting recommendation, install the spare and make a delivery. Reopen practice, choose a recorded contact and step through the film. Use the hardware menu to inspect the working or empty bench.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with a fresh profile. Run `./scripts/verify-chaos-engine drive tool-notebook`.

Miss a delivery, then fit all 54 tools on live machines. Complete the recommended compound repairs. Open an earned contact and inspect its precise frame, the working delivery and the missed empty run. Reload the book. Play a shared prebuilt delivery on a fresh profile and check that it cannot create personal fitting evidence.

## Gotchas

A spare sitting in a tray or an idle fitting earns no contact. A machine can contain another working copy of the same tool. Fixed-body events count as seen. A fitting event must identify the body the player installed. The displayed times come from the physics clock, including the first span of a loaded cable or a driven shaft.
