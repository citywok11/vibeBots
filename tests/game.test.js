import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameController } from '../src/game.js';

function makeHomeScreen() {
  let open = false;
  let playCallback = null;
  return {
    isOpen: () => open,
    open: () => { open = true; },
    close: () => { open = false; },
    onPlay: (cb) => { playCallback = cb; },
    triggerPlay: () => { if (playCallback) playCallback(); },
  };
}

function makeMenu() {
  let open = false;
  let exitCallback = null;
  return {
    isOpen: () => open,
    open: () => { open = true; },
    close: () => { open = false; },
    onExit: (cb) => { exitCallback = cb; },
    triggerExit: () => { if (exitCallback) exitCallback(); },
  };
}

describe('createGameController', () => {
  let homeScreen;
  let menu;
  let onStart;
  let onStop;
  let controller;

  beforeEach(() => {
    homeScreen = makeHomeScreen();
    menu = makeMenu();
    onStart = vi.fn();
    onStop = vi.fn();
    controller = createGameController({ homeScreen, menu, onStart, onStop });
  });

  it('should start not running', () => {
    expect(controller.isRunning()).toBe(false);
  });

  it('startGame() sets running to true', () => {
    controller.startGame();
    expect(controller.isRunning()).toBe(true);
  });

  it('startGame() calls onStart callback', () => {
    controller.startGame();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('startGame() closes the home screen', () => {
    homeScreen.open();
    controller.startGame();
    expect(homeScreen.isOpen()).toBe(false);
  });

  it('stopGame() sets running to false', () => {
    controller.startGame();
    controller.stopGame();
    expect(controller.isRunning()).toBe(false);
  });

  it('stopGame() calls onStop callback', () => {
    controller.startGame();
    controller.stopGame();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('stopGame() opens the home screen', () => {
    controller.startGame();
    controller.stopGame();
    expect(homeScreen.isOpen()).toBe(true);
  });

  it('stopGame() closes the pause menu', () => {
    menu.open();
    controller.startGame();
    controller.stopGame();
    expect(menu.isOpen()).toBe(false);
  });

  it('handleEscape() stops the game and opens home screen when running', () => {
    controller.startGame();
    controller.handleEscape();
    expect(controller.isRunning()).toBe(false);
    expect(homeScreen.isOpen()).toBe(true);
  });

  it('handleEscape() calls onStop when running', () => {
    controller.startGame();
    controller.handleEscape();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('handleEscape() does nothing when not running', () => {
    controller.handleEscape();
    expect(controller.isRunning()).toBe(false);
    expect(onStop).not.toHaveBeenCalled();
    expect(homeScreen.isOpen()).toBe(false);
  });

  it('home screen Play button triggers startGame()', () => {
    homeScreen.open();
    homeScreen.triggerPlay();
    expect(controller.isRunning()).toBe(true);
    expect(homeScreen.isOpen()).toBe(false);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('menu Exit button triggers stopGame()', () => {
    controller.startGame();
    menu.triggerExit();
    expect(controller.isRunning()).toBe(false);
    expect(homeScreen.isOpen()).toBe(true);
    expect(onStop).toHaveBeenCalledOnce();
  });
});
