import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createOptionsScreen } from '../src/options-screen.js';

describe('OptionsScreen', () => {
  let screen;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    screen = createOptionsScreen(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should start hidden', () => {
    expect(screen.isOpen()).toBe(false);
    const overlay = container.querySelector('.options-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should open and show the screen', () => {
    screen.open();
    expect(screen.isOpen()).toBe(true);
    const overlay = container.querySelector('.options-screen-overlay');
    expect(overlay.style.display).not.toBe('none');
  });

  it('should close the screen', () => {
    screen.open();
    screen.close();
    expect(screen.isOpen()).toBe(false);
    const overlay = container.querySelector('.options-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should display a title', () => {
    screen.open();
    const title = container.querySelector('.options-screen-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('OPTIONS');
  });

  it('should have a Key Bindings button', () => {
    screen.open();
    const buttons = container.querySelectorAll('.options-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Key Bindings');
  });

  it('should have a Back button', () => {
    screen.open();
    const buttons = container.querySelectorAll('.options-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Back');
  });

  it('should call onKeyBindings callback when Key Bindings is clicked', () => {
    let called = false;
    screen.onKeyBindings(() => { called = true; });
    screen.open();
    const buttons = container.querySelectorAll('.options-screen-button');
    const kbBtn = Array.from(buttons).find(b => b.textContent === 'Key Bindings');
    kbBtn.click();
    expect(called).toBe(true);
  });

  it('should close and call onBack callback when Back is clicked', () => {
    let called = false;
    screen.onBack(() => { called = true; });
    screen.open();
    const buttons = container.querySelectorAll('.options-screen-button');
    const backBtn = Array.from(buttons).find(b => b.textContent === 'Back');
    backBtn.click();
    expect(called).toBe(true);
    expect(screen.isOpen()).toBe(false);
  });

  it('should have a semi-transparent overlay', () => {
    screen.open();
    const overlay = container.querySelector('.options-screen-overlay');
    const bg = overlay.style.backgroundColor;
    expect(bg).toContain('rgba');
  });
});
