# Accurate Wall Collision (Asymmetric AABB Fix)

## Problem

The player car was bouncing off arena walls too early — up to **1.2 units before visually touching them**. The effect was most obvious when the car backed into a wall or approached a side wall at a rotation where the flipper was not facing it.

## Root Cause

`bounceOffWalls` computed the car's axis-aligned bounding box (AABB) using a **symmetric** depth value:

```
effectiveHalfDepth = depth/2 + flipperDepth * cos(angle)  // e.g. 2.7 when flat
```

This value was applied symmetrically to **both** front and back, even though the flipper only projects from the **front** of the car. The back of the car is only `depth/2 = 1.5` units from centre, but the formula treated it as 2.7 units, triggering a bounce 1.2 units too early whenever the back end approached a wall.

## Fix

`bounceOffWalls` now computes the AABB from the **four corners** of the car's actual bounding shape, which is asymmetric:

| Extent | Value (flat flipper) | Notes |
|---|---|---|
| `halfW` | 1.3 | body half-width + wheel overhang |
| `frontHalfDepth` | 2.7 | body + flipper (flipper only at front) |
| `backHalfDepth`  | 1.5 | body only — no flipper at back |

Each corner `(±halfW, -frontHalfDepth)` and `(±halfW, +backHalfDepth)` is projected into world space using the car's rotation matrix, and the true min/max extents in X and Z are derived from those projections. This gives an exact, tight AABB at any rotation without over-estimating the back of the car.

## Behaviour Change

| Scenario | Old limit | New limit |
|---|---|---|
| Front (flipper flat) approaches wall | 22.3 from centre | 22.3 (unchanged) |
| Back approaches wall | 22.3 from centre | 23.5 from centre |
| Rotated 90° — back side faces wall | over-estimated | accurate for that orientation |

## Tests Added

Five new tests were added (TDD) to `tests/car.test.js` under the describe block  
`"Asymmetric front/back collision (flipper only at front)"`:

- Does **not** bounce when facing north and back end is clear of south wall
- **Does** bounce when facing north and back end reaches south wall
- Clamps south-wall position to back half-depth when facing north
- Does **not** bounce when facing south and back end is clear of north wall
- Clamps north-wall position to back half-depth when facing south

All four previously-failing tests now pass, and all 255 existing tests continue to pass.
