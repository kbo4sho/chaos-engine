# Clockwork and cargo

Forty clockwork puzzles use moving platforms, eccentric cams, pinwheels, pistons, tripwires, trip switches and hinged hatches. Twenty have a gold signal marble and a separate blue parcel marked with a diamond. The final delivery uses seven instruments.

## Sub-features

- `clockwork-entry` opens the first unfinished clockwork machine independently of the two earlier courses.
- `motion-study` compares moving and stationary parts in the tool lab. Three release positions change the time and location at which the marble meets a surface.
- `cargo-handoff` requires the gold marble to trip a switch before the hatch opens. The final receiver requires the blue parcel.
- `parcel-film` shows the parcel’s trace and identifies its contacts. Inspecting a contact hides the socket buttons and shows the stage of the delivery at that time.
- `saved-clockwork` preserves the fitted moving assembly in sandbox saves and in standalone replays.

## How to get to it (user POV)

Open PUZZLES, choose Level map, then Play the clockwork course. The chapter selector also opens Lift shop, Rotary works, Gatehouse and Parcel depot. Choose Try a tool in the lab to experiment with a mechanism. Fit a part, run the machine and tap a contact below Inspect run to see the handoff.

## Driving it with verify-chaos-engine

Preconditions: isolated launch, passing doctor and a fresh Chrome profile.

- **Learning and repair.** Run `./scripts/verify-chaos-engine drive clockwork-course`. Enter on a phone, run all seven new lab experiments, then repair the opening elevator.
- **Two marbles.** The driver watches the first empty gatehouse miss, fits its switch and observes the parcel reach the receiver. It then jumps to the final depot, records seven instrument activations and inspects the blue parcel’s contact at its recorded time.
- **Save and replay.** The driver imports the repaired finale, saves and reloads it through the sandbox controls, then presses Play and observes the switch, hatch and parcel receiver. It also downloads the replay and runs it offline.
- **Complete course.** Run `./scripts/verify-chaos-engine drive puzzle-campaign` for all numbered repairs, chapter navigation and persistence after reload.

## Gotchas

- The solid gold marble operates the switch. Only the blue diamond parcel can complete a cargo delivery.
- Switch and hatch can share a timestamp. The parcel continues under gravity after the hinge begins moving.
- An experiment can miss a tool when the release is moved. “Outside the working area” reports that outcome.
