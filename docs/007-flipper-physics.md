# Flipper Physics

## Overview

When the player car's flipper is beneath the dummy robot and is activated, the robot is launched into the air. The impulse magnitude and direction depend on how much the flipper has risen and where along the flipper's width the contact occurs.

## How It Works

### Contact Detection (`checkFlipperContact`)

Each frame during an active flip the game checks whether the robot's body overlaps the flipper zone in the **car's local coordinate frame**:

- **Z axis (depth)** — the robot centre must lie between the flipper hinge (front face of the car body) and a distance equal to the flipper depth plus the robot's half-depth beyond the hinge. If the robot is behind the car, or too far ahead, no contact is reported.
- **X axis (width)** — the robot centre must be within the combined half-width of the flipper and the robot body.
- **Airborne guard** — a robot that is already more than 0.1 units above the ground cannot be re-flipped until it lands again.

The function also returns an **`xOffset`** value (normalised to `[-1, 1]`) representing how far left or right of the flipper centre the robot is sitting. This value drives the lateral component of the impulse.

### Impulse Application (`applyFlipperImpulse`)

Conditions required for an impulse to fire:

1. `car.flipperActive` is `true` (the flipper is on its upswing).
2. `car.flipperAngle > 0` (the flipper has actually started moving).
3. The robot is within the flipper contact zone.

The total **force** scales linearly with the current flipper angle relative to its maximum (`π/3` rad):

```
force = FLIPPER_STRENGTH × (flipperAngle / FLIPPER_MAX_ANGLE)
```

- **Vertical impulse** — the full `force` is added to the robot's `velocityY`, sending it upward.
- **Lateral impulse** — `xOffset × force × LATERAL_FACTOR` is computed in the car's local X direction and then rotated into world space via the car's heading. An off-centre hit pushes the robot sideways.

The caller (`main.js`) applies the impulse **once per flip activation** using a `flipImpulseApplied` flag that resets whenever the player triggers the flipper.

## Constants

| Constant | Value | Notes |
|---|---|---|
| `FLIPPER_STRENGTH` | `15` | Peak vertical velocity added (units/s) |
| `LATERAL_FACTOR` | `0.5` | Fraction of force applied laterally |
| `FLIPPER_MAX_ANGLE` | `π/3` | Must match `car.js` |

## Robot Vertical Physics

`createRobot` now tracks a `velocityY` component and applies gravity each frame:

```
velocityY -= GRAVITY × dt        // gravity pulls down
position.y += velocityY × dt     // move vertically
if position.y ≤ groundY:         // land
    position.y = groundY
    velocityY = 0
```

`GRAVITY = 20 units/s²` (roughly twice Earth gravity for snappy arcade feel).

The robot's `groundY` (resting height above the arena floor) is exposed as a read-only getter.

## Files Changed / Added

| File | Change |
|---|---|
| `src/flipper-physics.js` | New module — `checkFlipperContact` and `applyFlipperImpulse` |
| `src/robot.js` | Added `velocityY`, gravity, `groundY` getter |
| `src/car.js` | Exposed `flipperActive` getter |
| `src/main.js` | Calls `applyFlipperImpulse` once per flip activation |
| `tests/flipper-physics.test.js` | 29 TDD tests covering contact detection and impulse physics |
