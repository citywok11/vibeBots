# 013 — Pit Cover Riding Animation

## What was added

When a vehicle (player car or robot) is positioned over the pit while its cover is lowering, the vehicle now **rides the cover down** rather than waiting until the pit is fully open to start falling.

## Behaviour

| Pit state | Vehicle over pit | Result |
|-----------|-----------------|--------|
| Not activated | — | No change, vehicle drives normally |
| Lowering | Vehicle enters or is already on pit | Vehicle Y tracks the cover: `groundY + coverY` |
| Lowering | Vehicle drives off the pit edge | Vehicle Y snaps back to floor level (`groundY`) |
| Fully open | Vehicle enters or was riding the cover | Vehicle enters free-fall as before |

## Technical changes

### `src/pit.js`
- Added `getCoverY()` — returns the current Y position of the cover (starts at `0`, decreases to `-PIT_DEPTH` as the cover lowers).

### `src/car.js`
- Added `get groundY()` — exposes the car's resting height above the world floor (`wheelRadius + bodyHeight / 2`). Used to correctly offset the vehicle when it rides the lowering cover.

### `src/main.js`
- Added `carRidingCover` / `robotRidingCover` boolean state variables (reset in `startLoop()`).
- In the game loop, after each vehicle's `update()` and `bounceOffWalls()` calls:
  - If the vehicle is over the pit **and** the pit is lowering → set `group.position.y = groundY + pit.getCoverY()` and mark it as riding the cover.
  - If the vehicle was riding the cover but has since moved off the pit edge → restore `group.position.y = groundY` and clear the riding flag.
  - If the vehicle is over the pit **and** the pit is fully open → begin free-fall as before.
- After a free-fall reset the car is now restored to `car.groundY` (its correct resting height) instead of `0`.

## Tests added

- `tests/pit.test.js` — three new tests covering `getCoverY()` initial value, negative value during lowering, and parity with `cover.position.y`.
- `tests/car.test.js` — two new tests covering `groundY` value for the default wheel radius and a custom wheel radius.
