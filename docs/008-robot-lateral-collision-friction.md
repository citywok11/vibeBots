# 008 — Angle-Dependent Lateral Friction on Robot Collision

## Overview

When the player's car hits the dummy robot, friction is now applied to the robot's lateral (sideways) velocity based on the angle of the collision relative to the robot's wheel axis:

- **Parallel hit** (front or rear) — the robot is pushed along its natural rolling direction; no extra friction is applied and it slides away freely.
- **Perpendicular hit** (side impact) — the robot is pushed broadside; maximum friction (80 %) is applied to the lateral velocity component, so the robot barely moves sideways.
- **Intermediate angle** — friction scales smoothly between the two extremes using `sin²(θ)`, where `θ` is the angle between the collision direction and the robot's forward axis.

## Modified Modules

### `src/robot.js`

- Added `COLLISION_LATERAL_FRICTION = 0.8` constant (80 % reduction of lateral speed at full perpendicular impact).
- Added `applyCollisionFriction(nx, nz)` method:
  1. Reads the robot's current `group.rotation.y` to determine its forward direction `(sin θ, -cos θ)` in the XZ plane.
  2. Computes the *perpendicularity factor* — `1 - (dot(normal, forward))²` — which is 0 for a pure head-on hit and 1 for a pure side hit.
  3. Decomposes the robot's velocity into forward and lateral components.
  4. Damps the lateral component by `perpendicularFactor × COLLISION_LATERAL_FRICTION`.
- Exported `applyCollisionFriction` in the return object.

### `src/main.js`

- `resolveCollision` return value is now captured in `collided`.
- When `collided` is `true`, the normalised collision direction (car → robot) is computed and passed to `robot.applyCollisionFriction(nx, nz)`.

## Physics Details

| Collision angle | `perpendicularFactor` | Lateral damping |
|-----------------|-----------------------|-----------------|
| 0° (front/rear) | 0                     | 0 % — rolls freely |
| 45°             | 0.5                   | 40 % reduction |
| 90° (side)      | 1                     | 80 % reduction |

## Navigation/Flow Changes

None — friction is applied as a one-shot post-collision adjustment within the existing game loop.
