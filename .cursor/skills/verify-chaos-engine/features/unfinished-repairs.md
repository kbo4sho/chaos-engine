# Unfinished repairs

Leave a partially fitted machine and return to the same spares, sockets, orientations and undo history.

## Sub-features

- Reloading the working tab or reopening the game at its usual starting address restores the current unfinished machine. A fresh puzzle link offers the local fittings at the bench.
- Unfinished repairs in the level map lists numbered levels, guided lessons, open work orders and printed machines. A successful personal delivery retires its draft. Reset clears the current revision.
- Separate machines have separate entries. A stale tab cannot discard a newer edit in another tab by completing or resetting its own work.
- A shared setup, portable file, friend race and match card open with their own starting state.

## How to get to it (user POV)

Fit one or two spares to a three-part machine and reload. Choose Undo fit to return to the previous fitting. From a different machine, open Level map and Unfinished repairs. Choose the machine by title. A fresh link to its numbered level also offers Resume fittings.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with an empty browser profile. Run `./scripts/verify-chaos-engine drive unfinished-repairs`.

Use the first assembly machine to persist two spares, reload and undo, lose a real run, close the working tabs, resume and finish. Compare a bare puzzle link, a fitted setup and a blind friend invitation on the same device. Verify a reversed rail and a guided lesson survive reloads and that a stale tab cannot delete a newer draft.

## Gotchas

Drafts store at most 32 undo steps per machine and the most recent 24 printed machines. A browser with storage blocked can keep drafts during the current visit. A copied puzzle link carries the puzzle identifier. The recipient’s local draft is available only if they have played that machine on their device.
