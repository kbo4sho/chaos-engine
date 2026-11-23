# Inspect the design press trials

A designer can inspect the seven starting positions used by the press, then follow the actual contact or missed delivery that explains a rejected drawing.

## Sub-features

- Compare complete and stripped machines at seven horizontal release offsets, from three units left of center to three right. Every cell reports its physical outcome and final frame.
- Open a cell, scrub its film, or jump to the first action of a fitted spare and the recorded arrival at a receiver. Back to release table returns keyboard focus to the selected starting position. The tray and editor draft are preserved.
- Inspect a failed test to see the exact unreliable release, empty delivery or shorter repair that made the press reject the design. A shorter repair names its fitted parts and sockets.

## How to get to it (user POV)

Open **Build a machine** and **Inspect seven release positions**. Choose a result to see its film. After a rejected design, **Inspect the failed test** opens the specific configuration that demonstrates the problem. Adjust a station or receiver to rerun the open table.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass. Run `./scripts/verify-chaos-engine drive release-trials`. Review and adopt real drawings through the launcher. Examine a six-of-seven delivery, compare every result to its simulated release, scrub and jump to physical contacts, and inspect a single-spare shortcut and a successful stripped delivery. Edit the design while its table is open. Prove a corrected machine and verify that film inspection earns no repairs. Also drive design-bench, compound-designer, drawing-exchange, tool-press, phone-bench, save-load, offline-workshop and ui-layout.

## Gotchas

- A stripped machine retains permanently mounted hardware. When a shorter repair succeeds, its film includes only the indicated removable spares.
- The press shifts the starting gold marble horizontally. Frame counts use the same sixty-step clock as the puzzle.
- A duplicate drawer part is a construction error. It has no playable counterexample. The press explains how to choose distinct spares.
