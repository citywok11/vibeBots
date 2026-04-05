# 008 — Flipper De-select Physics

## Overview

Deselecting the flipper in the customise screen now fully removes it from gameplay: the collision boundary no longer includes the flipper's depth and `activateFlipper` becomes a no-op when the flipper is absent.

## Modified modules

### `src/car.js`

- **`hasFlipper` state variable** — a boolean (initially `true`) that tracks whether the flipper is equipped, mirroring the existing `hasWheels` pattern.
- **`applyCustomisation`** — sets `hasFlipper = selections.flipper !== null` (and `flipper.visible`) when the `flipper` key is present in the selections object.
- **`activateFlipper`** — returns early when `hasFlipper` is `false`, so pressing the flipper key has no effect.
- **`bounceOffWalls`** — the effective half-depth now only adds the flipper's projection when `hasFlipper` is `true`. With no flipper the boundary shrinks from `depth/2 + flipperDepth` (2.7) to `depth/2` (1.5), letting the car drive up to 1.2 units closer to the north/south walls.

## Design decisions

- Only `bounceOffWalls` and `activateFlipper` needed guarding; the flipper animation in `update` is already inert when `flipperActive` can never be set to `true`.
- `hasFlipper` is not reset in `reset()`, matching the existing behaviour of `flipper.visible`: customisations persist across game resets.
