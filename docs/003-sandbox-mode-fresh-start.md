# Sandbox Mode: Fresh Start & Canvas Hiding

## What changed

### Game canvas is hidden when on the main menu

The Three.js renderer canvas is now hidden (`display: none`) whenever the player is on the main menu or any other screen outside of active gameplay. Previously the canvas sat behind the home-screen overlay at all times, meaning the last rendered game frame was always present in the background even though the animation loop had already stopped.

- On startup the canvas starts hidden.
- When a game session starts the canvas is shown.
- When the game ends (Exit from pause menu, or Escape) the canvas is hidden again.

### Game state resets on every new session

Pressing **Sandbox Mode** now always starts a completely fresh game. The car is teleported back to its spawn position, its velocity is zeroed, its rotation is reset, and the flipper is lowered before the game loop resumes.

A new `reset()` method was added to `createCar()` to encapsulate this initialisation logic.

### "Play" renamed to "Sandbox Mode"

The main menu button previously labelled **Play** is now labelled **Sandbox Mode** to better describe the current free-roam, no-objective gameplay that is available.
