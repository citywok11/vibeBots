export function createGameController({ homeScreen, menu, onStart, onStop }) {
  let running = false;

  function startGame() {
    homeScreen.close();
    running = true;
    if (onStart) onStart();
  }

  function stopGame() {
    running = false;
    menu.close();
    if (onStop) onStop();
    homeScreen.open();
  }

  function isRunning() {
    return running;
  }

  function handleEscape() {
    if (running) stopGame();
  }

  homeScreen.onPlay(() => startGame());
  menu.onExit(() => stopGame());

  return { startGame, stopGame, isRunning, handleEscape };
}
