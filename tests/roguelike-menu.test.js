import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoguelikeMenu } from '../src/roguelike-menu.js';

describe('RoguelikeMenu', () => {
  let menu;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    menu = createRoguelikeMenu(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should start closed', () => {
    expect(menu.isOpen()).toBe(false);
  });

  it('should not be visible when closed', () => {
    const overlay = container.querySelector('.roguelike-menu-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should open the menu', () => {
    menu.open();
    expect(menu.isOpen()).toBe(true);
    const overlay = container.querySelector('.roguelike-menu-overlay');
    expect(overlay.style.display).not.toBe('none');
  });

  it('should close the menu', () => {
    menu.open();
    menu.close();
    expect(menu.isOpen()).toBe(false);
    const overlay = container.querySelector('.roguelike-menu-overlay');
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
    const title = container.querySelector('.roguelike-menu-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('PAUSED');
  });

  it('should have a Back to main menu button', () => {
    menu.open();
    const buttons = container.querySelectorAll('.roguelike-menu-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Back to main menu');
  });

  it('should have an Options button', () => {
    menu.open();
    const buttons = container.querySelectorAll('.roguelike-menu-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Options');
  });

  it('should NOT have a Customise button', () => {
    menu.open();
    const buttons = container.querySelectorAll('.roguelike-menu-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).not.toContain('Customise');
  });

  it('should call onBackToMainMenu callback when Back to main menu is clicked', () => {
    let called = false;
    menu.onBackToMainMenu(() => { called = true; });
    menu.open();
    const buttons = container.querySelectorAll('.roguelike-menu-button');
    const backBtn = Array.from(buttons).find(b => b.textContent === 'Back to main menu');
    backBtn.click();
    expect(called).toBe(true);
  });

  it('should call onOptions callback when Options is clicked', () => {
    let called = false;
    menu.onOptions(() => { called = true; });
    menu.open();
    const buttons = container.querySelectorAll('.roguelike-menu-button');
    const optionsBtn = Array.from(buttons).find(b => b.textContent === 'Options');
    optionsBtn.click();
    expect(called).toBe(true);
  });

  it('should have a semi-transparent overlay', () => {
    menu.open();
    const overlay = container.querySelector('.roguelike-menu-overlay');
    const bg = overlay.style.backgroundColor;
    expect(bg).toContain('rgba');
  });
});
