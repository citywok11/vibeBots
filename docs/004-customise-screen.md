# 004 — Customise Screen

## Overview

Adds a dedicated Customise screen accessible from the pause menu in sandbox mode. The screen shows three sections (Model, Wheels, Flipper), each displaying visual item buttons for the available loadout options. Currently each section has one item. The game scene remains rendered in the background while this screen is open.

## New modules

### `src/customise-screen.js`

**Purpose:** Renders the customisation overlay where players choose their car's model, wheels, and flipper.

**Public API:**
```javascript
createCustomiseScreen(container)
// Returns:
{
  open(),         // Show the screen
  close(),        // Hide the screen
  isOpen(),       // Boolean — whether screen is visible
  onClose(cb),    // Register callback fired when Back is clicked
  getSelections() // Returns { model, wheels, flipper } — current selections (copy)
}
```

**Key details:**
- Three sections: **Model**, **Wheels**, **Flipper**, each with a row of item buttons.
- Item buttons show a small CSS visual of the item (no text labels on the button face). Each button has a `title` attribute with the item name for accessibility.
- The currently-selected item in each section has a gold (`#ffd700`) border and a matching `box-shadow` glow. Non-selected items have a dark border that brightens on hover.
- Selections are stored internally and returned as a copy via `getSelections()`.
- Internal catalogue (`CATALOGUE`) lists items per section; adding new items to a section automatically renders additional buttons.
- `z-index: 200` — sits above the pause menu overlay (`z-index: 100`).

**Visual representations (CSS shapes):**
- **Model** — top-down car view: red rectangle body, four dark circles for wheels, narrow light-grey strip for the flipper at the front.
- **Wheels** — front-on wheel: dark circle with a hub circle and a rim border.
- **Flipper** — side-on ramp shape: CSS border-triangle ramp over a flat base rectangle.

## Modified modules

### `src/main.js`

- Imports `createCustomiseScreen` and creates an instance on startup.
- `menu.onCustomise` now opens the customise screen instead of the key bindings screen.
- `customiseScreen.onClose` closes the customise screen and reopens the pause menu.
- Game loop pause condition extended: `menu.isOpen() || customiseScreen.isOpen()` — physics are frozen and only the scene is rendered whenever either overlay is visible.

## Navigation/flow changes

**Before:**
```
Pause Menu → Customise → Key Bindings Screen
```

**After:**
```
Pause Menu → Customise → Customise Screen → Back → Pause Menu
```

## Design decisions

- **Game visible in background** — The customise screen uses `rgba(0,0,0,0.82)` as background so the 3D arena scene shows through, achieved by keeping the render loop running (physics-frozen) while the screen is open.
- **CSS shapes instead of miniature 3D renders** — Avoids complexity of off-screen Three.js renders or canvas snapshots. Shapes are readable at button size and match the game's colour palette.
- **`borderColor` set via property not cssText** — jsdom (used in Vitest) does not expand the `border` shorthand when reading `style.borderColor`; setting it as a discrete property keeps tests and runtime behaviour consistent.
- **CATALOGUE object** — Centralises item definitions so adding future options (new models, wheel types, weapons) only requires adding an entry to the appropriate array; the section builder renders them automatically.
