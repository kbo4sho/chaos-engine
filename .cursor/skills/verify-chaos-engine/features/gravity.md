# Gravity

Gravity lets a player switch the whole playfield between Earth, Moon, Mars, Jupiter, and Space presets from the top bar.

## Sub-features

- `gravity-earth` is the default (`#planet-name` reads `EARTH`, Earth button `active`).
- `gravity-preset` applies Moon, Mars, Jupiter, or Space from `#gravity-panel`.
- `gravity-label` updates `#planet-name` to the chosen world.

## How to get to it (user POV)

- Press a planet button in the top bar next to `GRAV:`.
- A hosted lesson may set gravity through `ChaosEngine.loadLesson({ simulation: { gravity: 'earth' } })`.

## Driving it with verify-chaos-engine

Preconditions:

- Doctor reports the verification URL.
- `#gravity-panel` is visible (`hideControls` is not set on the active lesson).

- **Moon.** Click `.planet-btn[data-name="Moon"]`. `#planet-name` reads `MOON` and that button is `active`.
- **Earth.** Click `.planet-btn[data-name="Earth"]`. `#planet-name` returns to `EARTH`.
- **Proof.** Screenshot the top bar with the planet name visible. If objects are present, a second frame should show the new fall rate — do not treat the label alone as motion proof when bodies exist.

There is no dedicated `drive gravity` helper yet. Use the same Chrome recipe and these handles.

## Gotchas

- Space is zero gravity (`data-gravity="0"`). Objects do not fall; that is success, not a stuck sim.
- Lesson load overwrites the current preset. Prove gravity either before a lesson or from the lesson's own `simulation.gravity`.
- The visible name is `#planet-name`, not the emoji alone.
