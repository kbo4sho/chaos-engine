# Offline friend races

Play and return a work-order race between disconnected devices.

## Sub-features

Package an earned work order into a single HTML file. The guest gets the blind invitation, local physics and the ability to package their reply. A returned file includes both deliveries and the replay GIF exporter.

## How to get to it (user POV)

Complete a work order. Open Play and share offline, choose Prepare challenge file, then save it. Open the file, make a delivery and prepare the reply file. Open that file to compare the race.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass with fresh profiles. Run `./scripts/verify-chaos-engine drive offline-races`.

Download an invitation from an earned run. Open it in a disconnected phone-sized profile, inspect the empty sockets, fit a different delivery and download the reply from that profile. Open the reply in another disconnected profile, compare each receipt and produce a GIF.

## Gotchas

Open the downloaded HTML in a browser that supports modules and import maps. Document previewers may show static HTML. Files include the game and the shared fittings. The recipient’s other record book entries stay on their device.
