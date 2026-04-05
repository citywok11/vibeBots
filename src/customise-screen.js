import { MODEL_CATALOGUE, WHEEL_CATALOGUE, FLIPPER_CATALOGUE } from './car.js';

const CATALOGUE = {
  models: MODEL_CATALOGUE,
  wheels: WHEEL_CATALOGUE,
  flippers: FLIPPER_CATALOGUE,
  flamethrowers: [{ id: 'standard', label: 'Standard' }],
};

function createModelVisual(item) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; width: 70px; height: 70px;';

  const colors = { standard: '#ff4444', wedge: '#ff8800', heavy: '#4488ff' };
  const bodyColor = colors[item.id] || '#ff4444';

  if (item.id === 'wedge') {
    // Wide, flat shape
    ['7', '53'].forEach(left => {
      const w = document.createElement('div');
      w.style.cssText = `position: absolute; top: 14px; left: ${left}px; width: 9px; height: 9px; background: #222; border-radius: 50%; border: 1px solid #555;`;
      wrap.appendChild(w);
    });
    [{ top: 48, left: 7 }, { top: 48, left: 53 }].forEach(pos => {
      const w = document.createElement('div');
      w.style.cssText = `position: absolute; top: ${pos.top}px; left: ${pos.left}px; width: 9px; height: 9px; background: #222; border-radius: 50%; border: 1px solid #555;`;
      wrap.appendChild(w);
    });
    const body = document.createElement('div');
    body.style.cssText = `position: absolute; top: 18px; left: 10px; width: 50px; height: 28px; background: ${bodyColor}; border-radius: 2px;`;
    wrap.appendChild(body);
  } else if (item.id === 'heavy') {
    // Tall, wide shape
    ['5', '55'].forEach(left => {
      const w = document.createElement('div');
      w.style.cssText = `position: absolute; top: 8px; left: ${left}px; width: 10px; height: 10px; background: #222; border-radius: 50%; border: 1px solid #555;`;
      wrap.appendChild(w);
    });
    [{ top: 50, left: 5 }, { top: 50, left: 55 }].forEach(pos => {
      const w = document.createElement('div');
      w.style.cssText = `position: absolute; top: ${pos.top}px; left: ${pos.left}px; width: 10px; height: 10px; background: #222; border-radius: 50%; border: 1px solid #555;`;
      wrap.appendChild(w);
    });
    const body = document.createElement('div');
    body.style.cssText = `position: absolute; top: 10px; left: 13px; width: 44px; height: 50px; background: ${bodyColor}; border-radius: 2px;`;
    wrap.appendChild(body);
  } else {
    // Standard: default layout
    const wheelPositions = [
      { top: 10, left: 7 },
      { top: 10, left: 53 },
      { top: 48, left: 7 },
      { top: 48, left: 53 },
    ];
    wheelPositions.forEach(pos => {
      const w = document.createElement('div');
      w.style.cssText = `position: absolute; top: ${pos.top}px; left: ${pos.left}px; width: 10px; height: 10px; background: #222; border-radius: 50%; border: 1px solid #555;`;
      wrap.appendChild(w);
    });
    const body = document.createElement('div');
    body.style.cssText = `position: absolute; top: 14px; left: 14px; width: 42px; height: 38px; background: ${bodyColor}; border-radius: 2px;`;
    wrap.appendChild(body);
    const flipperEl = document.createElement('div');
    flipperEl.style.cssText = `position: absolute; top: 10px; left: 14px; width: 42px; height: 5px; background: #ccc; border-radius: 1px;`;
    wrap.appendChild(flipperEl);
  }

  return wrap;
}

function createWheelVisual(item) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;';

  const sizes = { standard: 46, offroad: 56, racing: 34 };
  const colors = { standard: '#2a2a2a', offroad: '#1a2a10', racing: '#2a2a00' };
  const borderColors = { standard: '#444', offroad: '#3a5a20', racing: '#888800' };
  const size = sizes[item.id] || 46;
  const bg = colors[item.id] || '#2a2a2a';
  const border = borderColors[item.id] || '#444';

  const wheel = document.createElement('div');
  wheel.style.cssText = `position: relative; width: ${size}px; height: ${size}px; background: ${bg}; border-radius: 50%; border: 5px solid ${border}; display: flex; align-items: center; justify-content: center;`;

  const hub = document.createElement('div');
  hub.style.cssText = 'width: 10px; height: 10px; background: #888; border-radius: 50%;';
  wheel.appendChild(hub);
  wrap.appendChild(wheel);

  return wrap;
}

function createFlipperVisual(item) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;';

  const widths = { standard: 58, heavy: 58, light: 44 };
  const rampHeights = { standard: 12, heavy: 18, light: 8 };
  const colors = { standard: '#ccc', heavy: '#888', light: '#eee' };
  const w = widths[item.id] || 58;
  const rh = rampHeights[item.id] || 12;
  const color = colors[item.id] || '#ccc';

  const outer = document.createElement('div');
  outer.style.cssText = `position: relative; width: ${w}px; height: ${rh + 10}px;`;

  const base = document.createElement('div');
  base.style.cssText = `position: absolute; bottom: 0; left: 0; width: ${w}px; height: 10px; background: ${color}; border-radius: 1px 1px 2px 2px;`;

  const ramp = document.createElement('div');
  ramp.style.cssText = `
    position: absolute;
    bottom: 10px;
    right: 0;
    width: 0;
    height: 0;
    border-left: ${w}px solid transparent;
    border-bottom: ${rh}px solid ${color};
  `;

  outer.appendChild(ramp);
  outer.appendChild(base);
  wrap.appendChild(outer);

  return wrap;
}

function createFlamethrowerVisual(_item) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;';

  const outer = document.createElement('div');
  outer.style.cssText = 'position: relative; width: 62px; height: 22px;';

  // Barrel body
  const barrel = document.createElement('div');
  barrel.style.cssText = 'position: absolute; bottom: 6px; left: 0; width: 44px; height: 10px; background: #666; border-radius: 2px;';

  // Nozzle tip
  const nozzle = document.createElement('div');
  nozzle.style.cssText = 'position: absolute; bottom: 8px; left: 44px; width: 8px; height: 6px; background: #888; border-radius: 1px;';

  // Flame burst using CSS gradient cone shape
  const flameBurst = document.createElement('div');
  flameBurst.style.cssText = `
    position: absolute;
    bottom: 4px;
    left: 52px;
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-left: 12px solid #ff6600;
  `;

  outer.appendChild(barrel);
  outer.appendChild(nozzle);
  outer.appendChild(flameBurst);
  wrap.appendChild(outer);

  return wrap;
}

function createItemButton(item, isSelected, visualFactory) {
  const btn = document.createElement('button');
  btn.className = 'customise-item-button';
  btn.dataset.itemId = item.id;
  btn.title = item.label;
  btn.style.cssText = `
    width: 90px;
    height: 90px;
    background: #2a2a3e;
    border-width: 3px;
    border-style: solid;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    box-sizing: border-box;
  `;
  btn.style.borderColor = isSelected ? '#ffd700' : '#444';
  if (isSelected) btn.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.45)';
  btn.appendChild(visualFactory(item));
  return btn;
}

function createSection(sectionTitle, items, selectionKey, selections, visualFactory, options = {}) {
  const { allowDeselect = true } = options;
  const section = document.createElement('div');
  section.className = `customise-section customise-section-${selectionKey}`;
  section.style.cssText = 'margin-bottom: 28px;';

  const heading = document.createElement('h2');
  heading.className = 'customise-section-title';
  heading.textContent = sectionTitle.toUpperCase();
  heading.style.cssText = `
    margin: 0 0 12px 0;
    font-size: 13px;
    letter-spacing: 3px;
    color: #aaa;
  `;
  section.appendChild(heading);

  const row = document.createElement('div');
  row.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

  items.forEach(item => {
    const btn = createItemButton(item, selections[selectionKey] === item.id, visualFactory);

    btn.addEventListener('mouseenter', () => {
      if (selections[selectionKey] !== item.id) {
        btn.style.borderColor = '#888';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (selections[selectionKey] !== item.id) {
        btn.style.borderColor = '#444';
      }
    });
    btn.addEventListener('click', () => {
      const alreadySelected = selections[selectionKey] === item.id;
      row.querySelectorAll('.customise-item-button').forEach(b => {
        b.style.borderColor = '#444';
        b.style.boxShadow = '';
      });
      if (alreadySelected && !allowDeselect) {
        // Section requires a selection — keep the item selected
        btn.style.borderColor = '#ffd700';
        btn.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.45)';
      } else if (alreadySelected) {
        selections[selectionKey] = null;
      } else {
        selections[selectionKey] = item.id;
        btn.style.borderColor = '#ffd700';
        btn.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.45)';
      }
    });

    row.appendChild(btn);
  });

  section.appendChild(row);
  return section;
}

export function createCustomiseScreen(container) {
  let open = false;
  let closeCallback = null;

  const selections = {
    model: 'standard',
    wheels: null,
    flipper: null,
    flamethrower: null,
    botAI: false,
  };

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'customise-screen-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.82);
    z-index: 200;
    justify-content: center;
    align-items: center;
    overflow-y: auto;
  `;

  // Panel
  const panel = document.createElement('div');
  panel.className = 'customise-screen-panel';
  panel.style.cssText = `
    background: #1a1a2e;
    border: 2px solid #555;
    border-radius: 8px;
    padding: 40px;
    min-width: 360px;
    max-width: 560px;
    font-family: monospace;
    color: #fff;
  `;

  // Title
  const title = document.createElement('h1');
  title.className = 'customise-screen-title';
  title.textContent = 'CUSTOMISE';
  title.style.cssText = `
    margin: 0 0 32px 0;
    font-size: 28px;
    letter-spacing: 4px;
    color: #ff4444;
    text-align: center;
  `;
  panel.appendChild(title);

  panel.appendChild(createSection('Model', CATALOGUE.models, 'model', selections, createModelVisual, { allowDeselect: false }));
  panel.appendChild(createSection('Wheels', CATALOGUE.wheels, 'wheels', selections, createWheelVisual));
  panel.appendChild(createSection('Flipper', CATALOGUE.flippers, 'flipper', selections, createFlipperVisual));
  panel.appendChild(createSection('Flamethrower', CATALOGUE.flamethrowers, 'flamethrower', selections, createFlamethrowerVisual));

  // Bot AI toggle
  const aiSection = document.createElement('div');
  aiSection.className = 'customise-section customise-section-botAI';
  aiSection.style.cssText = 'margin-bottom: 28px;';

  const aiHeading = document.createElement('h2');
  aiHeading.className = 'customise-section-title';
  aiHeading.textContent = 'BOT AI';
  aiHeading.style.cssText = `
    margin: 0 0 12px 0;
    font-size: 13px;
    letter-spacing: 3px;
    color: #aaa;
  `;
  aiSection.appendChild(aiHeading);

  const aiBtn = document.createElement('button');
  aiBtn.className = 'customise-bot-ai-button';
  aiBtn.style.cssText = `
    padding: 10px 24px;
    font-family: monospace;
    font-size: 14px;
    background: #2a2a3e;
    color: #fff;
    border-width: 3px;
    border-style: solid;
    border-radius: 8px;
    cursor: pointer;
  `;

  function updateAIButton() {
    aiBtn.textContent = selections.botAI ? 'ON' : 'OFF';
    aiBtn.style.borderColor = selections.botAI ? '#ffd700' : '#444';
    aiBtn.style.boxShadow = selections.botAI ? '0 0 12px rgba(255, 215, 0, 0.45)' : '';
  }
  updateAIButton();

  aiBtn.addEventListener('click', () => {
    selections.botAI = !selections.botAI;
    updateAIButton();
  });

  aiSection.appendChild(aiBtn);
  panel.appendChild(aiSection);

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'customise-back-button';
  backBtn.textContent = 'Back';
  backBtn.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px 24px;
    margin-top: 10px;
    font-family: monospace;
    font-size: 16px;
    background: #333;
    color: #fff;
    border: 1px solid #666;
    border-radius: 4px;
    cursor: pointer;
  `;
  backBtn.addEventListener('mouseenter', () => { backBtn.style.background = '#ff4444'; });
  backBtn.addEventListener('mouseleave', () => { backBtn.style.background = '#333'; });
  backBtn.addEventListener('click', () => {
    if (closeCallback) closeCallback();
  });
  panel.appendChild(backBtn);

  overlay.appendChild(panel);
  container.appendChild(overlay);

  function openScreen() {
    open = true;
    overlay.style.display = 'flex';
  }

  function closeScreen() {
    open = false;
    overlay.style.display = 'none';
  }

  function isOpen() {
    return open;
  }

  function onClose(cb) {
    closeCallback = cb;
  }

  function getSelections() {
    return { ...selections };
  }

  return { open: openScreen, close: closeScreen, isOpen, onClose, getSelections };
}
