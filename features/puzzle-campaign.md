# One Part Missing campaign

The campaign has 520 permanent machines in 52 chapters. Each chapter contains ten playable levels. The six original puzzle links still open their original mechanisms and repair records.

## Sub-features

- Jobs 501–520 teach two working spares, ordered contacts and three-spare finals. See [Cross training](./qualification-course.md).
- Jobs 481–500 join a gold signal line to a separate blue freight line. The final dispatch uses twelve working tool types. See [Grand relays](./grand-relays.md).
- Jobs 441–480 add charged bodies, controlled passage through solid barriers and field impulses. See [Field stations](./field-course.md).

- Jobs 401–440 require three independent working spares. See [Three-part repairs](./assembly-course.md).

- Jobs 361–400 in [Flight school](./flight-course.md) attach equipment to moving loads and combine it with parcel dispatch and timed arrivals.

- The level map shows one chapter at a time. A check marks each repaired level. Continue opens the first unfinished level, including gaps left by skipping ahead.
- Early machines teach rails, rebounds, levers and dominoes. Later chapters introduce ordered contacts, reversible rails, smaller targets and up to four mounting sockets.
- Chapters 25 through 28 require two working spares. The player can test partial assemblies while diagnosing the machine.
- Chapters 29 through 32 teach six shaft transmissions before adding direction-marked and timed receivers.
- Chapters 33 through 36 sort two different loads into independent receivers. Receivers marked HOLD need the load to settle.
- Flip rail reverses the selected bridge or return rail in chapters seven through ten. Flipping a fitted rail changes it on the board. Saved replays, single-file downloads and sandbox transfers preserve its direction.
- In mixed relays, a chime can require the falling weight or a falling tile. The final signal can require a tile after the marble has left the board.

## How to get to it (user POV)

Choose PUZZLES in the sandbox, then Level map and Continue to enter the numbered progression. Choose Level map and select a chapter to jump ahead. Pick a part and tap a lettered socket, then choose Test repair. After a repair, Next machine advances across chapter boundaries. Reopen a level to watch its saved replay.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and passing doctor.

- Run `./scripts/verify-chaos-engine drive puzzle-campaign`. The journey enters through PUZZLES, fits and runs all 520 levels through visible controls, and checks the contact count, elapsed time, repair record and map progress. It checks the chapter boundary at each tenth win, uses touch in chapters seven and eight, reverses an installed rail after a miss, checks its sandbox geometry, and opens the downloaded replay offline. It reloads the completed campaign and checks that all 520 repairs survived. Screenshots and the observed actions, messages and records live in the run's evidence directory.

## Gotchas

- The campaign and workshop share the same physics. A physical contact must come from the correct body in the correct sequence.
- Workshop prints have a separate storage limit. All 520 campaign records can coexist with those prints.
- The authoring script freezes the campaign's launch seeds and targets. To rebuild the score, use `node scripts/author-puzzle-campaign.mjs` with system Chrome installed. It checks the empty machine and intended repair at five launch positions in Node and Chrome, and tries every alternative at the center release.
