# 012 — Arena Pit and Pit Button

## Overview

Adds a **pit** to the sandbox arena, a **button** on the east arena wall to lower it, and a **klaxon alarm** that sounds while the pit is lowering — faithful to the Robot Wars TV show mechanic.

## New Modules

### `src/pit.js`

Manages the pit geometry and lowering animation.

**Exported constant**

| Export | Value | Description |
|---|---|---|
| `DEFAULT_PIT_SIZE` | `6` | Default pit side length in world units (fits any bot) |

**`createPit(arenaSize, { pitSize = DEFAULT_PIT_SIZE } = {})`**

Returns:

| Property / Method | Type | Description |
|---|---|---|
| `group` | `THREE.Group` | All pit meshes — add to scene |
| `cover` | `THREE.Mesh` | The trapdoor that lowers when the pit is activated |
| `depthFloor` | `THREE.Mesh` | Dark floor rendered at the bottom of the open pit |
| `pitSize` | `number` | Configured side length |
| `activate()` | `function` | Starts the lowering animation (no-op if already open/lowering) |
| `update(dt)` | `function` | Call every frame; animates cover descent |
| `isOpen()` | `function → boolean` | `true` once the cover has fully lowered |
| `isLowering()` | `function → boolean` | `true` while the cover is descending |
| `containsPoint(x, z)` | `function → boolean` | `true` when the point is inside the open pit zone |

The pit is always **centred at the origin** (0, 0) so it sits in the middle of the arena regardless of arena size. An orange warning frame is rendered at floor level around the pit edge.

---

### `src/pit-button.js`

A physical button mesh mounted on the **east arena wall** (positive-X side) that triggers pit lowering when driven into.

**`createPitButton(arenaSize)`**

Returns:

| Property / Method | Type | Description |
|---|---|---|
| `group` | `THREE.Group` | Button mesh — add to scene |
| `mesh` | `THREE.Mesh` | The button box (red → dark red when pressed) |
| `checkHit(x, z, radius)` | `function → boolean` | Call each frame; returns `true` and fires callbacks on first hit |
| `onActivate(callback)` | `function` | Register a callback invoked when the button is first hit |
| `isPressed()` | `function → boolean` | `true` after the button has been hit |
| `reset()` | `function` | Restores unpressed state (called at game start) |

The button scales its X position with `arenaSize` and sits flush with the inner face of the east wall, centred in Z.

---

### `src/pit-alarm.js`

A Web Audio API klaxon that plays while the pit is lowering.

**`createPitAlarm(audioCtx = null)`**

Accepts an optional `AudioContext` for testing (a real `AudioContext` is created lazily in the browser). Returns:

| Property / Method | Type | Description |
|---|---|---|
| `start()` | `function` | Starts a sawtooth-wave oscillator alternating between 880 Hz and 440 Hz every 500 ms |
| `stop()` | `function` | Stops the alarm and cleans up the oscillator |
| `isPlaying()` | `function → boolean` | `true` while the alarm is active |

Both `start()` and `stop()` are idempotent.

---

## Modified Modules

### `src/main.js`

- Imports and instantiates `createPit`, `createPitButton`, `createPitAlarm`.
- Adds `pit.group` and `pitButton.group` to the Three.js scene.
- Wires `pitButton.onActivate` → `pit.activate()` + `pitAlarm.start()`.
- Calls `pit.update(dt)` every game-loop frame; stops the alarm when `pit.isLowering()` becomes `false`.
- Checks `pitButton.checkHit` against the player car and robot each frame.
- Implements bot-falls-in logic: when `pit.isOpen()` and `pit.containsPoint(x, z)` is true for a vehicle, it sinks into the pit at 8 u/s and resets when it falls below y = −10.
- `startLoop()` now calls `pitButton.reset()` and resets `carFalling` / `robotFalling` flags so each game session starts cleanly.

---

## Design Decisions

1. **Pit at origin** — the pit is always centred at (0, 0). Because bots start away from the centre and the button must be deliberately driven into, the pit doesn't activate accidentally.

2. **Configurable size, sensible default** — `DEFAULT_PIT_SIZE = 6` is larger than any bot's footprint (2 × 3 body), so a bot can fall in cleanly. Custom sizes are accepted via the options object.

3. **Button on east wall only** — a single, fixed-location button keeps hit detection simple and gives players a clear target to defend or attack.

4. **Web Audio API, no external dependency** — the alarm uses a native `AudioContext` + `OscillatorNode`. No new library is added to the project.

5. **Alarm plays during lowering, stops when open** — `pitAlarm.stop()` is called as soon as `pit.isLowering()` returns `false`, matching the Robot Wars show mechanic where the klaxon signals the descent rather than the open state.
