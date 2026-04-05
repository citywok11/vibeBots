# Robot Rotation-Aware Wall Collision

## Overview

Updated `bounceOffWalls()` in `robot.js` to compute a rotation-aware axis-aligned bounding box (AABB) from the robot's current yaw angle. Previously the wall collision used fixed axis-aligned half-extents (`width/2` and `depth/2`), which meant the corners of the robot's cuboid body could clip through arena walls when the robot was rotated.

## Problem

The robot body is 2 units wide and 3 units deep. At rotation 0 the axis-aligned extents are correct (halfX=1, halfZ=1.5). But when the robot rotates — for example 45° — the true bounding box expands to approximately 1.77 units in each axis. The old code didn't account for this, so a robot at 45° could push its corners ~0.77 units past where the wall should stop it.

## Solution

The fix mirrors the approach already used in `car.js`: iterate over the four corners of the body rectangle in local space, rotate them into world space, and find the min/max X and Z extents. These rotated extents are then used for wall clamping and velocity reflection.

```
Before (axis-aligned only):
  limitX = arenaHalf - width/2
  limitZ = arenaHalf - depth/2

After (rotation-aware AABB):
  For each corner (±halfW, ±halfD):
    worldX = cos(rotation) * localX + sin(rotation) * localZ
    worldZ = -sin(rotation) * localX + cos(rotation) * localZ
  Track min/max of worldX, worldZ
  Clamp: position.x + maxX ≤ arenaHalf, position.x + minX ≥ -arenaHalf (etc.)
```

## Tests Added

- Bounce off east/west/north/south walls when rotated 45° and a corner extends past the wall
- No false bounce when rotated 45° but the AABB is safely inside
- Position clamping ensures no corner extends beyond the wall after bounce
- 90° rotation correctly swaps width and depth in the AABB
