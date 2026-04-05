# vibeBots - Robot Wars Roguelike

A 3D browser-based robot battle game built with Three.js. Drive a car with a flipper weapon around an arena with physics-based wall bouncing.

## Quick Start

```bash
npm install
npm run dev        # Start Vite dev server on port 5173
npm test           # Run all 90 tests
npm run test:watch # Run tests in watch mode
```

## Controls

| Action     | Default Keys       |
|------------|--------------------|
| Forward    | W / Arrow Up       |
| Backward   | S / Arrow Down     |
| Turn Left  | A / Arrow Left     |
| Turn Right | D / Arrow Right    |
| Flipper    | Space              |
| Pause Menu | Escape             |

All keys are rebindable via the in-game Key Bindings screen (Escape > Key Bindings).

## Architecture

```
main.js                  # Game loop, scene setup, wires everything together
├── arena.js             # 3D arena with floor and 4 walls
├── car.js               # Player vehicle: body, wheels, flipper, physics
├── input.js             # Configurable key binding system
├── menu.js              # Pause menu overlay
└── keybindings-screen.js # Key rebinding UI
```

### Module APIs

#### `createArena(size)` — `src/arena.js`

Creates a square arena of `size x size` units with floor and 4 walls.

Returns: `{ floor, walls[], group, size }`

#### `createCar(startPos?, options?)` — `src/car.js`

Creates a driveable car with body, 4 wheels, and front flipper.

- `startPos`: `{ x, z }` — starting position (default: origin)
- `options.wheelRadius`: number — wheel size (default: 0.6), affects car ride height

Returns:
```
{
  group,              // THREE.Group — add this to the scene
  mesh,               // THREE.Mesh — car body
  wheels[],           // THREE.Mesh[] — 4 wheel meshes
  flipper,            // THREE.Mesh — front flipper
  flipperAngle,       // number (getter) — current flipper angle
  rotation,           // number (getter) — Y-axis rotation
  velocity,           // { x, z } (getter) — current velocity

  accelerate(amount),    // Add velocity in facing direction
  turnLeft(amount),      // Rotate left
  turnRight(amount),     // Rotate right
  activateFlipper(),     // Fire the flipper (auto-returns)
  update(dt),            // Apply physics + animate flipper
  bounceOffWalls(size),  // Wall collision with bounce
}
```

**Physics:** Velocity-based movement with friction (0.98/frame). Wall bounces use restitution (0.6) for energy loss. Collision uses rotation-aware axis-aligned bounding box so the car body never overlaps walls at any angle.

**Flipper:** Fires up at 12 rad/s to 60 degrees, then slowly returns at 4 rad/s.

#### `createInputManager(bindings?)` — `src/input.js`

Manages keyboard input with configurable action-to-key mappings.

Returns:
```
{
  isPressed(action),        // Is action currently held?
  wasJustPressed(action),   // One-shot press detection (consumed on read)
  rebind(action, keys[]),   // Change keys for an action
  getBindings(),            // { action: string[] } — all current bindings
  getActions(),             // string[] — all action names
  resetToDefaults(),        // Restore DEFAULT_BINDINGS
  handleKeyDown(code),      // Feed keydown events
  handleKeyUp(code),        // Feed keyup events
}
```

New actions added via `rebind('newAction', ['KeyX'])` are automatically picked up by the key bindings screen — no manual registration needed.

#### `createMenu(container)` — `src/menu.js`

Pause menu overlay with Resume and Key Bindings buttons.

Returns: `{ isOpen(), open(), close(), toggle(), onKeyBindings(cb) }`

#### `createKeyBindingsScreen(container, inputManager)` — `src/keybindings-screen.js`

Key rebinding UI that dynamically reads all actions from the input manager.

Returns: `{ isOpen(), isListening(), open(), close(), handleKeyPress(code), onClose(cb) }`

Click any key button to enter listening mode, then press the desired key. Escape cancels. "Reset to Defaults" restores original bindings.

## Tests

90 tests across 5 test files, all written TDD (tests first):

| File | Tests | Coverage |
|------|-------|----------|
| arena.test.js | 6 | Floor, walls, group, size |
| car.test.js | 48 | Movement, physics, wheels, flipper, wall collision |
| input.test.js | 15 | Key binding, rebinding, press detection, reset |
| menu.test.js | 11 | Open/close/toggle, buttons, callbacks |
| keybindings-screen.test.js | 10 | Dynamic action list, rebinding UI, listening mode |

## Tech Stack

- **Three.js** — 3D rendering
- **Vite** — dev server and bundling
- **Vitest + jsdom** — testing
