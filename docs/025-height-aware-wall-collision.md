# Physical 3D Wall Collision

## Overview

Updated `bounceOffWalls()` in both `car.js` and `robot.js` to treat arena walls as physical 3D boxes rather than infinite barriers. Entities can:
- **Fly over** walls when airborne above wall height
- **Bounce off** the inner face from inside the arena
- **Bounce off** the outer face from outside the arena
- **Land on top** of the wall when descending onto its footprint

## Problem

Previously the arena walls acted as infinite barriers — entities could never clear them regardless of altitude. An initial height-aware fix allowed entities to fly over, but used a latching `outOfArena` flag that prevented entities from ever interacting with the wall again once they'd cleared it. This meant:
- Entities couldn't land on top of the wall
- Entities outside the arena couldn't bounce off the wall's outer face
- The walls felt like teleportation barriers, not physical objects

## Solution

### Wall as a Physical Box

Each wall is modelled as a box with:
- **Height**: `ARENA_WALL_HEIGHT = 2` (exported from `arena.js`)
- **Thickness**: `ARENA_WALL_THICKNESS = 0.5` (exported from `arena.js`)
- **Inner face** at `half - thickness/2` (arena side)
- **Outer face** at `half + thickness/2` (outside)
- **Top** at `y = wallHeight`

### bounceOffWalls Signature

```js
function bounceOffWalls(arenaSize, wallHeight = Infinity, wallThickness = 0)
```

Backwards compatible — when called with just `arenaSize`, walls are infinitely tall and zero-thickness (original behaviour).

### Collision Rules

1. **Above wall height**: No XZ collision — entity flies over. If descending onto a wall's XZ footprint, lands on the wall top (`group.position.y = wallHeight + groupY`).

2. **Below wall height, inside arena** (`position <= half`): Entity bounces off the inner face when its AABB edge crosses `half - thickness/2`.

3. **Below wall height, outside arena** (`position > half`): Entity bounces off the outer face when its AABB edge crosses `half + thickness/2`.

### Removed: `outOfArena` flag

The latching `outOfArena` flag has been removed from both `car.js` and `robot.js`. It is no longer needed — the physical wall model naturally handles entities on both sides of the wall.

### arena.js

Exported two constants:

```js
export const ARENA_WALL_HEIGHT = 2;
export const ARENA_WALL_THICKNESS = 0.5;
```

### main.js

Imports both constants and passes them to `bounceOffWalls()`:

```js
car.bounceOffWalls(ARENA_SIZE, ARENA_WALL_HEIGHT, ARENA_WALL_THICKNESS);
robot.bounceOffWalls(ARENA_SIZE, ARENA_WALL_HEIGHT, ARENA_WALL_THICKNESS);
```

## Tests Updated

### car.test.js — height-aware wall collision
- Bounces off wall when grounded (below wall height)
- Does NOT bounce when airborne and lowest point is above wall height
- Still bounces when airborne but lowest point is below wall top
- Does NOT bounce when exactly at wall height threshold
- Flies past all four walls when high enough
- Backwards compatible — still bounces when no wallHeight is passed
- Bounces off the outer face of the wall when outside the arena
- Does not bounce when outside the arena and moving away from wall
- Lands on the wall top when above wall height and over the wall footprint
- Does not land on wall top when not over wall footprint

### robot.test.js — height-aware wall collision
- Same test cases as above, for the robot entity

### Updated existing tests
- Wall bounce tests now position entities just past the inner face rather than far past the wall (matching physical wall behaviour where entities can't teleport through walls)
