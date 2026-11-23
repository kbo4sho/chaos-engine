# Two-part repairs

Levels 241–280 ask the player to restore two different tools to one apparatus. The first machine has two tools and two sockets. Later jobs introduce spare tools, unused mounting positions, two moving bodies and handoffs across seven instruments.

## Sub-features

- The workbench accepts two fitted parts in either order. Placing a part on an occupied socket replaces its occupant. Placing an installed spare elsewhere moves it.
- The fitted-parts list identifies each tool and socket. Activate its remove button to return that spare to the drawer. A full machine accepts a new tool in an occupied socket or after the player removes one.
- Players can run any intermediate arrangement. The film and status identify the first handoff, including an installed tool that never acts. Only a working pair earns a repair record.
- Replay, portable files and sandbox links preserve both fittings. Target remixes test both individual parts and all available pairs.
- Two empty sockets, Clockwork pairs, Coupled repairs and Master repairs each have ten jobs. The guided path samples six of them.

## How to get to it (user POV)

Open PUZZLES and Level map. Expand Jump to a tool course and choose Play two-part repairs. Fit one spare and run the partial repair to see what it accomplishes. Add the other spare and test again. The fitted-parts list lets you remove either tool independently. Open Inspect run to study the handoffs, or Watch replay after reloading the page.

## Driving it with verify-chaos-engine

After launch and doctor, run `./scripts/verify-chaos-engine drive paired-repairs`. On a phone the driver runs the opening job empty, with one part, with the tools swapped, and with the correct pair installed in reverse order. It removes a fitting, checks the actual local repair record, and replays it after reload. On desktop it restores the seven-tool finale, checks the full-rack response, opens its editable assembly, and watches the parcel reach the receiver. It downloads the repaired machine and checks the same cue sequence offline.

Drive `puzzle-campaign` for all 400 repairs, `tool-lessons` for the mixed learning path, `save-load` for the sandbox save controls and `ui-layout` for the supported viewports.

## Gotchas

- Drawer tools are physical spares. Moving one to a new socket frees its old position.
- Selecting a tool leaves the assembly in place until a socket is chosen. Intermediate testing is part of solving the problem.
- A saved repair stores both placements in socket order. The order the player installed them can differ.
