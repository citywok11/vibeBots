export function createHomeScreen(container) {
  let open = false;
  let playCallback = null;
  let optionsCallback = null;
  let exitCallback = null;

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'home-screen-overlay';
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
  panel.className = 'home-screen-panel';
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
  title.className = 'home-screen-title';
  title.textContent = 'VIBE BOTS';
  title.style.cssText = `
    margin: 0 0 30px 0;
    font-size: 36px;
    letter-spacing: 6px;
    color: #ff4444;
  `;
  panel.appendChild(title);

  // Button helper
  function createButton(label) {
    const btn = document.createElement('button');
    btn.className = 'home-screen-button';
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

  // Sandbox Mode button
  const playBtn = createButton('Sandbox Mode');
  playBtn.addEventListener('click', () => { if (playCallback) playCallback(); });
  panel.appendChild(playBtn);

  // Options button
  const optionsBtn = createButton('Options');
  optionsBtn.addEventListener('click', () => { if (optionsCallback) optionsCallback(); });
  panel.appendChild(optionsBtn);

  // Exit button
  const exitBtn = createButton('Exit');
  exitBtn.addEventListener('click', () => { if (exitCallback) exitCallback(); });
  panel.appendChild(exitBtn);

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

  function onPlay(cb) { playCallback = cb; }
  function onOptions(cb) { optionsCallback = cb; }
  function onExit(cb) { exitCallback = cb; }

  return {
    isOpen,
    open: openScreen,
    close: closeScreen,
    onPlay,
    onOptions,
    onExit,
  };
}
