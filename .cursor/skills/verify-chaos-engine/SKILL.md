---
name: verify-chaos-engine
description: Verify Chaos Engine, the Matter.js 2D physics sandbox web UI served by node server.js, by launching an isolated local instance and driving real browser clicks. Use when proving save/load, object spawn, chaos actions, gravity, or sandbox controls — not as a substitute for Vitest.
---

# Verify Chaos Engine

Chaos Engine is a single-page Matter.js sandbox (`index.html` + `save-codec.js`) served by `node server.js`. Players tap the canvas, pick tools from `#toolbar`, fire chaos actions from `#chaos-bar`, change gravity from `#gravity-panel`, and persist scenes with SAVE / LOAD into `localStorage` keys `chaos-engine-save-1..3`.

This skill is for the next agent. Drive the live page the way a player does. Vitest in `__tests__/` is not proof that the UI works.

Read `features/README.md` (repo root) or [features/README.md](features/README.md) before a run. The save/load journey is the default proof.

## Launch

Default verification port is **13003**. Production / casual play uses 3003. Do not attach to a server you did not start. Port 3003 is often already occupied by a leftover `node server.js`; leave it alone.

From the repo root:

```bash
./scripts/verify-chaos-engine launch
```

That command:

1. Refuses if `artifacts/verify-chaos-engine/.run/state.json` already names a live PID.
2. Starts `CHAOS_PORT=13003 node server.js` from this checkout (or a `main` snapshot — see below).
3. Writes PID, port, URL, serve root, git revision, and log path to `artifacts/verify-chaos-engine/.run/state.json`.
4. Waits until the log contains `CHAOS ENGINE server running at` **and** `GET /` returns HTML that includes `CHAOS ENGINE` plus a `#game` canvas, **and** `GET /save-codec.js` is 200.

Ready means the page is usable, not only that a TCP port answers.

To compare the broken baseline, launch main's static files on **13004** without touching the branch server:

```bash
./scripts/verify-chaos-engine launch --origin main
```

`--origin main` copies `git show main:index.html` and `git show main:save-codec.js` into `artifacts/verify-chaos-engine/.run/main-snapshot/` and serves them with this branch's `server.js` so `CHAOS_PORT` isolation still works. That port helper is verification scaffolding, not the save fix.

Teardown is `./scripts/verify-chaos-engine cleanup`. It kills only the PID recorded in state, removes the snapshot and Chrome profile, and **keeps** `artifacts/verify-chaos-engine/<run-id>/`.

Manual equivalent if the helper is unavailable:

```bash
mkdir -p artifacts/verify-chaos-engine
CHAOS_PORT=13003 node server.js > artifacts/verify-chaos-engine/server.log 2>&1 &
# ready when the log shows: 🔥 CHAOS ENGINE server running at http://0.0.0.0:13003
# and curl -sf http://127.0.0.1:13003/ | grep -q 'id="game"'
```

## Doctor

Read-only. Run this first whenever anything looks off.

```bash
./scripts/verify-chaos-engine doctor
```

Doctor must answer yes to all of:

- A state file exists and its PID is still alive.
- That PID's command line is `node server.js` (or `node /abs/path/server.js`).
- The recorded port is listening and owned by that PID (`/proc/<pid>/net/tcp` or `ss -ltnp`).
- `GET $URL/` is 200, contains `CHAOS ENGINE`, `id="game"`, `id="btn-save"`, and `<script src="save-codec.js">`.
- `GET $URL/save-codec.js` is 200 and its SHA-256 matches the file on disk at the recorded serve root.
- Recorded `revision` matches `git rev-parse HEAD` for `--origin branch`. For `--origin main`, served `index.html` / `save-codec.js` match `git show main:…`.

If any check fails, stop. Do not drive a foreign or stale instance.

## Drive

Harness: **puppeteer-core** + system Chrome (`/usr/bin/google-chrome`). Recipe lives in `scripts/lib/chaos-verify-drive.mjs`. Isolated Chrome profile: `/tmp/chaos-verify-chrome-<run-id>` (created by launch/drive, removed by cleanup).

```bash
./scripts/verify-chaos-engine drive save-load
```

Drive a mapped feature only after doctor passes. Use the real selectors from this repo:

| Control | Selector / handle |
| --- | --- |
| Playfield | `#game` |
| Object count | `#obj-count` |
| Planet label | `#planet-name` |
| Gravity | `#gravity-panel .planet-btn[data-name="Moon"]` (also Mars, Jupiter, Space, Earth) |
| Tool | `[data-tool="ball"]` (also `block`, `ramp`, `eraser`, …) |
| Chaos action | `#btn-explode`, `#btn-rain`, `#btn-pause`, `#btn-clear`, … |
| Slot | `#save-slot` (`aria-label="Save slot"`) — user values `1`–`3`, examples `example:kinetic-cascade`, `example:halo-garden`, `example:wreck-deck` |
| Slot hint | `#save-slot-hint` |
| Save / Load | `#btn-save`, `#btn-load` |
| Confirm dialog | `#save-confirm`, `#save-accept`, `#save-cancel` |
| Feedback | `#save-feedback` (`role="status"`) |
| Lesson start | `window.ChaosEngine.loadLesson(config)` — there is **no** toolbar button |

Spawn is a tap, not a drag: `mousedown` and `mouseup` on the same canvas point. A drag is a slingshot.

Lessons are a host API (`window.ChaosEngine`, version `1.1.0-lesson-api`). `loadLesson` calls the same clear path as CLEAR, then writes `lessonState.config = config`. If `config` contains functions (`setup`, `onTick`), SAVE must still write `chaos-engine-save-<slot>` and must **not** show `FREE BROWSER STORAGE`. After reload + LOAD, the restored scene is the **lesson** scene, not balls placed before `loadLesson`.

Do not call `serializeGameState`, `restoreGameState`, or `localStorage.setItem` to make the journey pass. Reading `localStorage` and `ChaosEngine.getState()` after the player actions is observation, not a setter.

## Evidence

Proof directory (survives cleanup):

```
artifacts/verify-chaos-engine/<run-id>/
  01-start.png
  02-scene-built.png
  03-lesson-started.png
  04-after-save.png
  05-after-reload.png
  06-load-confirm.png
  07-after-load.png
  console.log
  localStorage.json
  page-state.json
  result.json
```

Key screenshots are also copied to `/opt/cursor/artifacts/` for PR / handover review.

Proof standards:

- Exercise the real user path: tool click, canvas tap, SAVE, full page reload, LOAD, `#save-accept`.
- Capture the action and the resulting state, not only the last frame.
- Check the side effect: `localStorage['chaos-engine-save-1']` is a version-1 payload with `graph` + `checksum` after SAVE, and still present after reload.
- `#save-feedback` after SAVE must contain `SAVED TO SLOT` and must not contain `FREE BROWSER STORAGE` or `ALLOW SITE DATA` on the fixed branch.
- After LOAD, `#save-feedback` contains `LOADED SLOT`, `#obj-count` is non-zero, and `ChaosEngine.getState().lessonId` is the lesson you started (or the lesson objects are visible if the host API is missing on main).
- Mocks are not used. This app has no network save backend.

A run that skips the lesson because it is “hard to reach” is incomplete. The lesson host API is reachable from any loaded page.

## Cleanup

```bash
./scripts/verify-chaos-engine cleanup
```

Kills only the PID in `artifacts/verify-chaos-engine/.run/state.json`. Removes `.run/state.json`, `.run/main-snapshot/`, and `/tmp/chaos-verify-chrome-<run-id>`. Does **not** delete `artifacts/verify-chaos-engine/<run-id>/`. After cleanup, confirm those evidence files still exist.

Never `pkill -f server.js` or free port 3003.

## Helpers

All helpers are executable. Invoke them from the repo root.

| Command | What it does |
| --- | --- |
| `./scripts/verify-chaos-engine launch` | Isolated branch server on 13003 |
| `./scripts/verify-chaos-engine launch --origin main` | Isolated main snapshot on 13004 |
| `./scripts/verify-chaos-engine doctor` | Read-only health + build identity |
| `./scripts/verify-chaos-engine drive save-load` | Browser journey for [features/save-load.md](../../features/save-load.md) |
| `./scripts/verify-chaos-engine drive example-scenes` | Browser journey for [features/example-scenes.md](../../features/example-scenes.md) |
| `./scripts/verify-chaos-engine cleanup` | Tear down this run; keep evidence |

Drive needs `puppeteer-core` (devDependency) and `/usr/bin/google-chrome`. If the module is missing: `npm install`.

Shared paths and port rules live in `scripts/lib/chaos-verify-common.sh`. The browser recipe is `scripts/lib/chaos-verify-drive.mjs`.

## Feature map

- [features/README.md](../../features/README.md) — index, baseline, conventions
- [save-load](../../features/save-load.md) — default proof
- [example-scenes](../../features/example-scenes.md)
- [spawn-objects](../../features/spawn-objects.md)
- [chaos-actions](../../features/chaos-actions.md)
- [gravity](../../features/gravity.md)
- [sandbox-controls](../../features/sandbox-controls.md)

Keep the map honest with `/maintain-verification-skill` as the app changes.
