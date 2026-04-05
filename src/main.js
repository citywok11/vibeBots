import * as THREE from 'three';
import { createArena } from './arena.js';
import { createCar } from './car.js';
import { createRobot } from './robot.js';
import { createInputManager } from './input.js';
import { createMenu } from './menu.js';
import { createKeyBindingsScreen } from './keybindings-screen.js';
import { createHomeScreen } from './home-screen.js';
import { createOptionsScreen } from './options-screen.js';
import { createExitScreen } from './exit-screen.js';
import { createGameController } from './game.js';
import { createCustomiseScreen } from './customise-screen.js';
import { resolveCollision } from './collision.js';
import { applyFlipperImpulse } from './flipper-physics.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.domElement.style.display = 'none';
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Arena
const ARENA_SIZE = 50;
const arena = createArena(ARENA_SIZE);
scene.add(arena.group);

// Car
const car = createCar();
scene.add(car.group);

// Dummy robot opponent
const robot = createRobot({ x: 10, z: -10 });
scene.add(robot.group);

// Input handling
const input = createInputManager();
window.addEventListener('keydown', (e) => input.handleKeyDown(e.code));
window.addEventListener('keyup', (e) => input.handleKeyUp(e.code));

// Menu & Key Bindings
const homeScreen = createHomeScreen(document.body);
const optionsScreen = createOptionsScreen(document.body);
const exitScreen = createExitScreen(document.body);
const menu = createMenu(document.body);
const customiseScreen = createCustomiseScreen(document.body);
const keyBindingsScreen = createKeyBindingsScreen(document.body, input);

// Game loop
const ACCEL = 20;
const TURN_SPEED = 3;
let lastTime = performance.now();
let rafId = null;
let flipImpulseApplied = false;

function gameLoop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (menu.isOpen() || customiseScreen.isOpen()) {
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(gameLoop);
    return;
  }

  if (input.isPressed('forward')) car.accelerate(ACCEL * dt);
  if (input.isPressed('backward')) car.accelerate(-ACCEL * dt);
  if (input.isPressed('turnLeft')) car.turnLeft(TURN_SPEED * dt);
  if (input.isPressed('turnRight')) car.turnRight(TURN_SPEED * dt);
  if (input.wasJustPressed('flipper')) {
    car.activateFlipper();
    flipImpulseApplied = false;
  }
  if (input.isPressed('flamethrower')) {
    car.activateFlamethrower();
  } else {
    car.deactivateFlamethrower();
  }

  car.update(dt);
  car.bounceOffWalls(ARENA_SIZE);

  robot.update(dt);
  robot.bounceOffWalls(ARENA_SIZE);

  // Apply flipper impulse once per flip activation when robot is in range
  if (car.flipperActive && !flipImpulseApplied) {
    if (applyFlipperImpulse(car, robot)) {
      flipImpulseApplied = true;
    }
  }

  // Resolve collision between player car and dummy robot
  resolveCollision(
    { position: car.group.position, velocity: car.velocity, mass: car.mass, collisionRadius: car.collisionRadius },
    { position: robot.group.position, velocity: robot.velocity, mass: robot.mass, collisionRadius: robot.collisionRadius }
  );

  // Camera follows car
  const carPos = car.group.position;
  camera.position.set(carPos.x, 30, carPos.z + 25);
  camera.lookAt(carPos.x, 0, carPos.z);

  renderer.render(scene, camera);
  rafId = requestAnimationFrame(gameLoop);
}

function startLoop() {
  car.reset();
  robot.reset();
  renderer.domElement.style.display = 'block';
  lastTime = performance.now();
  if (!rafId) rafId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  renderer.domElement.style.display = 'none';
}

const game = createGameController({ homeScreen, menu, onStart: startLoop, onStop: stopLoop });

// Show home screen on startup
homeScreen.open();

// Screen navigation callbacks
let keyBindingsReturnTo = null;

homeScreen.onOptions(() => {
  homeScreen.close();
  optionsScreen.open();
});

homeScreen.onExit(() => {
  homeScreen.close();
  exitScreen.open();
});

// Exit screen callbacks
exitScreen.onSandboxMode(() => {
  exitScreen.close();
  game.startGame();
});

exitScreen.onOptions(() => {
  exitScreen.close();
  keyBindingsReturnTo = () => exitScreen.open();
  optionsScreen.open();
});

exitScreen.onExitGame(() => {
  window.close();
});

keyBindingsScreen.onClose(() => {
  if (keyBindingsReturnTo) keyBindingsReturnTo();
});

optionsScreen.onKeyBindings(() => {
  optionsScreen.close();
  keyBindingsReturnTo = () => optionsScreen.open();
  keyBindingsScreen.open();
});

optionsScreen.onBack(() => {
  homeScreen.open();
});

window.addEventListener('keydown', (e) => {
  if (keyBindingsScreen.isOpen()) {
    keyBindingsScreen.handleKeyPress(e.code);
    return;
  }
  if (e.code === 'Escape' && game.isRunning()) {
    game.handleEscape();
  }
});

menu.onCustomise(() => {
  menu.close();
  customiseScreen.open();
});

// onClose fires when Back is clicked; apply selections to the car, close the screen then return to the pause menu
customiseScreen.onClose(() => {
  car.applyCustomisation(customiseScreen.getSelections());
  customiseScreen.close();
  menu.open();
});

menu.onOptions(() => {
  menu.close();
  keyBindingsReturnTo = () => menu.open();
  optionsScreen.open();
});

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
