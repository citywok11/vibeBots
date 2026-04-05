# 017 — Robot AI (Chase Behaviour)

## What changed

The dummy robot opponent now actively chases the player instead of sitting still.

## Implementation

A new `updateAI(dt, targetPos)` method was added to `robot.js`. It is called once per frame in the game loop in `main.js`, passing the player car's current position as the target.

The AI does two things each frame:

1. **Turn** — Smoothly rotates the robot's yaw toward the target angle at a fixed turn speed (2 rad/s).
2. **Accelerate** — Pushes the robot forward along its facing direction at up to a capped speed (8 units/s).

### Key constants (inside `createRobot`)

| Constant        | Value | Description                          |
|-----------------|-------|--------------------------------------|
| `AI_SPEED`      | 8     | Maximum chasing speed (units/s)      |
| `AI_ACCEL`      | 15    | Forward acceleration (units/s²)      |
| `AI_TURN_SPEED` | 2     | Yaw rotation rate (radians/s)        |

The robot continues to bounce off arena walls and respond to collisions as before.

## What was not changed

- The robot's physics (friction, restitution, angular velocity, tilt) are unchanged.
- The public API of `robot.js` is backwards-compatible; `updateAI` is an additive export.
