# 005 — Audience and Stands

## Overview

Adds tiered bleacher stands with audience figures around all four sides of the arena, giving the game the look of a Robot Wars broadcast arena with a crowd in the background.

## Modified modules

### `src/arena.js`

**What changed**: `createArena()` now builds four sets of audience stands — one per arena side — and populates them with colourful audience figures.

**New return properties**:

| Property | Type | Description |
|---|---|---|
| `stands` | `THREE.Group[]` (length 4) | One group per side (North, South, East, West). Each group contains tier meshes and audience figure meshes as children. |
| `audienceFigures` | `THREE.Mesh[]` | Flat list of all audience figure meshes, useful for iteration or animation. |

All existing return properties (`floor`, `walls`, `group`, `size`) are unchanged.

**Stand geometry**:
- 3 tiers per side, each tier a box that steps back and up from the arena wall.
- Stand width = `arenaSize + 14`, so stands extend slightly past the arena corners.
- Stands are placed just outside the outer edge of each wall with a 1.5-unit gap.
- Tier material colour: dark navy (`0x1a1a4a`).

**Audience figures**:
- 18 figures per tier row (54 per side, 216 total for a size-50 arena).
- Each figure is a small box mesh (0.55 × 1.2 × 0.55 units).
- Colours cycle through eight vivid colours to simulate a crowd.

**Internal helper**: `createStandsAndAudience(size, wallThickness)` — not exported; called only from `createArena`.

## Design decisions

- **Groups per side**: Each side's stand and figures are children of one `THREE.Group`, making it easy to hide, animate, or recolour a whole stand in future.
- **Rotation strategy**: All stands are built with the same local orientation (tiers step in +Z). The group's `rotation.y` is set per side so tiers always step away from the arena: `Math.PI` for North, `0` for South, `Math.PI/2` for East, `-Math.PI/2` for West.
- **Proportional scaling**: Stand width grows with arena size, so the crowd fills the background correctly regardless of the `size` argument passed to `createArena`.
- **Deterministic colours**: Figure colours are chosen by `(col + tier * 3) % 8`, which is deterministic (no `Math.random`) — this keeps tests reliable and avoids snapshot churn.
