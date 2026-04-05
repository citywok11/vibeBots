export function createRoguelikeMenu(container) {
  let open = false;
  let backToMainMenuCallback = null;
  let optionsCallback = null;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'roguelike-menu-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 100;
    justify-content: center;
    align-items: center;
  `;

  // Panel
  const panel = document.createElement('div');
  panel.className = 'roguelike-menu-panel';
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
  title.className = 'roguelike-menu-title';
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
    btn.className = 'roguelike-menu-button';
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

  // Back to main menu button
  const backToMainMenuBtn = createButton('Back to main menu');
  backToMainMenuBtn.addEventListener('click', () => {
    if (backToMainMenuCallback) backToMainMenuCallback();
  });
  panel.appendChild(backToMainMenuBtn);

  // Options button
  const optionsBtn = createButton('Options');
  optionsBtn.addEventListener('click', () => {
    if (optionsCallback) optionsCallback();
  });
  panel.appendChild(optionsBtn);

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

  function onBackToMainMenu(cb) {
    backToMainMenuCallback = cb;
  }

  function onOptions(cb) {
    optionsCallback = cb;
  }

  return {
    isOpen,
    open: openMenu,
    close,
    toggle,
    onBackToMainMenu,
    onOptions,
  };
}
