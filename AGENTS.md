# Chaos Engine agent instructions

This is a public Matter.js physics sandbox. Use generic sample data only (`sample-lesson`, `sample-ball`). Never put children's names or family information in code, commits, screenshots, saves, or PR text.

## Required before any behavior or UI change ships

Vitest is not enough. Every behavior or UI change must be proven on the live page with `.cursor/skills/verify-chaos-engine`.

1. Read `.cursor/skills/verify-chaos-engine/SKILL.md` and `features/README.md`.
2. `./scripts/verify-chaos-engine launch`
3. `./scripts/verify-chaos-engine doctor`
4. `./scripts/verify-chaos-engine drive <feature>` for every affected mapped journey (save/load is the default persistence proof).
5. Capture evidence under `artifacts/verify-chaos-engine/<run-id>/` (action + resulting state + side effects such as `localStorage`).
6. `./scripts/verify-chaos-engine cleanup` — keep the evidence.
7. `npm test` and `npm run build` must pass.

Do not weaken a journey to make it pass. Do not call internal setters (`serializeGameState`, `restoreGameState`, seeded `localStorage`) and call that a user-path proof.

## Feature map and skill maintenance

- New user-facing features get a `features/*.md` entry (and the copy under `.cursor/skills/verify-chaos-engine/features/`) with the four required H2s.
- When the UI, selectors, or journeys change, update the skill with `/maintain-verification-skill`.

## Pull requests

PR descriptions must include a **Verification** section that lists:

- the journeys driven
- `npm test` / `npm run build` results
- evidence paths

Do not merge your own PR unless the user explicitly asks.

## Daily upgrades

Make It Better / nightly fun upgrades follow the same verification bar. They still do feature work only and must not redesign the shell. See `.make-it-better.yml`.
