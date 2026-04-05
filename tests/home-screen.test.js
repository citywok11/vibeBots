import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHomeScreen } from '../src/home-screen.js';

describe('HomeScreen', () => {
  let screen;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    screen = createHomeScreen(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should start closed', () => {
    expect(screen.isOpen()).toBe(false);
  });

  it('should not be visible when closed', () => {
    const overlay = container.querySelector('.home-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should open the screen', () => {
    screen.open();
    expect(screen.isOpen()).toBe(true);
    const overlay = container.querySelector('.home-screen-overlay');
    expect(overlay.style.display).not.toBe('none');
  });

  it('should close the screen', () => {
    screen.open();
    screen.close();
    expect(screen.isOpen()).toBe(false);
    const overlay = container.querySelector('.home-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should display a title', () => {
    screen.open();
    const title = container.querySelector('.home-screen-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('VIBE BOTS');
  });

  it('should have a Sandbox Mode button', () => {
    screen.open();
    const buttons = container.querySelectorAll('.home-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Sandbox Mode');
  });

  it('should have an Options button', () => {
    screen.open();
    const buttons = container.querySelectorAll('.home-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Options');
  });

  it('should have an Exit button', () => {
    screen.open();
    const buttons = container.querySelectorAll('.home-screen-button');
    const labels = Array.from(buttons).map(b => b.textContent);
    expect(labels).toContain('Exit');
  });

  it('should call onPlay callback when Sandbox Mode is clicked', () => {
    let called = false;
    screen.onPlay(() => { called = true; });
    screen.open();
    const buttons = container.querySelectorAll('.home-screen-button');
    const playBtn = Array.from(buttons).find(b => b.textContent === 'Sandbox Mode');
    playBtn.click();
    expect(called).toBe(true);
  });

  it('should call onOptions callback when Options is clicked', () => {
    let called = false;
    screen.onOptions(() => { called = true; });
    screen.open();
    const buttons = container.querySelectorAll('.home-screen-button');
    const optionsBtn = Array.from(buttons).find(b => b.textContent === 'Options');
    optionsBtn.click();
    expect(called).toBe(true);
  });

  it('should call onExit callback when Exit is clicked', () => {
    let called = false;
    screen.onExit(() => { called = true; });
    screen.open();
    const buttons = container.querySelectorAll('.home-screen-button');
    const exitBtn = Array.from(buttons).find(b => b.textContent === 'Exit');
    exitBtn.click();
    expect(called).toBe(true);
  });

  it('should have a semi-transparent overlay', () => {
    screen.open();
    const overlay = container.querySelector('.home-screen-overlay');
    const bg = overlay.style.backgroundColor;
    expect(bg).toContain('rgba');
  });
});
