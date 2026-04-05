import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMenu } from '../src/menu.js';

describe('Menu', () => {
  let menu;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    menu = createMenu(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should start closed', () => {
    expect(menu.isOpen()).toBe(false);
  });

  it('should not be visible when closed', () => {
    const overlay = container.querySelector('.menu-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should open the menu', () => {
    menu.open();
    expect(menu.isOpen()).toBe(true);
    const overlay = container.querySelector('.menu-overlay');
    expect(overlay.style.display).not.toBe('none');
  });

  it('should close the menu', () => {
    menu.open();
    menu.close();
    expect(menu.isOpen()).toBe(false);
    const overlay = container.querySelector('.menu-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should toggle the menu', () => {
    menu.toggle();
    expect(menu.isOpen()).toBe(true);
    menu.toggle();
    expect(menu.isOpen()).toBe(false);
  });

  it('should display a title', () => {
    menu.open();
    const title = container.querySelector('.menu-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('PAUSED');
  });

  it('should have a Key Bindings button', () => {
    menu.open();
    const buttons = container.querySelectorAll('.menu-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Key Bindings');
  });

  it('should have a Resume button', () => {
    menu.open();
    const buttons = container.querySelectorAll('.menu-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Resume');
  });

  it('should close the menu when Resume is clicked', () => {
    menu.open();
    const buttons = container.querySelectorAll('.menu-button');
    const resumeBtn = Array.from(buttons).find(b => b.textContent === 'Resume');
    resumeBtn.click();
    expect(menu.isOpen()).toBe(false);
  });

  it('should call onKeyBindings callback when Key Bindings is clicked', () => {
    let called = false;
    menu.onKeyBindings(() => { called = true; });
    menu.open();
    const buttons = container.querySelectorAll('.menu-button');
    const kbBtn = Array.from(buttons).find(b => b.textContent === 'Key Bindings');
    kbBtn.click();
    expect(called).toBe(true);
  });

  it('should have a semi-transparent overlay', () => {
    menu.open();
    const overlay = container.querySelector('.menu-overlay');
    const bg = overlay.style.backgroundColor;
    expect(bg).toContain('rgba');
  });
});
