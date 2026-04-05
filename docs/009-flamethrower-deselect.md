# 009 — Flamethrower De-select in Sandbox Mode

## Overview

Deselecting the flamethrower in the customise screen now fully removes it from gameplay: the barrel mesh is hidden and `activateFlamethrower` becomes a no-op when the flamethrower is absent.

## Modified modules

### `src/car.js`

- **`hasFlamethrower` state variable** — a boolean (initially `true`) that tracks whether the flamethrower is equipped, mirroring the existing `hasFlipper` pattern.
- **`applyCustomisation`** — sets `hasFlamethrower = selections.flamethrower !== null` (and `flamethrower.visible`) when the `flamethrower` key is present in the selections object. Immediately hides the flame mesh and all particles and clears `flamethrowerActive` when deselected.
- **`activateFlamethrower`** — returns early when `hasFlamethrower` is `false`, so holding the flamethrower key has no effect.

### `tests/car.test.js`

Five new tests added to the `Car applyCustomisation()` describe block:

- Barrel hidden when selection is `null`.
- Barrel shown when selection is `'standard'`.
- `activateFlamethrower` is a no-op when deselected.
- `activateFlamethrower` works again after re-selection.
- Flame and particles are hidden immediately when deselected while active.

## Design decisions

- `hasFlamethrower` is not reset in `reset()`, matching the behaviour of `hasFlipper`: customisations persist across game resets within a session.
- Deselecting while the flamethrower is firing immediately clears `flamethrowerActive` and hides the flame and particles, avoiding a visual artefact where the fire continues after removal.
