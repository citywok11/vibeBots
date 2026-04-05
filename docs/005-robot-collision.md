# 005 — Static Robot and Collision Physics

## Overview

Makes the dummy robot opponent static by default (no movement on load) and adds physics-based collision detection between the player car and the robot. When the player's car hits the robot, momentum is transferred proportionally based on each vehicle's velocity and mass.

## Modified Modules

### `src/robot.js`

- **Static by default**: Robot now starts with zero velocity (`{ x: 0, z: 0 }`). It will only move once the player's car collides with it.
- **Mass property**: Exposes a `mass` getter (default `1`). Customisable via `options.mass`.
- **collisionRadius property**: Exposes a `collisionRadius` value computed as the half-diagonal of the body box (`Math.sqrt((width/2)² + (depth/2)²) ≈ 1.80`).
- **reset()**: Now restores velocity to zero (previously restored to the initial diagonal velocity).
- Removed `DEFAULT_SPEED`, `speed`, and `angle` options — the robot no longer self-propels.

### `src/car.js`

- **Mass property**: Exposes a `mass` getter (default `1`). Customisable via `options.mass`.
- **collisionRadius property**: Exposes a `collisionRadius` value computed the same way as the robot (`≈ 1.80` for the default 2×3 body).

### `src/main.js`

- Imports `resolveCollision` from `./collision.js`.
- Robot is created without an initial angle: `createRobot({ x: 10, z: -10 })`.
- Each frame, after updating car and robot positions, calls `resolveCollision` with adapters exposing `position`, `velocity`, `mass`, and `collisionRadius` for each vehicle.

## New Modules

### `src/collision.js`

**Purpose**: Resolves 2D (XZ-plane) elastic-with-restitution collisions between two physical objects.

**Public API**:

| Export | Description |
|--------|-------------|
| `resolveCollision(a, b, restitution?)` | Detects and resolves a collision between objects `a` and `b` |

**`resolveCollision(a, b, restitution = 0.6)`**

Each argument `a` / `b` must have:
- `position: { x, z }` — mutable world position
- `velocity: { x, z }` — mutable velocity (modified in-place)
- `mass: number` — positive mass value
- `collisionRadius: number` — bounding sphere radius for overlap detection

Returns `true` if a collision was resolved, `false` if the objects were not overlapping or were already moving apart.

**Physics**:
1. **Overlap test**: collision triggers when `distance(a, b) < a.collisionRadius + b.collisionRadius`.
2. **Approach test**: only resolves if objects are moving toward each other (`relativeVelocity · normal > 0`).
3. **Impulse**: computed using the standard impulse formula — `J = (1 + e) * relVelNormal / (1/mA + 1/mB)` — where `e` is the restitution coefficient.
4. **Velocity update**: impulse is applied along the collision normal, scaled by inverse mass (heavier objects change velocity less).
5. **Position separation**: objects are pushed apart to eliminate the overlap, weighted by inverse mass so lighter objects move further.

**Design decisions**:
- The function is generic and dependency-free — it operates on plain objects, not Three.js types. This makes it easily testable.
- Default restitution of `0.6` matches the existing wall-bounce restitution in `car.js` and `robot.js` for a consistent feel.
- Weight (mass) directly affects how much each vehicle is deflected: a heavier robot will barely move when a light car hits it, and vice versa.

## Navigation/Flow Changes

None — collision is purely a physics update within the game loop.
