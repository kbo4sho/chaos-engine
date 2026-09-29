---
version: alpha
name: "Chaos Engine"
description: "A dense, playful CRT control panel wrapped around a full-screen physics sandbox."
colors:
  background: "#0a0a0a"
  canvas: "#080c10"
  surface: "#0d1117"
  surface-raised: "#111820"
  primary: "#00ff41"
  cyan: "#0abdc6"
  warning: "#ffc857"
  danger: "#ff3333"
  magenta: "#cc00ff"
  bright-text: "#dffcff"
typography:
  display:
    fontFamily: "VT323, ui-monospace, monospace"
  body:
    fontFamily: "VT323, ui-monospace, monospace"
  utility:
    fontFamily: "VT323, ui-monospace, monospace"
rounded:
  DEFAULT: "0.1875rem"
  control: "0.1875rem"
  canvas: "0.5rem"
spacing:
  micro: "0.25rem"
  control-gap: "0.5rem"
  panel-pad: "0.75rem"
components:
  toolbar-button:
    height: "3.625rem"
    width: "4rem"
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
  mobile-toolbar-button:
    width: "3.25rem"
    height: "3.125rem"
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
  canvas-status:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.bright-text}"
    rounded: "{rounded.control}"
---

# Chaos Engine Design System

## Overview

### Creative North Star

The interface should feel like a battered arcade test bench: phosphor labels, compact hardware-like controls, bright diagnostic feedback, and a dark glass playfield where the physics remain the star.

### Product context and register

- **Audience and primary job:** Curious players build and disrupt small physics contraptions through direct mouse or touch interaction.
- **Target market and evidence:** General English-language web audience; the repository has no regional or regulated-market requirements.
- **Locale and language policy:** English UI with emoji plus plain-text labels; no localization framework is present.
- **Usage scene:** Short desktop or phone play sessions with a full-screen canvas and horizontally scrolling bottom controls.
- **Register:** Product/tool. Fast recognition and reliable manipulation lead; brand expression sits in the CRT treatment.
- **Memorable signature:** Every object and action reads like a glowing instrument on a retro physics console.
- **Restraint:** The canvas and controls stay geometrically simple so many simultaneous physics objects remain readable.
- **Anti-references:** Do not drift toward soft card-based SaaS, glassmorphism, pastel toy UI, or ornamental gradients unrelated to simulation state.
- **Token ownership/runtime mapping:** Existing values in [`index.html`](./index.html) are the canonical runtime source. This file mirrors accepted values and intent; feature work must reuse the established toolbar, feedback, and canvas rendering patterns rather than inventing a parallel theme layer.

## Colors

`background`, `canvas`, `surface`, and `surface-raised` form the dark CRT chassis. `primary` is the phosphor-green default active/tool color, while `cyan` carries framing and secondary controls. Tool-specific accents may use warning, danger, or magenta when they communicate the tool's identity; selected state must also use border, glow, or text so color is not the only signal. `bright-text` is reserved for high-contrast labels and highlights.

## Typography

VT323 is the single intentional display, body, and utility face because the entire product is an arcade instrument panel. Keep labels short, concrete, and scannable. Uppercase is appropriate for transient machine feedback and chaos actions; object-tool names stay compact title case.

## Layout

The app is one full-screen column: compact status header, flexible canvas, horizontally scrolling object toolbar, then the chaos bar. The canvas owns remaining height. Toolbar buttons never wrap; on narrow screens they remain at least 52×50 CSS pixels and the row scrolls horizontally. New object tools append at the toolbar's end to preserve learned order.

## Elevation & Depth

Depth comes from dark tonal layers, 1–2px neon borders, and restrained glow tied to active state or physics feedback. Avoid generic drop shadows and stacked cards. The canvas uses inset shading to suggest curved CRT glass without obscuring objects.

## Shapes

Controls use tight 2–3px corners, like labeled hardware keys. The canvas alone receives the larger 8px radius. Physics-object shapes come from their physical purpose; decorative rounding must not hide collision geometry.

## Components

### Foundational visual states

Toolbar buttons have distinct default, hover, active, and focusable native-button behavior. Active tools combine border, surface, and glow changes. Canvas actions provide a brief visible status message plus appropriate object rendering; sound and haptics supplement rather than replace visuals.

### Buttons and actions

Object tools use the shared `.tool-btn` geometry, icon-over-label structure, and horizontal-scroll behavior. Chaos actions use the smaller `.chaos-btn` family. Every new tool needs a plain-language accessible name and a title explaining its canvas interaction.

### Navigation and data display

There is no route navigation. The top bar reports gravity and live object count; keep it stable while the canvas changes.

### Forms and overlays

There are no forms or modal overlays. Tool feedback uses the existing `role="status"` canvas overlay pattern and must not intercept pointer input.

### Iconography

Use one legible emoji or simple Unicode glyph above a text label. The label is mandatory because glyph meaning is not universal.

### Motion

Motion should reveal a physical state change: placement, impact, opening, transport, or transformation. Feedback transitions are short (roughly 120–300ms), interruptible, and secondary to the Matter.js behavior. Avoid ambient motion that competes with the simulation.

### Content and data visualization

Write terse machine-like feedback with a concrete result or next action: `HATCH READY • TAP TO DROP`, not promotional copy. Use counts, arrows, and status words only when they explain current physics state.

## Do's and Don'ts

- **Do:** Extend the existing tool-button, status, particle, audio, haptic, cleanup, and custom-rendering conventions end to end.
- **Do:** Keep direct manipulation touch-friendly and provide a tap alternative for any drag gesture.
- **Don't:** Add a new panel, dependency, theme abstraction, or layout region for one tool.
- **Don't:** Ship an effect-only control as an object tool; it must create, connect, transform, manipulate, or remove something on the canvas.
