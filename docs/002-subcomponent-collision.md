# Sub-Component Collision Detection (Wheels & Flipper)

## Overview

Updated `bounceOffWalls()` in `car.js` to account for wheel width and flipper projection when calculating collision bounds. Previously only the car body was considered, causing wheels and the flipper to clip through arena walls.

## Changes

### `car.js` — `bounceOffWalls()`

The collision half-extents now include sub-components:

```
effectiveHalfWidth = bodyWidth/2 + wheelWidth
effectiveHalfDepth = bodyDepth/2 + flipperDepth * cos(flipperAngle)
```

- **Wheels**: `wheelWidth` (radius * 0.5) extends beyond each side of the body
- **Flipper**: projects `flipperDepth * cos(flipperAngle)` beyond the front. When the flipper is flat (angle=0), it adds full depth. When raised to 60 degrees, it adds only half — allowing the car to get closer to the wall.

These effective extents are then rotated by the car's Y rotation to produce the axis-aligned bounding box, same as before.

## Design Decision

The flipper's wall collision is angle-dependent: `cos(flipperAngle)` gives the horizontal projection. This means firing the flipper near a wall slightly changes how close the car can get, which feels natural — the flipper folds up out of the way.

## Tests Added

- Wheel bounces on east/west walls when body center is clear
- No false bounce when wheels are inside
- Position clamping keeps wheel edges inside arena
- Flipper bounces on north/south walls when body center is clear
- Raised flipper allows car closer to wall than flat flipper
- Position clamping keeps flipper tip inside arena
