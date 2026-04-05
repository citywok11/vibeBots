import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createKeyBindingsScreen } from '../src/keybindings-screen.js';
import { createInputManager } from '../src/input.js';

describe('KeyBindingsScreen', () => {
  let container;
  let input;
  let screen;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    input = createInputManager();
    screen = createKeyBindingsScreen(container, input);
  });

  afterEach(() => {
    container.remove();
  });

  it('should start hidden', () => {
    expect(screen.isOpen()).toBe(false);
    const overlay = container.querySelector('.keybindings-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should open and show the screen', () => {
    screen.open();
    expect(screen.isOpen()).toBe(true);
    const overlay = container.querySelector('.keybindings-overlay');
    expect(overlay.style.display).not.toBe('none');
  });

  it('should close the screen', () => {
    screen.open();
    screen.close();
    expect(screen.isOpen()).toBe(false);
  });

  it('should display a title', () => {
    screen.open();
    const title = container.querySelector('.keybindings-title');
    expect(title.textContent).toBe('KEY BINDINGS');
  });

  it('should have a Back button that closes the screen', () => {
    screen.open();
    const backBtn = container.querySelector('.keybindings-back');
    expect(backBtn).not.toBeNull();
    backBtn.click();
    expect(screen.isOpen()).toBe(false);
  });

  it('should call onClose callback when closed', () => {
    let called = false;
    screen.onClose(() => { called = true; });
    screen.open();
    screen.close();
    expect(called).toBe(true);
  });

  it('should dynamically list all actions from the input manager', () => {
    screen.open();
    const rows = container.querySelectorAll('.keybinding-row');
    const actions = input.getActions();
    expect(rows.length).toBe(actions.length);
  });

  it('should display human-readable action labels', () => {
    screen.open();
    const labels = container.querySelectorAll('.keybinding-label');
    const texts = Array.from(labels).map(l => l.textContent);
    // Should convert camelCase to readable: "turnLeft" -> "Turn Left"
    expect(texts).toContain('Forward');
    expect(texts).toContain('Turn Left');
    expect(texts).toContain('Flipper');
  });

  it('should show current key bindings for each action', () => {
    screen.open();
    const bindings = input.getBindings();
    const rows = container.querySelectorAll('.keybinding-row');
    const forwardRow = Array.from(rows).find(r =>
      r.querySelector('.keybinding-label').textContent === 'Forward'
    );
    const keys = forwardRow.querySelectorAll('.keybinding-key');
    expect(keys.length).toBe(bindings.forward.length);
  });

  it('should display human-readable key names', () => {
    screen.open();
    const keys = container.querySelectorAll('.keybinding-key');
    const texts = Array.from(keys).map(k => k.textContent);
    // "KeyW" should display as "W", "ArrowUp" as "Up", "Space" as "Space"
    expect(texts).toContain('W');
    expect(texts).toContain('Up');
    expect(texts).toContain('Space');
  });

  it('should enter listening mode when a key button is clicked', () => {
    screen.open();
    const keyBtn = container.querySelector('.keybinding-key');
    keyBtn.click();
    expect(screen.isListening()).toBe(true);
    expect(keyBtn.textContent).toBe('...');
  });

  it('should rebind the key when a new key is pressed during listening', () => {
    screen.open();
    // Click the first key of "forward" (which is W)
    const rows = container.querySelectorAll('.keybinding-row');
    const forwardRow = Array.from(rows).find(r =>
      r.querySelector('.keybinding-label').textContent === 'Forward'
    );
    const firstKey = forwardRow.querySelector('.keybinding-key');
    firstKey.click();

    // Press a new key
    screen.handleKeyPress('KeyP');

    expect(screen.isListening()).toBe(false);
    expect(firstKey.textContent).toBe('P');
    // Verify the input manager was updated
    expect(input.getBindings().forward).toContain('KeyP');
  });

  it('should cancel listening on Escape without changing the binding', () => {
    screen.open();
    const keyBtn = container.querySelector('.keybinding-key');
    const originalText = keyBtn.textContent;
    keyBtn.click();
    screen.handleKeyPress('Escape');
    expect(screen.isListening()).toBe(false);
    expect(keyBtn.textContent).toBe(originalText);
  });

  it('should automatically pick up new actions added to input manager', () => {
    // Add a new action to the input manager
    input.rebind('selfDestruct', ['KeyX']);
    // Reopen the screen — it should pick up the new action
    screen.open();
    const labels = container.querySelectorAll('.keybinding-label');
    const texts = Array.from(labels).map(l => l.textContent);
    expect(texts).toContain('Self Destruct');
  });

  it('should have a Reset to Defaults button', () => {
    screen.open();
    const resetBtn = container.querySelector('.keybindings-reset');
    expect(resetBtn).not.toBeNull();
  });

  it('should restore default bindings when Reset is clicked', () => {
    input.rebind('forward', ['KeyP']);
    screen.open();
    const resetBtn = container.querySelector('.keybindings-reset');
    resetBtn.click();
    expect(input.getBindings().forward).toContain('KeyW');
    expect(input.getBindings().forward).toContain('ArrowUp');
  });
});
