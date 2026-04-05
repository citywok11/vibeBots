# 005 — Customise Screen: Deselect Components

## What changed

Components in the Customise screen (Model, Wheels, Flipper) now start **deselected by default** and support **toggle deselection**: clicking a highlighted button a second time removes the gold border and clears the selection.

## Behaviour

- **Default state**: all three categories (`model`, `wheels`, `flipper`) start with `null` — no item is highlighted.
- **Select**: click any item button → it gains a gold border and glow (`#ffd700`).
- **Deselect**: click the same item button again → the gold border and glow are removed; `getSelections()` returns `null` for that category.
- Selecting a different button in the same section still deselects the previously-selected button (radio-style within a section, as before).

## API impact

`getSelections()` can now return `null` for any key (previously always returned a string like `'standard'`). Consumers should guard for `null`:

```js
const { model, wheels, flipper } = customiseScreen.getSelections();
if (model) { /* apply model */ }
```

## Files changed

- `src/customise-screen.js` — default `selections` changed to `null`; click handler updated to toggle.
- `tests/customise-screen.test.js` — new tests for deselect toggle and null defaults; updated existing tests to match new default state.
