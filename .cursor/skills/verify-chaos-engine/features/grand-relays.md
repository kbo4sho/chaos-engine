# Grand relays

Jobs 481–500 connect a gold signal circuit to a separate blue freight circuit. A shared hatch is the physical handoff between them.

## Sub-features

- Begin with a spare on either side of the door. Add checkpoint order, timed receiving windows, cable mechanisms and eventually three missing parts.
- The dispatch log separates gold contacts, blue contacts and machine actions. Inspect any event at its recorded frame.
- A matched hatch and receiver give an elapsed transit time. Parcel departure measures one body radius of travel after the switch opened the door.
- Plot recorded paths for one or both loads. A portal starts a fresh segment. All timestamps and paths come from the actual run, including unsuccessful runs.

## How to get to it (user POV)

Open PUZZLES, Level map, Jump to a tool course and Play grand relays. Test the empty machine or fit a single spare. Expand Dispatch log, choose a lane and select a contact. Plot recorded paths to see that load’s route up to the selected frame.

## Driving it with verify-chaos-engine

Run `./scripts/verify-chaos-engine drive grand-relays`. Trace a closed door, fit both sides of the opening relay, switch lanes and inspect a frame on a phone. Run all twenty deliveries, verify each saved record and inspect the twelve-tool finale on desktop. Reopen a shared setup and replay a downloaded machine offline. Save the final assembly in the editable sandbox, reload it and follow all twelve tools through the three arrivals. Drop a native block and observe its collision with the sandbox wall. Drive the numbered campaign, guided lessons, save/load and ui-layout as well.

## Gotchas

The hatch records a machinery action at the same frame as the gold signal. Blue’s departure can occur later. Two stations of the same kind can have separate contacts. Late chapters also check the frame of arrival at the receiver.
