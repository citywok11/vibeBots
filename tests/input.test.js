import { describe, it, expect, beforeEach } from 'vitest';
import { createInputManager, DEFAULT_BINDINGS } from '../src/input.js';

describe('InputManager', () => {
  let input;

  beforeEach(() => {
    input = createInputManager();
  });

  it('should have default key bindings', () => {
    const bindings = input.getBindings();
    expect(bindings.forward).toBeDefined();
    expect(bindings.backward).toBeDefined();
    expect(bindings.turnLeft).toBeDefined();
    expect(bindings.turnRight).toBeDefined();
    expect(bindings.flipper).toBeDefined();
  });

  it('should have each action bound to an array of key codes', () => {
    const bindings = input.getBindings();
    Object.values(bindings).forEach(keys => {
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  it('should report no actions pressed initially', () => {
    expect(input.isPressed('forward')).toBe(false);
    expect(input.isPressed('backward')).toBe(false);
    expect(input.isPressed('turnLeft')).toBe(false);
    expect(input.isPressed('turnRight')).toBe(false);
    expect(input.isPressed('flipper')).toBe(false);
  });

  it('should detect key press for default bindings', () => {
    input.handleKeyDown('KeyW');
    expect(input.isPressed('forward')).toBe(true);

    input.handleKeyDown('ArrowUp');
    expect(input.isPressed('forward')).toBe(true);
  });

  it('should detect key release', () => {
    input.handleKeyDown('KeyW');
    expect(input.isPressed('forward')).toBe(true);
    input.handleKeyUp('KeyW');
    expect(input.isPressed('forward')).toBe(false);
  });

  it('should remain pressed if one of multiple bindings is still held', () => {
    input.handleKeyDown('KeyW');
    input.handleKeyDown('ArrowUp');
    input.handleKeyUp('KeyW');
    expect(input.isPressed('forward')).toBe(true);
  });

  it('should allow rebinding an action', () => {
    input.rebind('forward', ['KeyI', 'KeyU']);
    expect(input.getBindings().forward).toEqual(['KeyI', 'KeyU']);

    input.handleKeyDown('KeyW');
    expect(input.isPressed('forward')).toBe(false);

    input.handleKeyDown('KeyI');
    expect(input.isPressed('forward')).toBe(true);
  });

  it('should allow rebinding a single key for an action', () => {
    input.rebind('flipper', ['KeyF']);
    input.handleKeyDown('KeyF');
    expect(input.isPressed('flipper')).toBe(true);

    // Old binding should no longer work
    input.handleKeyUp('KeyF');
    input.handleKeyDown('Space');
    expect(input.isPressed('flipper')).toBe(false);
  });

  it('should support wasJustPressed for one-shot actions', () => {
    input.handleKeyDown('Space');
    expect(input.wasJustPressed('flipper')).toBe(true);
    // Second call should return false (consumed)
    expect(input.wasJustPressed('flipper')).toBe(false);
  });

  it('should reset justPressed on key up and re-trigger on next press', () => {
    input.handleKeyDown('Space');
    input.wasJustPressed('flipper'); // consume
    input.handleKeyUp('Space');
    input.handleKeyDown('Space');
    expect(input.wasJustPressed('flipper')).toBe(true);
  });

  it('should accept custom bindings at creation', () => {
    const custom = createInputManager({
      forward: ['KeyI'],
      backward: ['KeyK'],
      turnLeft: ['KeyJ'],
      turnRight: ['KeyL'],
      flipper: ['KeyO'],
    });

    custom.handleKeyDown('KeyI');
    expect(custom.isPressed('forward')).toBe(true);

    // Old default binding should not work
    custom.handleKeyUp('KeyI');
    custom.handleKeyDown('KeyW');
    expect(custom.isPressed('forward')).toBe(false);
  });

  it('should export DEFAULT_BINDINGS', () => {
    expect(DEFAULT_BINDINGS.forward).toContain('KeyW');
    expect(DEFAULT_BINDINGS.forward).toContain('ArrowUp');
    expect(DEFAULT_BINDINGS.backward).toContain('KeyS');
    expect(DEFAULT_BINDINGS.turnLeft).toContain('KeyA');
    expect(DEFAULT_BINDINGS.turnRight).toContain('KeyD');
    expect(DEFAULT_BINDINGS.flipper).toContain('Space');
  });

  it('should return all action names', () => {
    const actions = input.getActions();
    expect(actions).toContain('forward');
    expect(actions).toContain('backward');
    expect(actions).toContain('turnLeft');
    expect(actions).toContain('turnRight');
    expect(actions).toContain('flipper');
  });

  it('should reset all bindings to defaults', () => {
    input.rebind('forward', ['KeyP']);
    input.rebind('flipper', ['KeyO']);
    input.resetToDefaults();
    expect(input.getBindings().forward).toEqual(['KeyW', 'ArrowUp']);
    expect(input.getBindings().flipper).toEqual(['Space']);
  });

  it('should preserve non-default actions after reset', () => {
    input.rebind('selfDestruct', ['KeyX']);
    input.resetToDefaults();
    // Custom action should remain with its binding
    expect(input.getBindings().selfDestruct).toEqual(['KeyX']);
  });
});
