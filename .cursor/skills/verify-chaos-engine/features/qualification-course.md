# Cross training and qualification finals

Twenty numbered repairs make older and newer tools work together. Levels 501–510 use two spares. Levels 511–520 ask for two ordered deliveries, and 516–520 require three active fittings.

## Sub-features

- Each machine has one certified setup. Empty and partial arrangements miss across seven nearby release points. All fitted parts act before the final receipt.
- The activity list identifies each physical fitting and jumps to its first contact. A falling domino, a moving parcel and a gold marble can each be named as the required striker.
- The practice notebook offers a compound machine for every one of the 54 tools. Combined-contact films can jump between both working spares.
- Exact builds can be shared, downloaded, saved as drafts or opened in the sandbox. Guided lessons and the course index lead into both chapters.

## How to get to it (user POV)

Choose Level map, open the course index and select Play cross training. Install one spare and run the machine. Inspect the fitting time, then install the next spare. In the finals, read which load rings the chime and which one raises the flag.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass in a fresh profile. Run `./scripts/verify-chaos-engine drive qualification-course`.

Start at the public launcher, make each incomplete setup miss, then fit and win all twenty through the ordinary controls. Inspect observed working frames, the falling-domino handoff and both label-and-clock receipts. Return through a shared pair, play a three-spare downloaded copy offline, and open the completed final machine in the native sandbox.

## Gotchas

A chime and flag can require different strikers. Reaching the flag before the chime cannot finish a final. The goal clock measures simulation time. A fitting’s activity time records its first actual effect and can precede the final receiver by several seconds.
