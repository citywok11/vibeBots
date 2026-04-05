export const DEFAULT_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  turnLeft: ['KeyA', 'ArrowLeft'],
  turnRight: ['KeyD', 'ArrowRight'],
  flipper: ['Space'],
};

export function createInputManager(initialBindings) {
  const bindings = {};
  const source = initialBindings || DEFAULT_BINDINGS;
  for (const action in source) {
    bindings[action] = [...source[action]];
  }

  const keysDown = new Set();
  const justPressed = new Set();

  function handleKeyDown(code) {
    if (!keysDown.has(code)) {
      keysDown.add(code);
      justPressed.add(code);
    }
  }

  function handleKeyUp(code) {
    keysDown.delete(code);
    justPressed.delete(code);
  }

  function isPressed(action) {
    const keys = bindings[action];
    if (!keys) return false;
    return keys.some(k => keysDown.has(k));
  }

  function wasJustPressed(action) {
    const keys = bindings[action];
    if (!keys) return false;
    for (const k of keys) {
      if (justPressed.has(k)) {
        justPressed.delete(k);
        return true;
      }
    }
    return false;
  }

  function rebind(action, newKeys) {
    bindings[action] = [...newKeys];
  }

  function getBindings() {
    const result = {};
    for (const action in bindings) {
      result[action] = [...bindings[action]];
    }
    return result;
  }

  function getActions() {
    return Object.keys(bindings);
  }

  function resetToDefaults() {
    for (const action in DEFAULT_BINDINGS) {
      bindings[action] = [...DEFAULT_BINDINGS[action]];
    }
  }

  return {
    handleKeyDown,
    handleKeyUp,
    isPressed,
    wasJustPressed,
    rebind,
    getBindings,
    getActions,
    resetToDefaults,
  };
}
