# One Part Missing campaign

Two hundred eighty permanent machines form twenty-eight chapters. Each chapter contains ten playable levels. The six original puzzle links still open their original mechanisms and repair records.

## Sub-features

- The level map shows one chapter at a time. A check marks each repaired level. Continue opens the first unfinished level, including gaps left by skipping ahead.
- Early machines teach rails, rebounds, levers and dominoes. Later chapters introduce ordered contacts, reversible rails, smaller targets and up to four mounting sockets.
- Chapters 25 through 28 require two working spares. The player can test partial assemblies while diagnosing the machine.
- Flip rail reverses the selected bridge or return rail in chapters seven through ten. Flipping a fitted rail changes it on the board. Saved replays, single-file downloads and sandbox transfers preserve its direction.
- In mixed relays, a chime can require the falling weight or a falling tile. The final signal can require a tile after the marble has left the board.

## How to get to it (user POV)

Choose PUZZLES in the sandbox to open the first machine. Choose Level map and select a chapter to jump ahead. Pick a part and tap a lettered socket, then choose Test repair. After a repair, Next machine advances across chapter boundaries. Reopen a level to watch its saved replay.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and passing doctor.

- Run `./scripts/verify-chaos-engine drive puzzle-campaign`. The journey enters through PUZZLES, fits and runs all 280 levels through visible controls, and checks the contact count, elapsed time, repair record and map progress. It checks the chapter boundary at each tenth win, uses touch in chapters seven and eight, reverses an installed rail after a miss, checks its sandbox geometry, and opens the downloaded replay offline. It reloads the completed campaign and checks that all 280 repairs survived. Screenshots and the observed actions, messages and records live in the run's evidence directory.

## Gotchas

- The campaign and workshop share the same physics. A physical contact must come from the correct body in the correct sequence.
- Workshop prints have a separate storage limit. All 280 campaign records can coexist with those prints.
- The authoring script freezes the campaign's launch seeds and targets. To rebuild the score, use `node scripts/author-puzzle-campaign.mjs` with system Chrome installed. It checks the empty machine and intended repair at five launch positions in Node and Chrome, and tries every alternative at the center release.
