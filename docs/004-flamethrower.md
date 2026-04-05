# Flamethrower Weapon

Added a flamethrower weapon to the player car in sandbox mode.

## What was added

- **Flamethrower barrel**: A cylinder mesh positioned at the center top of the car body (`x=0, z=0, y=height/2`), pointing forward along the car's −Z axis. This is the permanent visual representing the weapon mount.
- **Flame mesh**: An orange/red emissive cone that shoots forward from the barrel tip. It is hidden when inactive and visible while the flamethrower is firing.
- **Default key binding**: `E` activates the flamethrower (added to `DEFAULT_BINDINGS` in `input.js`).
- **Timed firing**: Each activation fires the flamethrower for 0.5 seconds (`FLAME_DURATION`), after which the flame automatically disappears.

## Key design decisions

1. **Centered placement**: The barrel sits at the middle of the car body (z=0 in local space) on top of the body (y=0.5). This satisfies "add the flamethrower to the middle of the car".

2. **No collision footprint change**: Because the barrel is on top of the car and does not extend beyond the car's existing X/Z footprint, `bounceOffWalls()` is unchanged.

3. **Follows flipper pattern**: `activateFlamethrower()` is a one-shot call (triggered by `wasJustPressed('flamethrower')` in `main.js`). The duration timer in `update(dt)` handles deactivation automatically, mirroring how the flipper works.

4. **Rebindable**: Since `flamethrower` is a named action in `DEFAULT_BINDINGS`, it automatically appears in the key bindings screen and can be rebound by the player.

## Files changed

- `src/car.js` — flamethrower/flame meshes, `activateFlamethrower()`, timer logic, `reset()` update
- `src/input.js` — `flamethrower: ['KeyE']` added to `DEFAULT_BINDINGS`
- `src/main.js` — `activateFlamethrower()` wired in the game loop
- `tests/car.test.js` — new `describe('Car flamethrower', ...)` test suite
