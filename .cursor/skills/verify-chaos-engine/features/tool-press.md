# Tool-aware machine press

Players can print a single-tool puzzle, a chain reaction or a parcel delivery. The two tool selectors offer compatible combinations. The press changes the release, fittings and receiver on an existing plate, tests the resulting puzzle and gives the player a shareable print.

## Sub-features

- `print-style` selects a mechanism family. Original track press still produces first-generation workshop numbers.
- `featured-tools` chooses one or two working tools. The second selector updates to show partners available for the first.
- `fixed-ticket` identifies the exact layout and final target. Reopening a link reconstructs that layout and checks its repairs.
- `practice-print` makes another puzzle featuring the tool selected in Practice by tool.
- `print-transfer` opens the fitted print in the sandbox or downloads a standalone replay, including the parcel mechanism.

## How to get to it (user POV)

Open PUZZLES and scroll to Machine press. Choose a machine type, an optional featured tool and an available partner. Choose Generate a machine. Open Workshop trial record to see the fitting count and source plate. Use Copy puzzle link, Open in sandbox or Save replay file to take the print elsewhere. Practice by tool also has a Print a practice machine button.

## Driving it with verify-chaos-engine

Preconditions: isolated launch, passing doctor and a fresh Chrome profile.

- **Print and share.** Run `./scripts/verify-chaos-engine drive tool-press`. On a phone, ask for a chain using a fan and magnet. Fit the repair and inspect the recorded contacts. Copy the actual link and solve it in a new browser context with empty progress.
- **Cable rig.** Ask for a pulley and a damper. Inspect the working print for the taut cable and the damper taking a load.
- **Cargo and export.** Print a switch-and-hatch delivery, deliver the parcel, inspect the workshop record and import the fitted machine to the sandbox. Download its replay and verify the delivery offline.
- **Practice.** Choose a pinwheel in Practice by tool and print another machine. The driver checks the pinwheel’s contact in the resulting run.
- **Original and edited prints.** Run `./scripts/verify-chaos-engine drive one-part-missing` for the original track press, target edits, local repair persistence, sharing and offline files.

## Gotchas

- A featured tool can already be installed. The missing fitting is still for the player to discover.
- The press uses a tested reserve print matching the requested tools when its new variations miss their trials.
- The final target position is part of the print link. Changing the target in the maker creates a separate remix and preserves the source ticket.
