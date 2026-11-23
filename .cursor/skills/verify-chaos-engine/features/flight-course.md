# Flight school

Jobs 361–400 use service rings to change the motion of a passing load. The first chapters teach individual fittings and mid-flight changes. Later, a gold marble trips a hatch and loads the blue parcel onto a conveyor. The final dispatch uses seven distinct tools and a timed receiver.

## Sub-features

- A float collar cancels gravity, a parachute resists descent, and a thruster continues pushing along the load’s facing direction. A keel resists slip across that direction.
- The hopper foot jumps only against a supporting surface. A bank reflects travel across the body axis. A release hoop removes the carried equipment.
- The gear readout, ordered contact count, hatch state and on-body markings follow the inspection frame. Separate events record attachment, release, banking and grounded jumps.
- All seven fittings have practice levels, two prediction experiments and working stock in the Machine press.

## How to get to it (user POV)

Open PUZZLES, Level map, Jump to a tool course and Play flight school. Fit a spare in a marked socket. Run the machine and choose the pickup or release cue to inspect the gear at that instant. Practice by tool also offers a comparison and prediction for each fitting.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive flight-course`. Test the empty first level, fit the collar, scrub to the frame before pickup, operate the seven lab comparisons and change the load’s heading. Distinguish a hopper attachment from the jump, inspect a release and finish the seven-station parcel flight. Pause a sandbox transfer with two fittings on the parcel, Save and Load it, and verify the parcel sheds its gear and reaches the timed receiver. Open the downloaded final replay offline and compare every event.

## Gotchas

- Floating keeps the vertical speed a load already had. The thruster and keel follow the load’s orientation as it rotates.
- A loaded flight ring attaches on entry. Remaining in a ring cannot repeatedly bank the same load. A released load can collect gear from a later ring.
- The seven-point course proof disables each fixed working station separately. On the later parcel routes the switch, hatch and belt each have a physical job.
