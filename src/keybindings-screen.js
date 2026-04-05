function formatActionName(action) {
  return action
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function formatKeyCode(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Arrow')) return code.slice(5);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export function createKeyBindingsScreen(container, inputManager) {
  let open = false;
  let listening = false;
  let listeningAction = null;
  let listeningIndex = null;
  let listeningButton = null;
  let originalKeyText = null;
  let closeCallback = null;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'keybindings-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.85);
    z-index: 200;
    justify-content: center;
    align-items: center;
  `;

  const panel = document.createElement('div');
  panel.className = 'keybindings-panel';
  panel.style.cssText = `
    background: #1a1a2e;
    border: 2px solid #555;
    border-radius: 8px;
    padding: 30px 40px;
    min-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: monospace;
    color: #fff;
  `;

  const title = document.createElement('h1');
  title.className = 'keybindings-title';
  title.textContent = 'KEY BINDINGS';
  title.style.cssText = `
    margin: 0 0 24px 0;
    font-size: 24px;
    letter-spacing: 4px;
    color: #ff4444;
    text-align: center;
  `;
  panel.appendChild(title);

  const rowsContainer = document.createElement('div');
  rowsContainer.className = 'keybindings-rows';
  panel.appendChild(rowsContainer);

  // Buttons row
  const buttonsRow = document.createElement('div');
  buttonsRow.style.cssText = `
    display: flex;
    gap: 10px;
    margin-top: 20px;
    justify-content: center;
  `;

  const btnStyle = `
    padding: 10px 20px;
    font-family: monospace;
    font-size: 14px;
    background: #333;
    color: #fff;
    border: 1px solid #666;
    border-radius: 4px;
    cursor: pointer;
  `;

  const backBtn = document.createElement('button');
  backBtn.className = 'keybindings-back';
  backBtn.textContent = 'Back';
  backBtn.style.cssText = btnStyle;
  backBtn.addEventListener('click', () => closeScreen());
  buttonsRow.appendChild(backBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'keybindings-reset';
  resetBtn.textContent = 'Reset to Defaults';
  resetBtn.style.cssText = btnStyle;
  resetBtn.addEventListener('click', () => {
    inputManager.resetToDefaults();
    renderRows();
  });
  buttonsRow.appendChild(resetBtn);

  panel.appendChild(buttonsRow);
  overlay.appendChild(panel);
  container.appendChild(overlay);

  function renderRows() {
    rowsContainer.innerHTML = '';
    const bindings = inputManager.getBindings();
    const actions = Object.keys(bindings);

    actions.forEach(action => {
      const row = document.createElement('div');
      row.className = 'keybinding-row';
      row.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #333;
      `;

      const label = document.createElement('span');
      label.className = 'keybinding-label';
      label.textContent = formatActionName(action);
      label.style.cssText = `
        flex: 1;
        font-size: 15px;
      `;
      row.appendChild(label);

      const keysContainer = document.createElement('div');
      keysContainer.style.cssText = `display: flex; gap: 6px;`;

      bindings[action].forEach((keyCode, index) => {
        const keyBtn = document.createElement('button');
        keyBtn.className = 'keybinding-key';
        keyBtn.textContent = formatKeyCode(keyCode);
        keyBtn.style.cssText = `
          padding: 6px 14px;
          font-family: monospace;
          font-size: 13px;
          background: #444;
          color: #fff;
          border: 1px solid #777;
          border-radius: 3px;
          cursor: pointer;
          min-width: 40px;
          text-align: center;
        `;

        keyBtn.addEventListener('click', () => {
          startListening(action, index, keyBtn);
        });

        keysContainer.appendChild(keyBtn);
      });

      row.appendChild(keysContainer);
      rowsContainer.appendChild(row);
    });
  }

  function startListening(action, index, button) {
    listening = true;
    listeningAction = action;
    listeningIndex = index;
    listeningButton = button;
    originalKeyText = button.textContent;
    button.textContent = '...';
    button.style.background = '#ff4444';
  }

  function handleKeyPress(code) {
    if (!listening) return;

    if (code === 'Escape') {
      listeningButton.textContent = originalKeyText;
      listeningButton.style.background = '#444';
      listening = false;
      listeningAction = null;
      listeningIndex = null;
      listeningButton = null;
      return;
    }

    // Update the binding
    const currentBindings = inputManager.getBindings()[listeningAction];
    currentBindings[listeningIndex] = code;
    inputManager.rebind(listeningAction, currentBindings);

    listeningButton.textContent = formatKeyCode(code);
    listeningButton.style.background = '#444';
    listening = false;
    listeningAction = null;
    listeningIndex = null;
    listeningButton = null;
  }

  function openScreen() {
    open = true;
    overlay.style.display = 'flex';
    renderRows();
  }

  function closeScreen() {
    open = false;
    overlay.style.display = 'none';
    listening = false;
    if (closeCallback) closeCallback();
  }

  function isOpen() {
    return open;
  }

  function isListening() {
    return listening;
  }

  function onClose(cb) {
    closeCallback = cb;
  }

  return {
    open: openScreen,
    close: closeScreen,
    isOpen,
    isListening,
    handleKeyPress,
    onClose,
  };
}
