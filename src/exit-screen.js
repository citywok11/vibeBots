export function createExitScreen(container) {
  let open = false;
  let sandboxModeCallback = null;
  let optionsCallback = null;
  let exitGameCallback = null;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'exit-screen-overlay';
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
  panel.className = 'exit-screen-panel';
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
  title.className = 'exit-screen-title';
  title.textContent = 'PLAY';
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
    btn.className = 'exit-screen-button';
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

  // Sandbox mode button
  const sandboxModeBtn = createButton('Sandbox mode');
  sandboxModeBtn.addEventListener('click', () => { if (sandboxModeCallback) sandboxModeCallback(); });
  panel.appendChild(sandboxModeBtn);

  // Options button
  const optionsBtn = createButton('Options');
  optionsBtn.addEventListener('click', () => { if (optionsCallback) optionsCallback(); });
  panel.appendChild(optionsBtn);

  // Exit game button
  const exitGameBtn = createButton('Exit game');
  exitGameBtn.addEventListener('click', () => { if (exitGameCallback) exitGameCallback(); });
  panel.appendChild(exitGameBtn);

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

  function onSandboxMode(cb) { sandboxModeCallback = cb; }
  function onOptions(cb) { optionsCallback = cb; }
  function onExitGame(cb) { exitGameCallback = cb; }

  return {
    isOpen,
    open: openScreen,
    close: closeScreen,
    onSandboxMode,
    onOptions,
    onExitGame,
  };
}
