# Home Screen, Options Screen & Menu Updates

## Overview

Added a home screen that appears on game startup, an options screen accessible from it, and an Exit button to the pause menu. The key bindings screen is now reachable from both the options screen and the pause menu.

## New Modules

### `createHomeScreen(container)` — `src/home-screen.js`

Title screen shown on game startup with the game name "VIBE BOTS".

**Buttons:**
- **Play** — closes home screen, starts the game
- **Options** — opens the options screen
- **Exit** — calls `window.close()`

**API:**
```
{
  isOpen(),
  open(),
  close(),
  onPlay(cb),
  onOptions(cb),
  onExit(cb),
}
```

### `createOptionsScreen(container)` — `src/options-screen.js`

Settings screen accessible from the home screen.

**Buttons:**
- **Key Bindings** — opens the key bindings screen
- **Back** — returns to home screen

**API:**
```
{
  isOpen(),
  open(),
  close(),
  onKeyBindings(cb),
  onBack(cb),
}
```

## Modified Modules

### `menu.js`

- Added **Exit** button that returns to the home screen
- New `onExit(cb)` callback in the API

### `main.js`

- Game starts with home screen open, `gameStarted = false`
- Escape key only toggles pause menu when `gameStarted` is true
- Key bindings screen uses `keyBindingsReturnTo` callback to return to whichever screen opened it (options or pause menu)
- Exit from pause menu resets `gameStarted` and reopens home screen

## Screen Navigation Flow

```
Home Screen
  ├── Play → Game starts
  ├── Options → Options Screen
  │     ├── Key Bindings → Key Bindings Screen → Back to Options
  │     └── Back → Home Screen
  └── Exit → window.close()

In-Game (Escape)
  └── Pause Menu
        ├── Resume → Close menu
        ├── Key Bindings → Key Bindings Screen → Back to Pause Menu
        └── Exit → Home Screen
```
