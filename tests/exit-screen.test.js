import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createExitScreen } from '../src/exit-screen.js';

describe('ExitScreen', () => {
  let exitScreen;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    exitScreen = createExitScreen(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should start closed', () => {
    expect(exitScreen.isOpen()).toBe(false);
  });

  it('should not be visible when closed', () => {
    const overlay = container.querySelector('.exit-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should open the screen', () => {
    exitScreen.open();
    expect(exitScreen.isOpen()).toBe(true);
    const overlay = container.querySelector('.exit-screen-overlay');
    expect(overlay.style.display).not.toBe('none');
  });

  it('should close the screen', () => {
    exitScreen.open();
    exitScreen.close();
    expect(exitScreen.isOpen()).toBe(false);
    const overlay = container.querySelector('.exit-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should display a title', () => {
    exitScreen.open();
    const title = container.querySelector('.exit-screen-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('PLAY');
  });

  it('should have a Sandbox mode button', () => {
    exitScreen.open();
    const buttons = container.querySelectorAll('.exit-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Sandbox mode');
  });

  it('should have an Options button', () => {
    exitScreen.open();
    const buttons = container.querySelectorAll('.exit-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Options');
  });

  it('should have an Exit game button', () => {
    exitScreen.open();
    const buttons = container.querySelectorAll('.exit-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Exit game');
  });

  it('should call onSandboxMode callback when Sandbox mode is clicked', () => {
    let called = false;
    exitScreen.onSandboxMode(() => { called = true; });
    exitScreen.open();
    const buttons = container.querySelectorAll('.exit-screen-button');
    const sandboxBtn = Array.from(buttons).find(b => b.textContent === 'Sandbox mode');
    sandboxBtn.click();
    expect(called).toBe(true);
  });

  it('should call onOptions callback when Options is clicked', () => {
    let called = false;
    exitScreen.onOptions(() => { called = true; });
    exitScreen.open();
    const buttons = container.querySelectorAll('.exit-screen-button');
    const optionsBtn = Array.from(buttons).find(b => b.textContent === 'Options');
    optionsBtn.click();
    expect(called).toBe(true);
  });

  it('should call onExitGame callback when Exit game is clicked', () => {
    let called = false;
    exitScreen.onExitGame(() => { called = true; });
    exitScreen.open();
    const buttons = container.querySelectorAll('.exit-screen-button');
    const exitBtn = Array.from(buttons).find(b => b.textContent === 'Exit game');
    exitBtn.click();
    expect(called).toBe(true);
  });

  it('should have a semi-transparent overlay', () => {
    exitScreen.open();
    const overlay = container.querySelector('.exit-screen-overlay');
    const bg = overlay.style.backgroundColor;
    expect(bg).toContain('rgba');
  });
});
