# Practice two tools together

Choose any of the 54 tools and a compatible partner. Three machines introduce each tool on its own and then require them to act in a combined delivery. The tool list comes from observed contacts during physical repairs.

## Sub-features

- Choose from 141 tool pairings. Each warmup teaches a working fitting, except the installed parcel hatch, which the player opens with a different spare. Each combined machine needs both named tools to act.
- Before a combined run, optionally predict which tool acts first, including the possibility that both act on one frame. A successful run offers a separate film button for the exact first contact of each tool.
- The three-machine course can be opened at any stage. Completed stages persist on the playing device. Some pairings offer alternate combined machines. A single anonymous HTML file carries all stages and their physics offline.

## How to get to it (user POV)

Open **Level map**, expand **Practice by tool**, choose the first tool, then open **Practice two tools together**. Choose a partner and start or resume the course. Fit the parts and test each delivery. Select a recorded contact to inspect its frame. Choose **Prepare offline practice** and save the file to take the three machines with you.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass. Run `./scripts/verify-chaos-engine drive pair-training`. Drive every two-tool combination and one warmup for each tool. Make a wrong call, inspect the contact frames, reload a completed course, and solve an entire downloaded practice file in a fresh offline browser. Run tool-notebook, tool-lessons, phone-bench, phone-startup, qualification-course, save-load and ui-layout.

## Gotchas

A completion requires an actual winning run in this practice course. A correct prediction is optional. Watching a replay leaves the practice record intact. The hatch warmup asks the player to operate the installed hatch; its combined machine requires a fitted hatch. Returning to a different variant keeps its own combined delivery record.
