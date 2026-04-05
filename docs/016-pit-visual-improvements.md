# Pit Visual Improvements

## What changed

Three visual improvements were made to `src/pit.js` to make the pit lowering obviously apparent.

### 1. Hazard-stripe walls

The four inner shaft walls previously used a plain near-black `MeshStandardMaterial`. They now use a `ShaderMaterial` that renders alternating yellow/dark horizontal hazard stripes (8 bands per wall face). As the cover descends and the walls are exposed, the unmistakeable yellow-black pattern instantly communicates "danger — deep hole".

### 2. Heavy darkness gradient on the cover

The cover shader was rewritten to be far more dramatic. Two effects now compound:

- **Edge vignette** — the rim of the cover blackens rapidly as `uDepth` increases.
- **Overall dimming** — the whole surface fades toward black (`uDepth * 0.75` factor).

Combined, the cover goes from mid-grey to nearly black well before it reaches the bottom, giving a clear visual cue that it is sinking into a shaft.

### 3. Warning sign that descends with the cover

A thin flat plate (`BoxGeometry(2, 0.02, 2)`) with diagonal yellow/dark hazard stripes and a black border is placed centred on the pit, just above the cover. It descends in lockstep with the cover (`warningSign.position.y = coverY + WARN_THICKNESS`), making the downward movement immediately obvious even from a high camera angle. The sign resets to its starting position when the pit is reset.

## API additions

`createPit()` now returns `warningSign` alongside the existing `cover`, `depthFloor`, and other properties.

## Tests

Six new tests were added to `tests/pit.test.js` covering:

- `warningSign` is exposed as a `Mesh`
- Initial Y position is just above the floor
- Material is a `ShaderMaterial`
- Sign descends when the pit is lowering
- Sign Y tracks `cover.position.y + 0.02` throughout lowering
- `reset()` restores the sign to its initial Y position
