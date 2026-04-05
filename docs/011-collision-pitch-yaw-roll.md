# 011 — Collision Pitch, Yaw, and Roll

## Overview

Adds rotational physics to car–robot collisions. When two vehicles collide, they now spin (yaw) based on where the impact occurs on their body, and visually rock (pitch and roll) from the force of the hit.

## What changed

### `src/collision.js`

- `resolveCollision` now returns a **result object** instead of `true` when a collision is resolved. The object contains:
  - `angularImpulseA` / `angularImpulseB` — yaw torque for each object (radians/s)
  - `impactNormal` — collision direction `{ x, z }` from A → B
  - `impactSpeed` — relative velocity at moment of impact
  - `contactPoint` — world-space position `{ x, z }` of the collision
- Returns `false` when no collision occurs (unchanged).
- Added `computeAngularImpulse()` helper that:
  - Projects the contact point onto the **oriented rectangle surface** of the body (when `rotation`, `bodyWidth`, `bodyDepth` are provided).
  - Computes the 2D cross product of the lever arm × impulse force.
  - Divides by a realistic moment of inertia (`m(w² + d²)/12`).
  - Off-centre hits produce spin; perfectly head-on hits produce zero spin.
- Objects may now optionally include `rotation`, `bodyWidth`, and `bodyDepth` properties for accurate angular physics. Without these, fallback circle-based calculation is used.

### `src/car.js`

- Added `angularVelocity` state — yaw spin rate from collisions, decays with angular friction (0.95 per frame).
- Added `pitchTilt` and `rollTilt` state — visual-only tilt from impact force, clamped to ±0.3 radians and decays over time (`TILT_DECAY = 8`).
- `update(dt)` now:
  - Applies `angularVelocity` to `rotation` each frame.
  - Decays angular velocity with friction; snaps to zero when below threshold.
  - Decays pitch/roll tilt back to zero.
  - Sets `group.rotation` with all three axes: `(pitchTilt, rotation, rollTilt)`.
- Added `applyAngularImpulse(impulse)` — adds yaw torque from a collision.
- Added `applyImpactTilt(nx, nz, speed)` — transforms the world-space impact normal into the car's local frame to set pitch (front/back rock) and roll (side-to-side rock), scaled by impact speed.
- `reset()` now clears angular velocity, pitch tilt, roll tilt, and all rotation axes.
- Exported new properties: `angularVelocity`, `pitchTilt`, `rollTilt`, `applyAngularImpulse`, `applyImpactTilt`.

### `src/robot.js`

- Added `angularVelocity`, `pitchTilt`, `rollTilt` state — same pattern as the car.
- `update(dt)` now applies angular velocity (with friction decay) and tilt decay.
- Added `applyAngularImpulse(impulse)` and `applyImpactTilt(nx, nz, speed)` methods.
- `reset()` now clears angular velocity, tilt, and all rotation axes.
- Exported new properties and methods.

### `src/main.js`

- Collision adapter objects now include `rotation`, `bodyWidth`, and `bodyDepth`.
- After collision, applies `angularImpulseA`/`angularImpulseB` to each vehicle.
- Applies pitch/roll tilt based on impact normal and speed.
- Reuses the returned `impactNormal` for the existing `applyCollisionFriction` call (instead of recomputing it manually).

## Physics model

- **Yaw (spin)**: The angular impulse is computed from the cross product of the lever arm (center → body surface contact point) and the impulse force vector. The moment of inertia uses the standard formula for a uniform rectangle: `I = m(w² + d²) / 12`. Off-centre hits spin the vehicle; head-on hits don't.
- **Pitch (forward/back tilt)**: Proportional to the Z component of the impact in the vehicle's local frame. A front-on hit rocks the vehicle backward.
- **Roll (side-to-side tilt)**: Proportional to the X component of the impact in the vehicle's local frame. A side hit tilts the vehicle away from the impact.
- Tilt is visual only — it decays rapidly and doesn't affect physics.

## Tests added

### `tests/collision.test.js`

- Existing `toBe(true)` checks updated to `toBeTruthy()` (result is now an object).
- New `collision result object` describe block:
  - Returns angular impulse properties, impact normal, impact speed, contact point.
  - Head-on symmetric collision produces zero angular impulse.
  - Off-centre collision produces non-zero angular impulse.
  - Heavier objects receive less angular impulse.

### `tests/car.test.js`

- New `Car angular velocity (yaw spin from collisions)` describe block (7 tests):
  - Exposes `angularVelocity` starting at zero.
  - `applyAngularImpulse` changes and accumulates angular velocity.
  - Rotation changes over time based on angular velocity.
  - Angular friction decays spin; eventually reaches zero.
  - Reset clears angular velocity.
- New `Car collision tilt (pitch and roll)` describe block (8 tests):
  - Exposes `pitchTilt`/`rollTilt` starting at zero.
  - Front hit → pitch; side hit → roll.
  - Tilt is clamped to max value.
  - Tilt decays to zero over time.
  - Reset clears tilt.
  - Tilt is relative to car rotation.

### `tests/robot.test.js`

- New `angular velocity` describe block (7 tests): mirrors the car tests.
- New `collision tilt (pitch and roll)` describe block (7 tests): mirrors the car tests.
