# Powered tool course

Sixty machines teach eight powered tools in six chapters. Players can start at First belt directly from the level map. The opening lessons isolate a force. The last chapter combines four powered parts in each machine.

## Sub-features

- `course-entry` starts or resumes the powered course independently of progress in the first hundred levels.
- `bench-note` gives an optional prediction about a tool or handoff. Introductory levels open the note.
- `tool-lab` runs a powered and an unpowered experiment from the same release. Players can change the tool or release position, play, pause and scrub.
- `tool-contacts` gives each distinct activated part a timestamp after a run. Its button moves the inspection slider to the recorded frame.
- `powered-transfer` carries the fitting and the other instruments into a sandbox save and a standalone replay.

## How to get to it (user POV)

Open One Part Missing in the sandbox. Choose Level map, expand Jump to a tool course, then choose Play the tool course. Choose a part and a socket, then Test repair. Open Bench note for a hint or Tool lab for an independent comparison. After a run, choose a tool timestamp beneath Inspect run. Open in sandbox transfers the fitted machine. Save replay file downloads a playable copy.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and passing doctor, fresh Chrome profile and installed dependencies.

- **Entry and practice.** Run `./scripts/verify-chaos-engine drive tool-course`. Follow Play the tool course on a phone, watch the empty belt miss, then repair it and tap its contact timestamp.
- **Experiment.** The same command switches between all eight tools, changes the release, plays, pauses and rewinds. Escape closes the lab and restores focus.
- **Transfer.** The driver solves the four-tool finale, inspects each activation, saves the fitted assembly through the sandbox UI, reloads it and plays it through its final signal. It also downloads the replay, opens it offline and runs the lab there.
- **Every repair.** Run `./scripts/verify-chaos-engine drive puzzle-campaign` to fit and test every machine in sequence and read progress again after reload.

## Gotchas

- A ring marked OUT receives the marble from IN. Its separate trail resumes at the exit.
- Power off in the lab leaves the physical belt or spring bed in place. The visible difference measures what the powered action contributes.
- A timestamp records first use of one physical part. Two trampolines can each have a separate button.
