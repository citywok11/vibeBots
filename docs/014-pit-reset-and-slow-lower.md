# 014 — Pit Reset and Slow Lowering

## What changed

### Pit resets on game restart

When the player returns to the main menu and starts a new game, the pit is now reset to its initial closed state. Previously the pit would remain open (or mid-lowering) from the previous session.

`startLoop()` in `main.js` now calls `pit.reset()` alongside the existing `car.reset()`, `robot.reset()`, and `pitButton.reset()` calls.

### `reset()` method added to pit

`createPit()` now returns a `reset()` function that:
- Sets the cover back to `y = 0` (flush with the floor)
- Clears `isLowering` and `isOpen` flags
- Allows the pit to be activated again after reset

### Slower, more visible lowering animation

The pit now lowers visibly over **10 seconds** instead of instantly:

| Constant | Before | After |
|---|---|---|
| `PIT_DEPTH` | 6 units | 2 units |
| `LOWER_SPEED` | 3 units/s | 0.2 units/s |

The cover descends 0.2 m every second, completing its descent after 10 seconds. This makes the animation clearly visible to players — previously the 2-second drop was easy to miss.
