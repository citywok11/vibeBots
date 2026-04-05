# Rogue Like Mode

## Overview

Rogue Like mode is a new game mode accessible from the home screen. It launches the player into a game session identical to Sandbox Mode for now, but with a distinct pause menu that omits the Customise button.

## Home Screen

A **Rogue Like** button has been added to the home screen menu, between the existing Sandbox Mode and Options buttons. Clicking it immediately starts a new game session in Rogue Like mode.

## In-Game Pause Menu

When playing in Rogue Like mode, pressing **Escape** opens the Rogue Like pause menu. This menu contains:

- **Back to main menu** — stops the game and returns to the home screen
- **Options** — opens the Options screen (Key Bindings etc.)

The **Customise** button present in the Sandbox Mode pause menu is intentionally absent from the Rogue Like pause menu.

## Implementation

- `src/roguelike-menu.js` — new module for the Rogue Like pause menu (`createRoguelikeMenu`)
- `src/home-screen.js` — added "Rogue Like" button and `onRogueLike(cb)` callback
- `src/main.js` — wires up the Rogue Like flow: start on button click, Escape toggles the roguelike menu, Back to main menu stops the loop and returns to home screen

## Future Plans

Rogue Like mode will be differentiated from Sandbox Mode with roguelike progression mechanics (upgrades between rounds, enemy waves, etc.) as development continues.
