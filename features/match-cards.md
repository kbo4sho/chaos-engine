# Three-round match cards

Eight cards use all 24 work orders. Each card measures economy, speed and delivery closest to a known clock time. The featured card rotates at midnight UTC, and every card stays available.

## Sub-features

- Choose a card or play the featured three machines against the house. Each machine has a beatable recorded run, a distinct scoring rule and a blind start.
- Return to any round. The scorecard keeps the best earned delivery for that rule, including after a refresh and across two tabs. Inspect both recordings at a shared physics frame.
- Challenge another player with a completed card. Send a return to compare all six runs. Return viewers can watch each round or open a fresh attempt.
- Download a blank challenge, a challenge made from your own three runs, or the returned card. A disconnected player can earn and package a reply inside the file.

## How to get to it (user POV)

Open the level map and expand Three-round match cards. Choose the featured card or select another one. Deliver the first round and choose Next round. Open the scorecard after three deliveries to send a challenge. A guest uses Copy return card to send the result back.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with fresh profiles. Run `./scripts/verify-chaos-engine drive match-cards`.

Play each of the eight cards, restore a partial by refreshing, try a worse fit and verify the superior score survives. Copy and return the cards from separate browsers. Check all 24 returned films against their physical receipt frame, and confirm viewing earns no score. Carry a card through a disconnected guest and separate viewer using actual downloaded files. Capture the phone continuation and the final timed round.

## Gotchas

The third round rewards distance from the stated clock time. A slower delivery can win. Time ties use fewer parts. When that also ties, the round is drawn. A returned card re-simulates the fittings in its address. A shared house score and a personal score have separate receipt keys.
