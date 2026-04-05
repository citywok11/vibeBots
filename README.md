# vibeBots - Robot Wars Roguelike

A 3D browser-based robot battle game built with Three.js. Drive a car with a flipper weapon around an arena with physics-based wall bouncing.

## Quick Start

```bash
npm install
npm run dev        # Start Vite dev server on port 5173
npm test           # Run all tests
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

All keys are rebindable in-game via Options > Key Bindings or Pause Menu > Key Bindings.

## Architecture

See [CLAUDE.md](CLAUDE.md) for full LLM-optimized architecture context, design decisions, and contributor patterns.

```
main.js                    # Game loop, scene setup, screen orchestration
├── arena.js               # 3D arena with floor and 4 walls
├── car.js                 # Player vehicle: body, wheels, flipper, physics
├── input.js               # Configurable key binding system
├── home-screen.js         # Title screen (Play, Options, Exit)
├── options-screen.js      # Options menu (Key Bindings, Back)
├── menu.js                # In-game pause menu (Resume, Key Bindings, Exit)
└── keybindings-screen.js  # Key rebinding UI
```

## Documentation

Feature and change documentation lives in [`docs/`](docs/). **Every PR must include a doc in `docs/`** — see [`docs/README.md`](docs/README.md) for the full policy.

Do not add detailed feature documentation to this README. This file is a high-level overview only.

## Tech Stack

- **Three.js** — 3D rendering
- **Vite** — dev server and bundling
- **Vitest + jsdom** — testing (TDD workflow)
