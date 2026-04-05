# Rotational Flipper (Pivot-Based Arc Motion)

## Overview

The car's flipper weapon now swings in a true rotational arc around a hinge pivot, matching how real Robot Wars flippers behave. Previously the flipper mesh rotated in place which produced a visually correct but physically imprecise motion. The collision zone and impulse direction now follow the same arc.

## What Changed

### Pivot Group Architecture (`car.js`)

Each flipper variant now has a **pivot Group** positioned at the hinge point (bottom of the car body, front face). The flipper mesh is a child of the pivot with a local offset so the paddle extends forward from the hinge.

```
car.group
  └── flipperPivot (THREE.Group at hinge position)
        └── flipperMesh (offset so back edge sits at pivot origin)
```

During activation, the **pivot group's** `rotation.x` is driven by the flipper angle. This causes the mesh to trace a true arc — the tip rises in Y while shortening its Z-reach, exactly like a real hinged flipper.

- `car.flipperPivot` — new getter exposing the active pivot group
- `car.flipper` — still returns the mesh (backward compatible)
- Visibility is controlled on the pivot, not the mesh
- `reset()` zeroes pivot rotations instead of mesh rotations

### Arc-Aware Contact Detection (`flipper-physics.js`)

`checkFlipperContact` now accounts for the flipper's current angle:

- **Z-reach** shrinks as the flipper rises: `projectedDepth = flipperDepth × cos(θ)`
- **Height tolerance** increases with the flipper tip's rise: `tipRise = flipperDepth × sin(θ)`
- A robot near the tip of a flat flipper will lose contact once the flipper swings high enough, matching the physical reality that the paddle has swept past it

### Arc-Based Impulse Direction (`flipper-physics.js`)

`applyFlipperImpulse` now applies force along the flipper's **surface normal** at its current angle:

| Component | Old behaviour | New behaviour |
|-----------|--------------|---------------|
| Vertical  | `force` (full) | `force × cos(θ)` — dominant at low angles |
| Forward   | `force × 0.8` (fixed ratio) | `force × sin(θ)` — increases with angle |
| Lateral   | Unchanged | Unchanged |

At small angles the impulse is mostly straight up (launching the robot). As the flipper swings higher, the impulse tilts forward, pushing the robot away — just like a real flipper that catches an opponent at different points in its swing.

## Files Changed

| File | Change |
|---|---|
| `src/car.js` | Replaced direct flipper meshes with pivot groups; animation drives pivot rotation |
| `src/flipper-physics.js` | Arc-aware contact zone; surface-normal impulse direction |
| `tests/car.test.js` | Updated 4 tests for pivot-based structure (visibility on pivot, containment in pivot) |
| `tests/flipper-physics.test.js` | Added 12 new tests covering pivot structure, arc contact detection, and rotational impulse |
| `docs/022-rotational-flipper.md` | This document |
