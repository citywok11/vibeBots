# Fire Hazards

## Overview

Adds flat grate meshes to the arena floor that periodically emit fire upwards, creating environmental hazards for all robots in the arena.

## New module: `src/fire-hazard.js`

### Purpose

Creates and manages arena floor fire hazards — static grate meshes at fixed positions that cycle between inactive and active states. While active, each grate emits orange/red fire particles that rise upward and fade out.

### Public API

- **`createFireHazard(x, z, phaseOffset = 0)`** — creates a single fire hazard at world position `(x, 0, z)`.
  - Returns `{ group, grate, particles, update(dt), reset(), isActive() }`.
  - `phaseOffset` shifts the hazard's starting position in the fire cycle (seconds) so multiple hazards don't all fire simultaneously.

- **`createFireHazards(arenaSize)`** — creates four hazards at the "inner corners" of the arena floor (at ≈ ±48 % of the arena half-size on each axis, clear of both the walls and the central pit).
  - Returns `{ hazards, update(dt), reset() }`.
  - Each hazard's group must be added to the Three.js scene individually: `hazards.forEach(h => scene.add(h.group))`.

### Key details

- **Grate mesh**: a flat `BoxGeometry` (2 × 0.06 × 2) in dark grey, sitting flush on the floor (`y = GRATE_HEIGHT / 2`).
- **Fire cycle**: `FIRE_PERIOD = 4 s`, `FIRE_ACTIVE_DURATION = 1.5 s`. `isActive()` returns `true` when the cycle timer is within the active window.
- **Particles**: `N_FIRE_PARTICLES = 12` small emissive spheres per hazard. Each spawns on the grate surface with a random lateral offset, rises at `PARTICLE_SPEED = 5 u/s` with slight horizontal drift, scales up, and fades out over a `PARTICLE_LIFETIME = 0.7 s`. Particles only respawn while the hazard is active; they expire normally when inactive.
- **Staggered phases**: the four hazards in `createFireHazards` use phase offsets of `0`, `FIRE_PERIOD × 0.25`, `FIRE_PERIOD × 0.5`, and `FIRE_PERIOD × 0.75` so they fire in sequence rather than all at once.

## Modified modules

### `src/main.js`

- Imports `createFireHazards` from `fire-hazard.js`.
- Creates fire hazards after the pit alarm: `const fireHazards = createFireHazards(ARENA_SIZE)`.
- Adds each hazard group to the scene.
- Calls `fireHazards.update(dt)` in the game loop (after pit update).
- Calls `fireHazards.reset()` in `startLoop` alongside the other arena resets.

## Design decisions

1. **Arena-level module, not part of `arena.js`**: Fire hazards have animation state (`cycleTimer`, particle ages) that must be updated each frame. `arena.js` is intentionally static (no `update` needed). A separate module keeps concerns clean.

2. **World-space particles as group children**: Particle meshes are children of each hazard's `THREE.Group`, so they automatically inherit the hazard's position without any world-space coordinate maths — the same pattern used by the car's flamethrower particles.

3. **Phase offset rather than randomisation**: Using deterministic phase offsets ensures consistent, reproducible behaviour (no randomness in the hazard schedule). This makes testing straightforward and keeps the hazard rhythm predictable for players.

4. **No damage system yet**: The hazards are purely visual at this stage. Once a damage/health system is added, `isActive()` can be used by `main.js` to check whether the car overlaps an active grate and apply damage.

## Files changed

- `src/fire-hazard.js` — new module (fire hazard creation and particle system)
- `src/main.js` — imports, creates, updates, and resets fire hazards
- `tests/fire-hazard.test.js` — 21 unit tests covering hazard creation, cycle states, particle visibility, and `createFireHazards`
