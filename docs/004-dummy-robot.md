# 004 — Dummy Robot in Arena

## Overview

Adds a stationary-start, wall-bouncing dummy robot opponent to the arena. The robot moves with constant velocity, bouncing off walls, giving the player a moving target to interact with.

## New Modules

### `src/robot.js`

**Purpose**: Creates a passive robot opponent that moves around the arena with constant velocity and bounces off walls.

**Public API**:

| Export | Description |
|--------|-------------|
| `createRobot(startPos, options)` | Factory function returning a robot object |

**`createRobot(startPos, options)`**
- `startPos` — `{ x, z }` starting position (default `{ x: 0, z: 0 }`)
- `options.wheelRadius` — wheel radius (default `0.6`)
- `options.speed` — initial movement speed in units/sec (default `8`)
- `options.angle` — initial direction angle in radians (default `π/4`)

**Returned object**:
- `group` — `THREE.Group` containing the body mesh and wheels; add to scene
- `mesh` — the body `THREE.Mesh` (blue, `0x4444ff`)
- `velocity` — live `{ x, z }` velocity object (readable and writable)
- `update(dt)` — advance position by `velocity * dt`
- `bounceOffWalls(arenaSize)` — reflect velocity off arena walls; returns `{ bounced: boolean }`
- `reset()` — restore starting position and initial velocity

**Design decisions**:
- Body is blue (`0x4444ff`) to distinguish it visually from the player car (red `0xff4444`).
- No friction applied — the robot maintains constant speed between bounces, making it predictably dangerous.
- Wall bounce uses a fixed RESTITUTION of `0.6`, matching the player car.
- Velocity object is exposed directly so future AI or collision code can read/modify it.

## Modified Modules

### `src/main.js`

- Imports `createRobot` from `./robot.js`.
- Creates one robot instance at `{ x: 10, z: -10 }` with a diagonal initial angle (`Math.PI * 1.25`).
- Calls `robot.update(dt)` and `robot.bounceOffWalls(ARENA_SIZE)` each game loop frame.
- Calls `robot.reset()` in `startLoop()` so the robot resets to its start position each new game.

## Navigation/Flow Changes

None — the robot is purely a game-world object with no UI impact.
