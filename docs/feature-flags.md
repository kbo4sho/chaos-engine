# Feature flags

Extra desks, courses and share formats stay in the tree. They load only when a tester turns their switch on. The repair bench, campaign, sandbox, free build and save/load stay on.

## How to turn a flag on

- URL query, comma-separated: `?flags=match-cards,offline-workshop`
- Prefix a name with `-` to force it off: `?flags=-course-tool,match-cards`
- Browser storage (same list): `localStorage['chaos-engine-flags'] = 'match-cards'`

The query overrides storage, which overrides the defaults below. Unknown names are ignored. Flags apply on the sandbox (`/`) and on `/one-part-missing/`.

## Flags

| Flag | Default | What it gates |
| --- | --- | --- |
| `offline-workshop` | off | Keep the workshop offline panel, and service-worker registration. Off also unregisters any leftover `puzzle-offline-worker.js` at this origin. |
| `double-exposures` | off | Double-exposure desk, its home link, and `/one-part-missing/discovery/double.html`. |
| `shutter-sheets` | off | Make a shutter puzzle on the double-exposure desk. |
| `offline-races` | off | Play and share offline race replies. |
| `match-cards` | off | Three-round match cards map and scorecard. |
| `control-room` | off | Operate a machine link and `/one-part-missing/control-room/`. |
| `test-bay` | off | Commission a production line link and `/one-part-missing/test-bay/`. |
| `fault-desk` | off | Diagnose a faulty machine link and `/one-part-missing/fault-desk/`. |
| `repair-transfer` | off | Move repairs to another device. |
| `press-registration` | off | Original track press (classic registration) in the machine press. |
| `course-tool` | **on** | Play the tool course. Kept for a new player: first numbered course, the powered tools used on the bench. |
| `course-clock` | **on** | Play the clockwork course. Kept for a new player: moving machinery and the run-and-film loop. |
| `course-rig` | off | Play the cable rigs. |
| `course-pair` | off | Play two-part repairs. |
| `course-drive` | off | Play the drive table. |
| `course-qualification` | off | Play cross training. |
| `course-grand` | off | Play grand relays. |
| `course-field` | off | Play field stations. |
| `course-assembly` | off | Play three-part repairs. |
| `course-flight` | off | Play flight school. |
| `course-sort` | off | Play the sorting room. |
| `course-discovery` | off | Change one thing (discovery) jump link. |

A direct visit to a gated desk with its flag off shows **Not available yet** and a link back to the repair bench. The code is not deleted; the same URL works once the flag is on.
