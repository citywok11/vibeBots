import * as THREE from 'three';

const BUTTON_WIDTH = 1.5;
const BUTTON_HEIGHT = 1.0;
const BUTTON_DEPTH = 0.4;
const BUTTON_COLOR_IDLE = 0xff2200;
const BUTTON_COLOR_PRESSED = 0x660000;
const HIT_RADIUS = 1.5;

export function createPitButton(arenaSize) {
  const group = new THREE.Group();

  const buttonGeometry = new THREE.BoxGeometry(BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_DEPTH);
  const buttonMaterial = new THREE.MeshStandardMaterial({ color: BUTTON_COLOR_IDLE });
  const mesh = new THREE.Mesh(buttonGeometry, buttonMaterial);

  // Place on east wall (positive X side), centred on Z axis, protruding inward
  const wallX = arenaSize / 2 - BUTTON_DEPTH / 2;
  mesh.position.set(wallX, BUTTON_HEIGHT / 2 + 0.5, 0);
  group.add(mesh);

  let _isPressed = false;
  const callbacks = [];

  function onActivate(cb) {
    callbacks.push(cb);
  }

  function checkHit(x, z, radius) {
    if (_isPressed) return false;
    const bx = mesh.position.x;
    const bz = mesh.position.z;
    const dist = Math.sqrt((x - bx) ** 2 + (z - bz) ** 2);
    if (dist < radius + HIT_RADIUS) {
      _isPressed = true;
      buttonMaterial.color.setHex(BUTTON_COLOR_PRESSED);
      callbacks.forEach(cb => cb());
      return true;
    }
    return false;
  }

  function isPressed() { return _isPressed; }

  function reset() {
    _isPressed = false;
    buttonMaterial.color.setHex(BUTTON_COLOR_IDLE);
  }

  return { group, mesh, checkHit, onActivate, isPressed, reset };
}
