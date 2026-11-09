# Trim

Trim stops a part’s spin in one tap while preserving its linear travel, orientation, shape and material. It does not keep the part level or prevent later collisions from spinning it again.

## Sub-features

- spin-stop: remove angular motion once without braking linear travel.
- guidance: empty, ineligible and non-spinning parts give concise status feedback.
- cleanup: changing tools and Clear remove transient feedback; no attachment remains.

## How to get to it (user POV)

- Scroll to the end of the bottom object toolbar and select Trim after Deflect.
- Place a Ball, use Launch to give it travel and spin, then tap it with Trim.

## Driving it with verify-chaos-engine

Preconditions: isolated launch and doctor pass; fresh browser storage.

- Run: `./scripts/verify-chaos-engine drive trim` exercises real touch at 390×664 and mouse input at 1280×800, with `mobile-` and `desktop-` evidence steps.
- Build: select `[data-tool="ball"]`, tap `#game`, then use `[data-tool="launch"]` and two canvas taps to set travel and spin while paused. Observe the existing tool’s result.
- Select: select Draw then `[data-tool="trim"]`; Trim is immediately after Deflect, visible and active.
- Trim: tap the part; its spin becomes zero, linear velocity and angle stay unchanged, and `#trim-feedback` reports SPIN STOPPED. Capture the action and resulting state.
- Motion: resume physics briefly and pause; the part visibly moves across the canvas.
- Cleanup: use `#btn-clear` and wait for the vortex; no parts or Trim feedback remain. Capture screenshots, read-only body observations and storage. Any console error or runtime exception fails the journey.

## Gotchas

- Static scenery, targets, sensors and phased parts are ineligible.
- A non-spinning part needs no change; it shows NO SPIN TO STOP.
- Gravity, collisions, motors and other attachments can change motion after the tap.
- Do not seed bodies, velocities or storage with internal setters for browser proof.
