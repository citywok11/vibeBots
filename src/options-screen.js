export function createOptionsScreen(container) {
  let open = false;
  let keyBindingsCallback = null;
  let backCallback = null;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'options-screen-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.85);
    z-index: 300;
    justify-content: center;
    align-items: center;
  `;

  // Panel
  const panel = document.createElement('div');
  panel.className = 'options-screen-panel';
  panel.style.cssText = `
    background: #1a1a2e;
    border: 2px solid #555;
    border-radius: 8px;
    padding: 40px;
    min-width: 300px;
    text-align: center;
    font-family: monospace;
    color: #fff;
  `;

  // Title
  const title = document.createElement('h1');
  title.className = 'options-screen-title';
  title.textContent = 'OPTIONS';
  title.style.cssText = `
    margin: 0 0 30px 0;
    font-size: 28px;
    letter-spacing: 4px;
    color: #ff4444;
  `;
  panel.appendChild(title);

  // Button helper
  function createButton(label) {
    const btn = document.createElement('button');
    btn.className = 'options-screen-button';
    btn.textContent = label;
    btn.style.cssText = `
      display: block;
      width: 100%;
      padding: 12px 24px;
      margin: 10px 0;
      font-family: monospace;
      font-size: 16px;
      background: #333;
      color: #fff;
      border: 1px solid #666;
      border-radius: 4px;
      cursor: pointer;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#ff4444'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#333'; });
    return btn;
  }

  // Key Bindings button
  const keyBindingsBtn = createButton('Key Bindings');
  keyBindingsBtn.addEventListener('click', () => { if (keyBindingsCallback) keyBindingsCallback(); });
  panel.appendChild(keyBindingsBtn);

  // Back button
  const backBtn = createButton('Back');
  backBtn.addEventListener('click', () => {
    closeScreen();
    if (backCallback) backCallback();
  });
  panel.appendChild(backBtn);

  overlay.appendChild(panel);
  container.appendChild(overlay);

  function isOpen() {
    return open;
  }

  function openScreen() {
    open = true;
    overlay.style.display = 'flex';
  }

  function closeScreen() {
    open = false;
    overlay.style.display = 'none';
  }

  function onKeyBindings(cb) { keyBindingsCallback = cb; }
  function onBack(cb) { backCallback = cb; }

  return {
    isOpen,
    open: openScreen,
    close: closeScreen,
    onKeyBindings,
    onBack,
  };
}
