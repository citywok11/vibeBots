# 006 — Customise Screen / Car Parity

## Overview

When a player opens the customise screen, adjusts their loadout, and clicks **Back** to return to the game, the car in the arena now reflects those selections immediately.

- **Selected item** → the corresponding car component is made visible.
- **Deselected item** (selection is `null`) → the corresponding car component is hidden.

## Affected components

| Customise section | Car component | Behaviour |
|---|---|---|
| Model | `car.mesh` (body) | Hidden when deselected, shown when selected |
| Wheels | All four `car.wheels` meshes | Hidden when deselected, shown when selected |
| Flipper | `car.flipper` mesh | Hidden when deselected, shown when selected |

The **flamethrower** is not part of the customise catalogue and is unaffected.

## Implementation

### `car.applyCustomisation(selections)`

A new method added to `createCar()`. It accepts a `selections` object (as returned by `customiseScreen.getSelections()`) and sets `visible` on the appropriate meshes:

```js
car.applyCustomisation({ model: 'standard', wheels: null, flipper: 'standard' });
// → body visible, wheels hidden, flipper visible
```

Only keys present in the object are processed; missing keys leave the current state unchanged.

### `main.js` wiring

The `customiseScreen.onClose()` handler now calls `car.applyCustomisation()` before closing the screen:

```js
customiseScreen.onClose(() => {
  car.applyCustomisation(customiseScreen.getSelections());
  customiseScreen.close();
  menu.open();
});
```

## Testing

Tests added to `tests/car.test.js` under the `Car applyCustomisation()` describe block, covering:

- Method exists on the car object
- Hiding/showing each component individually (model, wheels, flipper)
- Applying all three selections at once
- Mixed selection states
- Unknown keys are silently ignored
- Flamethrower is unaffected
