# 007 — Model Required Selection & Wheelless Movement

## What changed

Two new constraints have been added to the customise screen and car physics:

1. **Model is always required** — the Model section always has a selection; clicking the currently-selected model button no longer deselects it.
2. **No wheels → no movement** — when the player deselects wheels in the customise screen, the car cannot accelerate or turn until wheels are re-equipped.

## Behaviour

### Model section
- The model starts as `'standard'` (pre-selected) when the customise screen is opened.
- Clicking the selected model button keeps it selected (gold border is retained). The selection never becomes `null`.
- Other sections (Wheels, Flipper, Flamethrower) still support toggle deselection as before.

### Wheelless car
- Calling `car.applyCustomisation({ wheels: null })` hides the wheel meshes **and** disables `accelerate()`, `turnLeft()`, and `turnRight()`.
- Any velocity already present continues to decay naturally via friction; only new velocity input is blocked.
- Re-equipping wheels (`car.applyCustomisation({ wheels: 'standard' })`) restores all movement.
- `car.reset()` also restores the `hasWheels` state to `true`.

## Implementation

### `src/customise-screen.js`
- `createSection()` now accepts an optional `allowDeselect` parameter (default `true`).
- The Model section is created with `allowDeselect = false`; clicking the selected button keeps it highlighted and leaves the selection unchanged.
- Initial selections: `model: 'standard'`, all others `null`.

### `src/car.js`
- Added `let hasWheels = true` internal state variable.
- `applyCustomisation()` updates `hasWheels` when the `wheels` key is present.
- `accelerate()`, `turnLeft()`, and `turnRight()` return early when `hasWheels` is `false`.
- `reset()` restores `hasWheels = true`.

## Files changed

- `src/customise-screen.js`
- `src/car.js`
- `tests/customise-screen.test.js` — updated tests to reflect new model-required default state; added test for non-deselectable model button.
- `tests/car.test.js` — added tests for blocked movement without wheels and restored movement when re-equipped.
