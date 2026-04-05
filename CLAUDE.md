# CLAUDE.md — LLM Context for vibeBots

## What is this project?

A "Robot Wars" roguelike game built with Three.js, running in the browser via Vite. The player drives a car with a flipper weapon around a 3D arena. The game is in early development — currently single-player with one car and no opponents.

## Commands

- `npm run dev` — Start Vite dev server (port 5173)
- `npm test` — Run all tests with Vitest (currently 90 tests, all passing)
- `npm run test:watch` — Run tests in watch mode

## Project conventions

- **TDD workflow**: Write failing tests first, then implement to make them pass
- **ES modules**: All files use `import`/`export`, `"type": "module"` in package.json
- **No build step needed**: Vite serves ES modules directly in dev
- **Testing**: Vitest with jsdom environment, tests in `tests/` directory mirroring `src/`

## Architecture overview

All game logic is in `src/`, tests in `tests/`. There is no framework — just vanilla JS modules and Three.js.

### Module dependency graph

```
main.js (entry point, game loop)
  ├── arena.js       — static 3D arena (floor + 4 walls)
  ├── car.js         — player car (body, wheels, flipper, physics)
  ├── input.js       — action-to-key binding system
  ├── menu.js        — pause menu DOM overlay
  └── keybindings-screen.js — key rebinding DOM UI
```

Modules are loosely coupled: `arena.js`, `car.js`, and `input.js` are independent. `menu.js` and `keybindings-screen.js` depend only on a DOM container (and `input.js` for the keybindings screen). `main.js` wires everything together.

### Key design decisions

1. **Car uses a THREE.Group** — body mesh, 4 wheel meshes, and flipper are children of one group. Position/rotation are on the group; physics operates on group coordinates.

2. **Velocity-based physics** — `accelerate()` adds to velocity (not position). `update(dt)` applies velocity to position and applies friction. This means bounce reflections persist correctly across frames.

3. **Rotation-aware collision** — `bounceOffWalls()` computes axis-aligned bounding box from the car's current rotation angle, so the car body never clips into walls at any angle.

4. **Input actions are dynamic** — The InputManager discovers actions from its bindings map. Any new action added via `rebind('newAction', ['KeyX'])` automatically appears in the key bindings screen. No hardcoded action lists in the UI.

5. **Configurable wheel size** — `createCar(pos, { wheelRadius })` accepts wheel radius. The car's ride height is derived from wheel radius (`wheelRadius + bodyHeight/2`). This is designed for future customization where players pick different wheel sizes.

6. **Flipper is hinged** — The flipper geometry has its pivot translated to the back edge so it rotates from a realistic hinge point at the front of the car.

## Current state and what's next

### What exists
- Driveable car with WASD/arrow controls
- Flipper weapon (Space to fire, auto-returns)
- Square arena with wall bounce physics (restitution + friction)
- Pause menu (Escape) with key rebinding screen
- 90 passing tests

### Planned features (not yet built)
- Enemy robots / AI opponents
- Roguelike progression (upgrades between rounds)
- Different weapon types beyond flipper
- Car customization (body, wheels, weapons)
- Damage system / health
- Multiple arena layouts

## Important patterns for contributors

- **Adding a new car action** (e.g., a new weapon): Add the key to `DEFAULT_BINDINGS` in `input.js`, add the method to `car.js`, and call it from the game loop in `main.js`. The key bindings screen will automatically pick it up.

- **Adding a new car component** (e.g., a spinner weapon): Add the mesh to the car's group in `createCar()`, expose it in the return object, and write tests for positioning and behavior.

- **Physics values**: `RESTITUTION` (0.6) and `FRICTION` (0.98) are constants at the top of `car.js`. `ACCEL` (20) and `TURN_SPEED` (3) are in `main.js`.
