# Move repairs to another device

A personal repair notebook carries successful fittings, unfinished builds and their undo history, first working tool contacts, and the best economy and speed fittings for work orders.

## Sub-features

- Download an anonymous JSON file from a personal machine. It contains tool and socket choices, including flipped rails and up to 32 undo steps per unfinished build.
- Opening a notebook replays completed fittings with Matter.js and previews the recoverable contents. Cancel anytime before merging.
- A merge keeps the destination's existing winning repairs and unfinished fittings. It adds missing tool marks from physical events, merges work orders using their measured time, and can be repeated.

## How to get to it (user POV)

Open the level map on a personal bench. Expand **Move repairs to another device** and choose **Download repair notebook**. On the second device choose the file in the same panel. Review the results, then choose **Merge into this bench**. Continue an unfinished repair or open an earned contact in Practice by tool.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass. Run `./scripts/verify-chaos-engine drive repair-transfer`. Download a real notebook with campaign, order and unfinished work. Import it in another browser profile, cancel once, merge twice, review a tool contact, resume and undo a fitting, preserve a conflicting local build and reject a missed repair and an unknown machine. Drive unfinished-repairs, tool-notebook, work-orders, phone-startup, save-load and ui-layout as adjacent journeys.

## Gotchas

The file is a personal transfer. Blind challenges, enclosed replays and shared setups hide its controls. A repair first earned from a borrowed setup retains that status. Work-order invitations, match histories and separate discovery-station records stay in their own books. The destination retains up to 32 generated repairs and 24 generated drafts, with existing work taking priority.
