# Logical world and uniform camera

All new sandboxes and examples share a 1280 × 531 authored world. A centered, uniform camera letterboxes the scene across phone, tablet and desktop, preserving geometry and motion when resizing or loading saves.

## Sub-features

- `authored-world`: The approved 1280 × 800 desktop reference previously used a 1280 × 531 Matter backing store despite a 1280 × 530.8125 (clientHeight rounds to 531) CSS canvas (50 topbar, 74 toolbar, 145.1875 chaos bar). Explicit display mapping removes that mismatch without changing authored geometry.
- `camera-input`: Canvas taps, drags and aim use the inverse uniform camera.
- `world-save`: Version-1 saves add world bounds to their checksummed graph; cross-device loading changes only the camera.
- `legacy`: Saves without bounds preserve coordinates and infer a geometry-only in-memory envelope (bodies/vertices/constraint world points/portals/orbits/bumpers/magnets — never velocities or local vectors). Storage changes only on explicit SAVE. Partial worldBounds objects are rejected.
- `pause`: Physics forces, portals and chaos mutations stop while paused.

## How to get to it (user POV)

- Open the sandbox on a phone, tablet or desktop and place objects with the toolbar.
- Select Halo Garden, Kinetic Cascade or Wreck Deck from `#save-slot` and click LOAD.
- SAVE a user slot, change orientation or viewport, reload and confirm LOAD.

## Driving it with verify-chaos-engine

Preconditions: Launch and doctor must pass for this checkout's owned verification server.

- **Action + result:** `./scripts/verify-chaos-engine drive logical-world` captures Halo at 390×844, 820×1180 and 1280×800, checks portal separation 300 on the first star orbit, paused resize continuity and a user-created world's SAVE/reload/LOAD roundtrip.
- **Layout:** `./scripts/verify-chaos-engine drive ui-layout` checks the independent DOM controls at 390×664 and 1280×800.
- **Persistence:** `./scripts/verify-chaos-engine drive save-load` proves storage and lesson callbacks with actual controls.
- **Examples:** Drive `example-scenes` and `example-scenes-mobile` for all built-in scenes and touch loading.

## Gotchas

- Letterbox margins are display space; the scene retains one uniform scale.
- Never seed storage or call internal restore/serialize helpers as live user-path proof.
- Halo portals sit on the first star's radius-150 orbit; logical-world journey proves real teleport across phone/iPad/desktop.
- Letterbox taps outside the authored world reject creation/placement; sling aiming may still leave the world.
- Present worldBounds must be complete (finite x,y,width,height with positive size) or LOAD rejects; absent bounds still infer geometry-only envelopes without writing storage.
- Evidence must include unfiltered console/page errors, action screenshots, resulting graph and storage.
