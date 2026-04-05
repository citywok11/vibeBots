import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createCustomiseScreen } from '../src/customise-screen.js';

describe('CustomiseScreen', () => {
  let screen;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    screen = createCustomiseScreen(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should start closed', () => {
    expect(screen.isOpen()).toBe(false);
  });

  it('should not be visible when closed', () => {
    const overlay = container.querySelector('.customise-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should open the screen', () => {
    screen.open();
    expect(screen.isOpen()).toBe(true);
    const overlay = container.querySelector('.customise-screen-overlay');
    expect(overlay.style.display).not.toBe('none');
  });

  it('should close the screen', () => {
    screen.open();
    screen.close();
    expect(screen.isOpen()).toBe(false);
    const overlay = container.querySelector('.customise-screen-overlay');
    expect(overlay.style.display).toBe('none');
  });

  it('should display CUSTOMISE title', () => {
    screen.open();
    const title = container.querySelector('.customise-screen-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('CUSTOMISE');
  });

  it('should have a MODEL section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-model');
    expect(section).not.toBeNull();
    const heading = section.querySelector('.customise-section-title');
    expect(heading.textContent).toBe('MODEL');
  });

  it('should have a WHEELS section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    expect(section).not.toBeNull();
    const heading = section.querySelector('.customise-section-title');
    expect(heading.textContent).toBe('WHEELS');
  });

  it('should have a FLIPPER section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-flipper');
    expect(section).not.toBeNull();
    const heading = section.querySelector('.customise-section-title');
    expect(heading.textContent).toBe('FLIPPER');
  });

  it('should have a FLAMETHROWER section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-flamethrower');
    expect(section).not.toBeNull();
    const heading = section.querySelector('.customise-section-title');
    expect(heading.textContent).toBe('FLAMETHROWER');
  });

  it('should show at least one item button in each section', () => {
    screen.open();
    ['model', 'wheels', 'flipper', 'flamethrower', 'machineGun'].forEach(key => {
      const section = container.querySelector(`.customise-section-${key}`);
      const buttons = section.querySelectorAll('.customise-item-button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  it('should start with model selected and other sections unselected', () => {
    const sel = screen.getSelections();
    expect(sel.model).toBe('standard');
    expect(sel.wheels).toBeNull();
    expect(sel.flipper).toBeNull();
  });

  it('should highlight the model item button by default (model is always selected)', () => {
    screen.open();
    const modelSection = container.querySelector('.customise-section-model');
    const modelBtn = modelSection.querySelector('.customise-item-button');
    expect(modelBtn.style.borderColor).toBe('rgb(255, 215, 0)');
    ['wheels', 'flipper', 'flamethrower', 'machineGun'].forEach(key => {
      const section = container.querySelector(`.customise-section-${key}`);
      const buttons = section.querySelectorAll('.customise-item-button');
      buttons.forEach(btn => {
        expect(btn.style.borderColor).not.toBe('rgb(255, 215, 0)');
      });
    });
  });

  it('should select item with gold border when clicked', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const btn = section.querySelector('.customise-item-button');
    btn.click();
    expect(btn.style.borderColor).toBe('rgb(255, 215, 0)');
    expect(screen.getSelections().wheels).toBe(btn.dataset.itemId);
  });

  it('should deselect item when clicked again (toggle off)', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const btn = section.querySelector('.customise-item-button');
    btn.click();
    expect(btn.style.borderColor).toBe('rgb(255, 215, 0)');
    btn.click();
    expect(btn.style.borderColor).not.toBe('rgb(255, 215, 0)');
    expect(screen.getSelections().wheels).toBeNull();
  });

  it('should not deselect model when clicked again (model is required)', () => {
    screen.open();
    const section = container.querySelector('.customise-section-model');
    const btn = section.querySelector('.customise-item-button');
    // model starts selected — clicking it again must keep it selected
    btn.click();
    expect(btn.style.borderColor).toBe('rgb(255, 215, 0)');
    expect(screen.getSelections().model).toBe('standard');
  });

  it('should set selection to null in getSelections when item is deselected', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const btn = section.querySelector('.customise-item-button');
    btn.click();
    btn.click();
    expect(screen.getSelections().wheels).toBeNull();
  });

  it('should update selection and highlight when an item button is clicked', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const btn = section.querySelector('.customise-item-button');
    btn.click();
    expect(btn.style.borderColor).toBe('rgb(255, 215, 0)');
    expect(screen.getSelections().wheels).toBe(btn.dataset.itemId);
  });

  it('should have a Back button', () => {
    screen.open();
    const backBtn = container.querySelector('.customise-back-button');
    expect(backBtn).not.toBeNull();
    expect(backBtn.textContent).toBe('Back');
  });

  it('should call onClose callback when Back is clicked', () => {
    let called = false;
    screen.onClose(() => { called = true; });
    screen.open();
    const backBtn = container.querySelector('.customise-back-button');
    backBtn.click();
    expect(called).toBe(true);
  });

  it('should return current selections via getSelections', () => {
    const sel = screen.getSelections();
    expect(sel).toHaveProperty('model');
    expect(sel).toHaveProperty('wheels');
    expect(sel).toHaveProperty('flipper');
    expect(sel).toHaveProperty('flamethrower');
    expect(sel).toHaveProperty('machineGun');
  });

  it('should return a copy from getSelections (not internal reference)', () => {
    const sel = screen.getSelections();
    sel.model = 'something-else';
    expect(screen.getSelections().model).toBe('standard');
  });

  it('should have a semi-transparent overlay background', () => {
    screen.open();
    const overlay = container.querySelector('.customise-screen-overlay');
    expect(overlay.style.backgroundColor).toContain('rgba');
  });

  it('should show 3 item buttons in the MODEL section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-model');
    const buttons = section.querySelectorAll('.customise-item-button');
    expect(buttons.length).toBe(3);
  });

  it('should show 3 item buttons in the WHEELS section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const buttons = section.querySelectorAll('.customise-item-button');
    expect(buttons.length).toBe(3);
  });

  it('should show 3 item buttons in the FLIPPER section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-flipper');
    const buttons = section.querySelectorAll('.customise-item-button');
    expect(buttons.length).toBe(3);
  });

  it('model section should contain buttons for standard, wedge and heavy', () => {
    screen.open();
    const section = container.querySelector('.customise-section-model');
    const ids = Array.from(section.querySelectorAll('.customise-item-button')).map(b => b.dataset.itemId);
    expect(ids).toContain('standard');
    expect(ids).toContain('wedge');
    expect(ids).toContain('heavy');
  });

  it('wheels section should contain buttons for standard, offroad and racing', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const ids = Array.from(section.querySelectorAll('.customise-item-button')).map(b => b.dataset.itemId);
    expect(ids).toContain('standard');
    expect(ids).toContain('offroad');
    expect(ids).toContain('racing');
  });

  it('flipper section should contain buttons for standard, heavy and light', () => {
    screen.open();
    const section = container.querySelector('.customise-section-flipper');
    const ids = Array.from(section.querySelectorAll('.customise-item-button')).map(b => b.dataset.itemId);
    expect(ids).toContain('standard');
    expect(ids).toContain('heavy');
    expect(ids).toContain('light');
  });

  it('selecting the wedge model should update selections.model to wedge', () => {
    screen.open();
    const section = container.querySelector('.customise-section-model');
    const wedgeBtn = Array.from(section.querySelectorAll('.customise-item-button'))
      .find(b => b.dataset.itemId === 'wedge');
    wedgeBtn.click();
    expect(screen.getSelections().model).toBe('wedge');
  });

  it('selecting offroad wheels should update selections.wheels to offroad', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const btn = Array.from(section.querySelectorAll('.customise-item-button'))
      .find(b => b.dataset.itemId === 'offroad');
    btn.click();
    expect(screen.getSelections().wheels).toBe('offroad');
  });

  it('selecting racing wheels should update selections.wheels to racing', () => {
    screen.open();
    const section = container.querySelector('.customise-section-wheels');
    const btn = Array.from(section.querySelectorAll('.customise-item-button'))
      .find(b => b.dataset.itemId === 'racing');
    btn.click();
    expect(screen.getSelections().wheels).toBe('racing');
  });

  it('selecting heavy flipper should update selections.flipper to heavy', () => {
    screen.open();
    const section = container.querySelector('.customise-section-flipper');
    const btn = Array.from(section.querySelectorAll('.customise-item-button'))
      .find(b => b.dataset.itemId === 'heavy');
    btn.click();
    expect(screen.getSelections().flipper).toBe('heavy');
  });

  it('should have a BOT AI section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-botAI');
    expect(section).not.toBeNull();
    const heading = section.querySelector('.customise-section-title');
    expect(heading.textContent).toBe('BOT AI');
  });

  it('should default botAI to false in getSelections', () => {
    expect(screen.getSelections().botAI).toBe(false);
  });

  it('should have a bot AI toggle button', () => {
    screen.open();
    const btn = container.querySelector('.customise-bot-ai-button');
    expect(btn).not.toBeNull();
  });

  it('should show OFF text when bot AI is disabled', () => {
    screen.open();
    const btn = container.querySelector('.customise-bot-ai-button');
    expect(btn.textContent).toBe('OFF');
  });

  it('should toggle botAI to true when clicked', () => {
    screen.open();
    const btn = container.querySelector('.customise-bot-ai-button');
    btn.click();
    expect(screen.getSelections().botAI).toBe(true);
    expect(btn.textContent).toBe('ON');
  });

  it('should toggle botAI back to false when clicked twice', () => {
    screen.open();
    const btn = container.querySelector('.customise-bot-ai-button');
    btn.click();
    btn.click();
    expect(screen.getSelections().botAI).toBe(false);
    expect(btn.textContent).toBe('OFF');
  });

  it('should highlight bot AI button with gold border when enabled', () => {
    screen.open();
    const btn = container.querySelector('.customise-bot-ai-button');
    btn.click();
    expect(btn.style.borderColor).toBe('rgb(255, 215, 0)');
  });

  it('should remove gold border from bot AI button when disabled', () => {
    screen.open();
    const btn = container.querySelector('.customise-bot-ai-button');
    btn.click();
    btn.click();
    expect(btn.style.borderColor).not.toBe('rgb(255, 215, 0)');
  });

  it('should have a MACHINE GUN section', () => {
    screen.open();
    const section = container.querySelector('.customise-section-machineGun');
    expect(section).not.toBeNull();
    const heading = section.querySelector('.customise-section-title');
    expect(heading.textContent).toBe('MACHINE GUN');
  });

  it('should start with machineGun unselected', () => {
    const sel = screen.getSelections();
    expect(sel.machineGun).toBeNull();
  });

  it('should select machine gun with gold border when clicked', () => {
    screen.open();
    const section = container.querySelector('.customise-section-machineGun');
    const btn = section.querySelector('.customise-item-button');
    btn.click();
    expect(btn.style.borderColor).toBe('rgb(255, 215, 0)');
    expect(screen.getSelections().machineGun).toBe(btn.dataset.itemId);
  });

  it('should deselect machine gun when clicked again (toggle off)', () => {
    screen.open();
    const section = container.querySelector('.customise-section-machineGun');
    const btn = section.querySelector('.customise-item-button');
    btn.click();
    btn.click();
    expect(btn.style.borderColor).not.toBe('rgb(255, 215, 0)');
    expect(screen.getSelections().machineGun).toBeNull();
  });

  it('machine gun section should contain a button for standard', () => {
    screen.open();
    const section = container.querySelector('.customise-section-machineGun');
    const ids = Array.from(section.querySelectorAll('.customise-item-button')).map(b => b.dataset.itemId);
    expect(ids).toContain('standard');
  });
});
