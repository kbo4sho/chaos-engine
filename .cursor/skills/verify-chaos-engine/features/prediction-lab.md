# Predict a run

Players make two predictions for each of the 46 tools. Each comparison runs two Matter.js machines. Position and arrival readings come from the simulated bodies.

## Sub-features

- **Tool effect** compares the working machine with the disabled tool or empty socket at a specified frame. It tracks the gold marble, blue parcel or final domino.
- **Change input** changes release position, load diameter, shaft speed, descent speed or body heading. The arrow marks the crossing direction. Simultaneous and missing crossings count as possible answers.
- The player can watch and scrub the reference before answering. Afterward, both paths and measurements are visible. Correct and attempted experiments are remembered independently.

## How to get to it (user POV)

Open Tool lab from a machine and choose Predict a run. Alternatively expand Practice by tool, choose a tool, then Predict a run. Choose an outcome, compare the two readings and use Try again or Next prediction. Close returns to the control that opened the experiment.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive prediction-lab`. Enter from the sandbox launcher. Inspect the reference on a phone, choose an incorrect outcome and retry. Complete all 92 predictions, reload the notebook, inspect a paused live attempt, then open a downloaded replay offline and predict a ratchet run. Evidence includes the phone before and after the answer, a desktop timing gate, measured outcomes and the observed storage keys.

## Gotchas

- Effect answers use a 12-unit tolerance. Crossings within one physics frame count as together. A teleport jump cannot cross the space between portal mouths.
- Closing a prediction entered during a running repair resumes that repair. Closing a prediction entered through the Tool lab returns to the comparison.
- The offline replay carries the experiments. The player's notebook belongs to the browser location where they play.
