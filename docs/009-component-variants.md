# 009 — Component Variants (Models, Wheels, Flippers)

## Overview

Adds multiple selectable variants for the three major car components. Each variant has distinct visual geometry and gameplay-affecting physics parameters. The customise screen now shows all variants side-by-side so players can compare before selecting.

## New Modules

None — all changes are confined to existing modules.

## Modified Modules

### `src/car.js`

**Exported catalogues** — three new exported arrays define the available variants:

- `MODEL_CATALOGUE` — car body shapes and mass values  
- `WHEEL_CATALOGUE` — wheel types with friction and velocity multipliers  
- `FLIPPER_CATALOGUE` — flipper types with depth, power, and animation speeds  

Each catalogue entry contains an `id`, `label`, and all parameters needed by both the 3D rendering and the physics engine.

**Body variants** (`MODEL_CATALOGUE`):

| id | Label | Mass | Shape |
|----|-------|------|-------|
| `standard` | Standard | 1.0 | 2×1×3 red box (original) |
| `wedge` | Wedge | 0.8 | 2.6×0.65×2.5 orange wide-flat box |
| `heavy` | Heavy | 2.0 | 2.2×1.8×3.8 blue tall box |

**Wheel variants** (`WHEEL_CATALOGUE`):

| id | Label | Radius | Friction | Velocity mult |
|----|-------|--------|----------|---------------|
| `standard` | Standard | 0.6 | 0.980 | 1.0 |
| `offroad` | Off-Road | 0.75 | 0.970 | 0.85 |
| `racing` | Racing | 0.45 | 0.993 | 1.2 |

**Flipper variants** (`FLIPPER_CATALOGUE`):

| id | Label | Depth | Power | Max angle | Up speed | Down speed |
|----|-------|-------|-------|-----------|----------|------------|
| `standard` | Standard | 1.2 | 1.0 | 60° | 12 rad/s | 4 rad/s |
| `heavy` | Heavy | 1.8 | 2.0 | ~72° | 8 rad/s | 3 rad/s |
| `light` | Light | 0.8 | 0.6 | 45° | 20 rad/s | 6 rad/s |

**Physics parameters** are now mutable state in `createCar()` and update when `applyCustomisation()` is called:

- `currentMass` — drives collision resolution (from selected model)
- `currentFriction` — per-frame velocity decay (from selected wheels)
- `currentVelocityMult` — multiplier applied in `accelerate()` (from selected wheels)
- `currentFlipperPower`, `currentFlipperMaxAngle`, `currentFlipperUpSpeed`, `currentFlipperDownSpeed`, `currentFlipperDepth` — flipper animation and contact-zone parameters

**New getters** on the car object: `flipperPower`, `flipperDepth`, `flipperMaxAngle`.

**`car.mesh`**, **`car.wheels`**, and **`car.flipper`** are now computed getters that return the currently active mesh / wheel set. All variant meshes are pre-built and added to the car group on creation; inactive variants have `visible = false`.

### `src/flipper-physics.js`

Uses `car.flipperDepth`, `car.flipperMaxAngle`, and `car.flipperPower` dynamically instead of the previously hard-coded module-level constants. This allows the flipper contact zone and impulse strength to automatically reflect whichever flipper type is equipped.

### `src/customise-screen.js`

Imports `MODEL_CATALOGUE`, `WHEEL_CATALOGUE`, and `FLIPPER_CATALOGUE` from `car.js` so the catalogue is defined in one place. The visual factory functions (`createModelVisual`, `createWheelVisual`, `createFlipperVisual`) now accept the catalogue item and render a distinct visual for each variant (different sizes and colours in the UI). The flamethrower section retains its single `standard` entry.

## Design Decisions

1. **Single catalogue source** — catalogues live in `car.js` because they define gameplay parameters. `customise-screen.js` imports them rather than duplicating entries.

2. **Pre-built all variants** — every variant mesh is created once when `createCar()` runs and stays in the group hidden. `applyCustomisation()` flips visibility and updates physics state in O(1). No scene rebuilds on selection change.

3. **Fixed bounding-box dimensions** — wall-bounce physics always use the standard car body dimensions (`CAR_BODY_WIDTH`, `CAR_BODY_DEPTH`) regardless of which visual model is active. This keeps the many existing bounce tests stable. Mass, friction, and velocity multiplier provide meaningful gameplay differentiation.

4. **Standard wheel set inherits `options.wheelRadius`** — the existing `createCar(pos, { wheelRadius })` API continues to work; the standard wheel set uses whatever radius was passed. Off-road and racing sets always use their catalogue radii.

5. **Flipper depth drives the contact zone** — `flipper-physics.js` now reads `car.flipperDepth` at call time. Equipping a heavy flipper (depth 1.8) extends the contact zone forward; a light flipper (depth 0.8) shortens it. Wall-bounce uses `currentFlipperDepth` in the same way.
