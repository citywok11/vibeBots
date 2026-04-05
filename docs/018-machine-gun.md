# Machine Gun

## Summary

Adds a machine gun weapon to the player car, selectable from the Customise screen. The machine gun uses the same hold-to-fire control style as the flamethrower. Only one of the two weapons can fire at a time — activating one automatically deactivates the other.

## Controls

- **Q** — hold to fire (machine gun must be equipped via the Customise screen)

## Customise Screen

A new **MACHINE GUN** section appears in the Customise screen, below Flamethrower. Clicking the Standard button equips the machine gun; clicking it again deselects it. The flamethrower and machine gun can both be equipped at the same time, but only the last one whose key is held will fire.

## Implementation Details

### `src/car.js`

- Exports `MACHINE_GUN_CATALOGUE` (currently one variant: `standard`).
- Adds a machine gun barrel mesh (`machineGun`) offset to the right side of the car top (`x = 0.5, y = height/2`). It is a thinner cylinder (`CylinderGeometry(0.06, 0.08, 1.2, 8)`) coloured dark grey to distinguish it from the flamethrower barrel.
- Adds a muzzle flash mesh (`muzzleFlash`) — a small yellow cone at the barrel tip that flickers at ~20 Hz while firing.
- Adds 20 bullet particles (`mgParticles`) — small fast-moving yellow spheres (`speed = 12`, `lifetime = 0.15 s`, tight spread) that stream from the barrel tip.
- `activateMachineGun()` — sets `machineGunActive = true` and `flamethrowerActive = false` (mutual exclusivity).
- `deactivateMachineGun()` — sets `machineGunActive = false`.
- `activateFlamethrower()` now also sets `machineGunActive = false`.
- `applyCustomisation({ machineGun: id | null })` — shows/hides the barrel and stops firing if deselected.
- `reset()` clears machine gun state and hides all machine gun meshes.

### `src/input.js`

- Adds `machineGun: ['KeyQ']` to `DEFAULT_BINDINGS`.

### `src/customise-screen.js`

- Imports `MACHINE_GUN_CATALOGUE` from `car.js`.
- Adds `machineGun: null` to the initial selections object.
- Adds `createMachineGunVisual()` — renders a barrel, nozzle tip, muzzle-flash dots, and ammo feed box icon.
- Adds a **Machine Gun** section to the customise panel (deselectable, like Flamethrower).

### `src/main.js`

- Game loop checks `input.isPressed('machineGun')` each frame and calls `car.activateMachineGun()` or `car.deactivateMachineGun()` accordingly, mirroring the flamethrower pattern.
