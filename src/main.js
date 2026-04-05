import * as THREE from 'three';
import { createArena } from './arena.js';
import { createCar } from './car.js';
import { createInputManager } from './input.js';
import { createMenu } from './menu.js';
import { createKeyBindingsScreen } from './keybindings-screen.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
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

// Input handling
const input = createInputManager();
window.addEventListener('keydown', (e) => input.handleKeyDown(e.code));
window.addEventListener('keyup', (e) => input.handleKeyUp(e.code));

// Menu & Key Bindings
const menu = createMenu(document.body);
const keyBindingsScreen = createKeyBindingsScreen(document.body, input);

window.addEventListener('keydown', (e) => {
  if (keyBindingsScreen.isOpen()) {
    keyBindingsScreen.handleKeyPress(e.code);
    return;
  }
  if (e.code === 'Escape') menu.toggle();
});

menu.onKeyBindings(() => {
  menu.close();
  keyBindingsScreen.open();
});
keyBindingsScreen.onClose(() => {
  menu.open();
});

// Game loop
const ACCEL = 20;
const TURN_SPEED = 3;
let lastTime = performance.now();
let paused = false;

function gameLoop(time) {
  requestAnimationFrame(gameLoop);
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  paused = menu.isOpen();
  if (paused) {
    renderer.render(scene, camera);
    return;
  }

  if (input.isPressed('forward')) car.accelerate(ACCEL * dt);
  if (input.isPressed('backward')) car.accelerate(-ACCEL * dt);
  if (input.isPressed('turnLeft')) car.turnLeft(TURN_SPEED * dt);
  if (input.isPressed('turnRight')) car.turnRight(TURN_SPEED * dt);
  if (input.wasJustPressed('flipper')) car.activateFlipper();

  car.update(dt);
  car.bounceOffWalls(ARENA_SIZE);

  // Camera follows car
  const carPos = car.group.position;
  camera.position.set(carPos.x, 30, carPos.z + 25);
  camera.lookAt(carPos.x, 0, carPos.z);

  renderer.render(scene, camera);
}

requestAnimationFrame(gameLoop);

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
