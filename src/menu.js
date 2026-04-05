export function createMenu(container) {
  let open = false;
  let keyBindingsCallback = null;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'menu-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 100;
    display: none;
    justify-content: center;
    align-items: center;
  `;

  // Panel
  const panel = document.createElement('div');
  panel.className = 'menu-panel';
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
  title.className = 'menu-title';
  title.textContent = 'PAUSED';
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
    btn.className = 'menu-button';
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
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#ff4444';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#333';
    });
    return btn;
  }

  // Resume button
  const resumeBtn = createButton('Resume');
  resumeBtn.addEventListener('click', () => close());
  panel.appendChild(resumeBtn);

  // Key Bindings button
  const keyBindingsBtn = createButton('Key Bindings');
  keyBindingsBtn.addEventListener('click', () => {
    if (keyBindingsCallback) keyBindingsCallback();
  });
  panel.appendChild(keyBindingsBtn);

  overlay.appendChild(panel);
  container.appendChild(overlay);

  function isOpen() {
    return open;
  }

  function openMenu() {
    open = true;
    overlay.style.display = 'flex';
  }

  function close() {
    open = false;
    overlay.style.display = 'none';
  }

  function toggle() {
    if (open) close();
    else openMenu();
  }

  function onKeyBindings(cb) {
    keyBindingsCallback = cb;
  }

  return {
    isOpen,
    open: openMenu,
    close,
    toggle,
    onKeyBindings,
  };
}
