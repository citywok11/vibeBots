# Robot Rotation-Aware Wall Collision (Body + Wheels)

## Overview

Updated `bounceOffWalls()` in `robot.js` to compute a rotation-aware axis-aligned bounding box (AABB) that encompasses both the robot body and its wheels. Previously the wall collision used fixed axis-aligned half-extents from only the body dimensions (`width/2` and `depth/2`), which meant the corners of the robot's cuboid body and its wheels could clip through arena walls when the robot was rotated.

## Problem

The robot body is 2 units wide and 3 units deep, but the wheels extend past the body in both axes:

- **X axis**: each wheel sits at `width/2 + AXLE_GAP + wheelWidth/2` from centre, with the outer edge at `width/2 + AXLE_GAP + wheelWidth` = 1.6 (vs body halfW of 1.0)
- **Z axis**: each wheel centre is at `depth/2 - 0.4` from centre, and the wheel radius extends past the body edge to `wheelOffsetZ + wheelRadius` = 1.7 (vs body halfD of 1.5)

Additionally, at any non-zero rotation the true bounding box expands beyond the axis-aligned extents. For example, at 45° the AABB of the full shape (body + wheels) expands to approximately 2.33 units in each axis.

## Solution

The fix computes the effective bounding rectangle that includes both the body and the wheels:

```
halfW = width/2 + AXLE_GAP + wheelWidth          (outer edge of wheels in X)
halfD = max(depth/2, wheelOffsetZ + wheelRadius)  (outer edge of wheels in Z)
```

The four corners of this rectangle are then rotated by the robot's current yaw angle, and the min/max world-space extents are used for wall clamping and velocity reflection — identical to the approach already used in `car.js`.

## Tests Added

**Rotation-aware wall collision** (7 tests):
- Bounce off all 4 walls when rotated 45° and a corner extends past the wall
- No false bounce when the rotated AABB is safely inside
- Position clamping guarantees no corner passes the wall (using wheel-inclusive extents)
- 90° rotation correctly swaps width/depth in the AABB

**Wheel collision with walls** (7 tests):
- Wheel bounces on east/west walls when body centre is clear
- No false bounce when wheels are inside
- Position clamping keeps wheel outer edges inside arena (X axis)
- Wheel radius bounces on north/south walls when body edge is clear
- Position clamping keeps wheel radius inside arena (Z axis)
