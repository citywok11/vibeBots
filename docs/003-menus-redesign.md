# Menu Redesign

## Overview

The game now has two distinct menus: an **Exit screen** accessible from the home screen's Exit button, and a redesigned **in-game pause menu** accessible via the Escape key during gameplay.

## Exit Screen (`src/exit-screen.js`)

Shown when the player clicks **Exit** on the home screen. Provides a way to start playing without the full game setup flow.

**Buttons:**
- **Sandbox mode** — closes the screen and starts the game immediately
- **Options** — opens the options screen
- **Exit game** — closes the application (`window.close()`)

## In-Game Pause Menu (`src/menu.js`)

Shown when the player presses **Escape** during gameplay. Pressing Escape again toggles it closed.

**Buttons:**
- **Customise** — opens the key bindings screen to remap controls
- **Back to main menu** — stops the game and returns to the home screen
- **Options** — opens the options screen

## Navigation Flow Changes

```
Home Screen
  ├── Play → Game starts
  ├── Options → Options Screen
  │     ├── Key Bindings → Key Bindings Screen → Back to Options
  │     └── Back → Home Screen
  └── Exit → Exit Screen
        ├── Sandbox mode → Game starts
        ├── Options → Options Screen → Back to Exit Screen
        └── Exit game → window.close()

In-Game (Escape)
  └── Pause Menu
        ├── Customise → Key Bindings Screen → Back to Pause Menu
        ├── Back to main menu → Home Screen
        └── Options → Options Screen → Back to Pause Menu
```

## Key Behaviour Changes

- **Escape key** now toggles the pause menu open/closed instead of immediately returning to the home screen.
- The home screen **Exit** button now opens the Exit screen instead of calling `window.close()` directly.
- The pause menu no longer has a **Resume** button; pressing Escape again closes it.
