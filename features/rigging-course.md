# Cable rigs

Four chapters introduce seven connectors across levels 201–240. The first machines isolate tension, compression, recoil and damping. Later machines couple two moving loads and send the parcel through powered equipment.

## Sub-features

- Suspension shop introduces a tether, rigid strut, coil spring, damper, winch and weak link. The lab overlays a trial with the fitting installed and an identical release with it removed.
- Counterweight loft introduces the pulley. Motion of a load on one side changes the length available to the other.
- Release works and Rigging floor combine the connectors with working fans, belts, magnets, trampolines, deflectors and other parts.
- Hovering or focusing a connector socket reveals its attachment points. The accessible socket label names both endpoints and the starting span. Fitting a connector draws its geometry immediately.
- The film captures changes of span and the moment a weak seam breaks. Contact buttons jump to the corresponding recorded state.
- Sandbox saves preserve both moving endpoints, the anchor, reel position and break state. Replay files carry the same physics offline.

## How to get to it (user POV)

Open PUZZLES, choose Level map, then Play the cable rigs. Run the first machine empty, examine the mount positions, fit a connector, and test the repair. Visit Tool lab for a side-by-side experiment. Later chapters use a gold marble and a separate blue parcel. The diamond on the parcel identifies the body that must reach the receiver.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive rigging-course` after launch and doctor. On a phone the journey enters through the map, opens all seven experiments, observes an empty miss and repairs three machines. It checks the tension and break timestamps, jumps to the broken frame, and records both cable and field effects in the finale. On desktop it replays the repair, imports it into the sandbox, saves and loads it, and watches the restored parcel reach the receiver. It downloads the final replay and verifies the same sequence without a network connection.

Drive `puzzle-campaign` for all 520 numbered repairs and `tool-lessons` for the shorter 103-lesson route. Drive `tool-press` for choosing two compatible tools and sharing the resulting machine.

## Gotchas

- A tether can go slack. A strut maintains separation under both compression and tension.
- The pulley routes its cord over the selected mount. Two mounts joining the same moving bodies can have different wheel locations or line lengths.
- A weak link can load and snap at different times. Inspect either event using its button.
