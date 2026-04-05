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
    if (running) menu.toggle();
  }

  homeScreen.onPlay(() => startGame());
  menu.onBackToMainMenu(() => stopGame());

  return { startGame, stopGame, isRunning, handleEscape };
}
