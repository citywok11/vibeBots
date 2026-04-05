const CATALOGUE = {
  models: [{ id: 'standard', label: 'Standard' }],
  wheels: [{ id: 'standard', label: 'Standard' }],
  flippers: [{ id: 'standard', label: 'Standard' }],
};

function createModelVisual() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; width: 70px; height: 70px;';

  // 4 wheels
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

  // Body
  const body = document.createElement('div');
  body.style.cssText = 'position: absolute; top: 14px; left: 14px; width: 42px; height: 38px; background: #ff4444; border-radius: 2px;';
  wrap.appendChild(body);

  // Flipper at front
  const flipper = document.createElement('div');
  flipper.style.cssText = 'position: absolute; top: 10px; left: 14px; width: 42px; height: 5px; background: #ccc; border-radius: 1px;';
  wrap.appendChild(flipper);

  return wrap;
}

function createWheelVisual() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;';

  const wheel = document.createElement('div');
  wheel.style.cssText = 'position: relative; width: 46px; height: 46px; background: #2a2a2a; border-radius: 50%; border: 5px solid #444; display: flex; align-items: center; justify-content: center;';

  const hub = document.createElement('div');
  hub.style.cssText = 'width: 10px; height: 10px; background: #888; border-radius: 50%;';
  wheel.appendChild(hub);
  wrap.appendChild(wheel);

  return wrap;
}

function createFlipperVisual() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position: relative; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center;';

  const outer = document.createElement('div');
  outer.style.cssText = 'position: relative; width: 58px; height: 20px;';

  // Flipper wedge drawn using two divs: a body and a slanted top edge overlay
  const base = document.createElement('div');
  base.style.cssText = 'position: absolute; bottom: 0; left: 0; width: 58px; height: 10px; background: #ccc; border-radius: 1px 1px 2px 2px;';

  const ramp = document.createElement('div');
  ramp.style.cssText = `
    position: absolute;
    bottom: 10px;
    right: 0;
    width: 0;
    height: 0;
    border-left: 58px solid transparent;
    border-bottom: 12px solid #ccc;
  `;

  outer.appendChild(ramp);
  outer.appendChild(base);
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
  btn.appendChild(visualFactory());
  return btn;
}

function createSection(sectionTitle, items, selectionKey, selections, visualFactory) {
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
      row.querySelectorAll('.customise-item-button').forEach(b => {
        b.style.borderColor = '#444';
        b.style.boxShadow = '';
      });
      selections[selectionKey] = item.id;
      btn.style.borderColor = '#ffd700';
      btn.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.45)';
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
    wheels: 'standard',
    flipper: 'standard',
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

  panel.appendChild(createSection('Model', CATALOGUE.models, 'model', selections, createModelVisual));
  panel.appendChild(createSection('Wheels', CATALOGUE.wheels, 'wheels', selections, createWheelVisual));
  panel.appendChild(createSection('Flipper', CATALOGUE.flippers, 'flipper', selections, createFlipperVisual));

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
