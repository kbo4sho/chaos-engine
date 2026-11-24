# Feature flags

Hidden desks and courses stay behind named switches so the One Part Missing repair bench is the default spine. Testers turn a switch on from the URL or localStorage without a rebuild.

## Sub-features

- `defaults` hide extra desks, match cards, transfer, offline play and thirteen of fifteen course jumps. The tool course and clockwork course stay on.
- `url-overrides` read `?flags=name,-name` and ignore unknown names.
- `storage-overrides` read `localStorage['chaos-engine-flags']`. The URL wins.
- `kill-switch` unregisters a leftover `puzzle-offline-worker.js` when offline workshop is off.
- `unavailable-pages` replace control room, test bay, fault desk and double exposures with a short note back to the bench when their flag is off.

## How to get to it (user POV)

Open the sandbox or One Part Missing with no query. Extra links are absent. Append `?flags=match-cards` (or another name from [docs/feature-flags.md](../docs/feature-flags.md)) to bring that entry back. Direct URLs to a gated desk show **Not available yet** until that flag is on.

## Driving it with verify-chaos-engine

Preconditions: launch and doctor pass on the branch server.

- Drive `save-load` and `ui-layout` with no flags set. Free build and persistence match the live sandbox.
- Drive `one-part-missing` with no flags set. The repair bench, campaign map, tool course and clockwork course remain. Capture sandbox and One Part Missing homes at 390×664 and 1280×800.
- Optional: reload with `?flags=match-cards,control-room` and confirm those entries return.

## Gotchas

- Flags are per origin. The local server and a public copy do not share storage.
- Hiding a link does not delete the module. Hash routes and downloaded files still contain the original code.
- Original track press stays in the machine press `<select>` so existing journeys can set `classic`; the option is hidden until `press-registration` is on.
