# 020 — Arena Flipper Hazard

## Overview

Adds a motor-driven arena flipper hazard that rotates from a resting position to a firing angle, launching any robot positioned over the paddle through contact-based physics rather than a purely visual animation.

## New modules

### `src/arena-flipper.js`

Exports `createArenaFlipper(x, z, facingAngle, tuning)` and `createArenaFlippers(arenaSize)`.

**`createArenaFlipper`** creates a single flipper hazard at a given world position and facing angle.

- **Three.js group** containing a static base plate and a hinged paddle mesh.
- **State machine** with four states: `idle → firing → resetting → cooldown`.
  - `idle` — paddle at rest angle, ready to fire.
  - `firing` — paddle swinging upward at `swingSpeed`; launch impulse applied to robots on the paddle during this window.
  - `resetting` — paddle returning to rest angle at `resetSpeed`.
  - `cooldown` — waiting `cooldown` seconds before returning to idle.
- **`fire()`** — triggers the flipper from idle state.
- **`update(dt)`** — advances the state machine by dt seconds and updates paddle rotation.
- **`checkContact(robot)`** — tests whether a robot's centre is over the paddle in world space, respecting the flipper's facing angle. Returns `{ onPaddle, localX, localZ }`.
- **`applyLaunch(robot)`** — during the firing window, applies a one-shot impulse to a grounded robot on the paddle:
  - Vertical impulse scaled by swing progress.
  - Forward impulse in the flipper's facing direction.
  - Lateral assist based on how far off-centre the robot is.
  - Each robot is only launched once per swing (deduplicated via a Set).
- **`reset()`** — returns the flipper to its initial idle state.

**Tuning parameters** (all configurable via the `tuning` object):

| Parameter        | Default        | Description                                  |
|-----------------|----------------|----------------------------------------------|
| `restAngle`     | `0`            | Paddle resting angle (radians)               |
| `activeAngle`   | `π/3` (~60°)   | Maximum firing angle                         |
| `swingSpeed`    | `14`           | Upward rotation speed (rad/s)                |
| `resetSpeed`    | `4`            | Return-to-rest rotation speed (rad/s)        |
| `cooldown`      | `2.5`          | Seconds between fire cycles                  |
| `launchUp`      | `12`           | Vertical impulse strength                    |
| `launchForward` | `6`            | Forward impulse strength                     |
| `launchAssistMax` | `0.3`        | Max lateral assist factor                    |

**`createArenaFlippers(arenaSize)`** creates the standard arena flipper layout (one flipper in the south-west quadrant, facing north). Flippers auto-fire whenever they return to idle. Returns `{ flippers, update, reset, fire }`.

### `tests/arena-flipper.test.js`

49 tests covering:
- Construction and Three.js group setup
- Full state machine transitions (idle → firing → resetting → cooldown → idle)
- Paddle visual rotation tracking
- Contact detection with position, bounds, airborne, and rotation
- Launch physics: vertical impulse, forward impulse, lateral assist, swing progress scaling
- Deduplication (one launch per robot per swing)
- Reset behaviour
- Rotated flipper launch directions
- Factory function (`createArenaFlippers`)

## Modified modules

### `src/main.js`

- Imports `createArenaFlippers` from `./arena-flipper.js`.
- Creates arena flippers after fire hazards and adds them to the scene.
- Ticks `arenaFlippers.update(dt)` each frame in the game loop.
- Calls `applyLaunch(robot)` on each flipper each frame during the firing window.
- Resets arena flippers in `startLoop()`.

## Design decisions

1. **State machine over animation** — The flipper uses a four-state machine (`idle → firing → resetting → cooldown`) so launch logic only happens during the active firing window. This prevents unrealistic impulses during the reset phase.

2. **Contact-based launch** — Launch impulse is only applied when a robot is physically over the paddle. Direction is biased upward and forward relative to the flipper face, with lateral assist based on off-centre position.

3. **One impulse per swing** — A Set tracks which robots were already launched during the current swing to prevent double-impulse bugs.

4. **Auto-fire in factory** — `createArenaFlippers` auto-triggers each flipper as soon as it returns to idle, making it behave as a periodic arena hazard without manual trigger wiring.

5. **Tuning hooks exposed** — All physics and timing values are configurable via the tuning object, making iteration straightforward without modifying source.
