# Guided lessons and practice

Learn the tools is a 75-level path through all forty-six puzzle parts. It starts with a bridge, a conveyor and a trampoline. Practice by tool lets a player compare a part in the lab, then open one of three levels that use it.

## Sub-features

- `guided-route` mixes classic, powered and clockwork machines into twelve lesson groups. Next lesson advances on this route.
- `shared-progress` uses each level’s existing repair. A repair earned in either route also counts in the other.
- `practice-index` offers Meet, Practice and Combine levels for every part. Checkmarks identify repaired practice levels.
- Predict a run opens a [two-experiment practice](./prediction-lab.md) for the selected tool.
- `classic-lab` compares a fitted part with an empty mounting point. The domino experiment traces the final tile.
- `playback-controls` offers half, normal, double and quadruple speed. Pause freezes a live run. Step 1 frame advances one physics step.

## How to get to it (user POV)

A new player starts in guided lessons. From a numbered machine, choose Learn the tools above the bench. After a repair, press Next lesson. Choose Lesson map to jump to a group. Open Practice by tool in the level map to choose a tool, open its lab or pick a numbered practice machine. Change the speed above the canvas, or pause a run and use Step 1 frame.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and passing doctor, fresh Chrome profile.

- **Lesson sequence.** Run `./scripts/verify-chaos-engine drive tool-lessons`. The journey enters from the bench, fits and plays all 75 lessons on a phone and reads the recorded fitting and lesson counts.
- **Timing.** The first run starts at half speed, pauses with its clock fixed, advances exactly one frame and finishes at quadruple speed. A double-speed replay after reload must contact the goal at the same simulation tick.
- **Practice.** The driver visits every tool in Practice by tool, compares fitted and missing dominoes in the lab and returns to a numbered practice level. It then opens the completed guided map on desktop.
- **Numbered progression.** Run `./scripts/verify-chaos-engine drive puzzle-campaign` to verify all 400 numbered machines. The driver plays the opening levels at their default rate and uses the player’s 4× control for the rest.

## Gotchas

- Guided links contain `#learn/`. A numbered level and its guided version share the same stored repair.
- Recorded times use simulation seconds at every playback speed. Step 1 frame is available while a run is paused.
- Practice levels can use a tool already installed in the machine. A player still needs to work out which part is missing.
