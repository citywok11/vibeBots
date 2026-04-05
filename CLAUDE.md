# CLAUDE.md — LLM Context for vibeBots

## What is this project?

A "Robot Wars" roguelike game built with Three.js, running in the browser via Vite. The player drives a car with a flipper weapon around a 3D arena. The game is in early development — currently single-player with one car and no opponents.

## Commands

- `npm run dev` — Start Vite dev server (port 5173)
- `npm test` — Run all tests with Vitest
- `npm run test:watch` — Run tests in watch mode

## Project conventions

- **TDD workflow**: Write failing tests first, then implement to make them pass
- **ES modules**: All files use `import`/`export`, `"type": "module"` in package.json
- **No build step needed**: Vite serves ES modules directly in dev
- **Testing**: Vitest with jsdom environment, tests in `tests/` directory mirroring `src/`
- **PR documentation**: Every PR must include a doc in `docs/` describing what was added or changed. Do NOT add feature docs to README.md — the README is a high-level overview only. See `docs/README.md` for the documentation policy.

## Architecture overview

All game logic is in `src/`, tests in `tests/`, feature docs in `docs/`. There is no framework — just vanilla JS modules and Three.js.

### Module dependency graph

```
main.js (entry point, game loop, screen orchestration)
  ├── arena.js              — static 3D arena (floor + 4 walls)
  ├── car.js                — player car (body, wheels, flipper, physics)
  ├── input.js              — action-to-key binding system
  ├── home-screen.js        — title screen (Play, Options, Exit)
  ├── options-screen.js     — options menu (Key Bindings, Back)
  ├── menu.js               — in-game pause menu (Customise, Options, Exit)
  ├── customise-screen.js   — loadout picker (Model, Wheels, Flipper sections)
  └── keybindings-screen.js — key rebinding UI (reads actions dynamically)
```

Modules are loosely coupled: `arena.js`, `car.js`, and `input.js` are independent. Screen modules (`home-screen.js`, `options-screen.js`, `menu.js`, `customise-screen.js`, `keybindings-screen.js`) depend only on a DOM container (and `input.js` for the keybindings screen). `main.js` wires everything together.

### Screen navigation flow

```
Home Screen
  ├── Play → Game starts
  ├── Options → Options Screen
  │     ├── Key Bindings → Key Bindings Screen → Back to Options
  │     └── Back → Home Screen
  └── Exit → window.close()

In-Game (Escape)
  └── Pause Menu
        ├── Customise → Customise Screen → Back to Pause Menu
        ├── Options → Options Screen → Key Bindings Screen → Back to Options
        └── Exit → Home Screen
```

### Key design decisions

1. **Car uses a THREE.Group** — body mesh, 4 wheel meshes, and flipper are children of one group. Position/rotation are on the group; physics operates on group coordinates.

2. **Velocity-based physics** — `accelerate()` adds to velocity (not position). `update(dt)` applies velocity to position and applies friction. This means bounce reflections persist correctly across frames.

3. **Rotation-aware collision** — `bounceOffWalls()` computes axis-aligned bounding box from the car's current rotation angle, so the car body never clips into walls at any angle.

4. **Input actions are dynamic** — The InputManager discovers actions from its bindings map. Any new action added via `rebind('newAction', ['KeyX'])` automatically appears in the key bindings screen. No hardcoded action lists in the UI.

5. **Configurable wheel size** — `createCar(pos, { wheelRadius })` accepts wheel radius. The car's ride height is derived from wheel radius (`wheelRadius + bodyHeight/2`). This is designed for future customization where players pick different wheel sizes.

6. **Flipper is hinged** — The flipper geometry has its pivot translated to the back edge so it rotates from a realistic hinge point at the front of the car.

7. **Key bindings screen returns to caller** — `keyBindingsReturnTo` callback in `main.js` tracks which screen opened the key bindings screen, so Back always returns to the correct place (options or pause menu).

## Current state and what's next

### What exists
- Home screen with Play, Options, Exit
- Options screen with Key Bindings access
- Driveable car with WASD/arrow controls
- Flipper weapon (Space to fire, auto-returns)
- Square arena with wall bounce physics (restitution + friction)
- Pause menu (Escape) with key rebinding and exit to home
- Fully configurable key bindings

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

- **Adding a new screen**: Create a module following the pattern in `home-screen.js` or `menu.js` (factory function, DOM overlay, callback registrations). Wire it into `main.js`. Add a doc in `docs/`.

- **Physics values**: `RESTITUTION` (0.6) and `FRICTION` (0.98) are constants at the top of `car.js`. `ACCEL` (20) and `TURN_SPEED` (3) are in `main.js`.

- **Documentation**: Feature docs go in `docs/`, not in README.md. See `docs/README.md` for the policy.
