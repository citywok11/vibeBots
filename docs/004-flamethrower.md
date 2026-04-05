# Flamethrower Weapon

Added a flamethrower weapon to the player car in sandbox mode.

## What was added

- **Flamethrower barrel**: A cylinder mesh positioned at the center top of the car body (`x=0, z=0, y=height/2`), pointing forward along the car's −Z axis. This is the permanent visual representing the weapon mount.
- **Flame mesh**: An orange/red emissive cone that shoots forward from the barrel tip. It is hidden when inactive and visible while the flamethrower is firing.
- **Flame particles**: 15 small orange spheres that stream in front of the car (starting at the barrel tip, travelling ~2 units forward) when the flamethrower is active. Each particle fades out and scales up over its lifetime (0.5 s) and respawns when it expires, creating a continuous fire effect.
- **Default key binding**: `E` activates the flamethrower (added to `DEFAULT_BINDINGS` in `input.js`).
- **Channel / hold-to-fire**: The flamethrower fires continuously while `E` is held down and stops as soon as the key is released. `activateFlamethrower()` turns it on; `deactivateFlamethrower()` turns it off.
- **Customise screen section**: A new **FLAMETHROWER** section has been added to the Customise screen, matching the style of the Model, Wheels, and Flipper sections. The Standard variant is pre-selected.

## Key design decisions

1. **Centered placement**: The barrel sits at the middle of the car body (z=0 in local space) on top of the body (y=0.5). The flame cone sits just past the barrel tip (z=−1.25).

2. **Particles in car-local space**: All particle meshes are children of the car group, so they automatically follow the car's position and rotation without any world-space coordinate maths.

3. **Channel pattern (isPressed)**: `main.js` calls `activateFlamethrower()` every frame `E` is held and `deactivateFlamethrower()` every frame it is not, giving hold-to-fire behaviour. This is different from the flipper which uses `wasJustPressed` for a one-shot trigger.

4. **No collision footprint change**: The barrel, flame, and particles are on top of the car and do not extend beyond the car's X/Z footprint, so `bounceOffWalls()` is unchanged.

5. **Rebindable**: Since `flamethrower` is a named action in `DEFAULT_BINDINGS`, it automatically appears in the key bindings screen and can be rebound by the player.

## Files changed

- `src/car.js` — flamethrower/flame meshes, particle system, `activateFlamethrower()`, `deactivateFlamethrower()`, `reset()` update
- `src/input.js` — `flamethrower: ['KeyE']` added to `DEFAULT_BINDINGS`
- `src/main.js` — flamethrower wired with `isPressed` for channel behaviour
- `src/customise-screen.js` — Flamethrower section added to CATALOGUE, selections, and panel
- `tests/car.test.js` — updated and expanded flamethrower test suite (channel, deactivate, particles)
- `tests/customise-screen.test.js` — FLAMETHROWER section tests added
