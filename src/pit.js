import * as THREE from 'three';

export const DEFAULT_PIT_SIZE = 6;
const PIT_DEPTH = 6;
const LOWER_SPEED = 3; // units per second
const FRAME_THICKNESS = 0.3;
const FRAME_HEIGHT = 0.1;
const FRAME_COLOR = 0xffaa00;

export function createPit(arenaSize, { pitSize = DEFAULT_PIT_SIZE } = {}) {
  const group = new THREE.Group();
  const half = pitSize / 2;

  // Dark floor visible when cover is lowered
  const depthGeometry = new THREE.PlaneGeometry(pitSize, pitSize);
  const depthMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const depthFloor = new THREE.Mesh(depthGeometry, depthMaterial);
  depthFloor.rotation.x = -Math.PI / 2;
  depthFloor.position.y = -PIT_DEPTH;
  group.add(depthFloor);

  // Visible frame/border around the pit edge (always shown)
  const frameMaterial = new THREE.MeshStandardMaterial({ color: FRAME_COLOR });
  const frameConfigs = [
    { w: pitSize + FRAME_THICKNESS * 2, d: FRAME_THICKNESS, x: 0,     z: -half },
    { w: pitSize + FRAME_THICKNESS * 2, d: FRAME_THICKNESS, x: 0,     z:  half },
    { w: FRAME_THICKNESS,               d: pitSize,         x: -half,  z: 0    },
    { w: FRAME_THICKNESS,               d: pitSize,         x:  half,  z: 0    },
  ];
  frameConfigs.forEach(({ w, d, x, z }) => {
    const geo = new THREE.BoxGeometry(w, FRAME_HEIGHT, d);
    const mesh = new THREE.Mesh(geo, frameMaterial);
    mesh.position.set(x, FRAME_HEIGHT / 2, z);
    group.add(mesh);
  });

  // Cover: starts flush with floor, lowers to reveal pit
  const coverGeometry = new THREE.PlaneGeometry(pitSize, pitSize);
  const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const cover = new THREE.Mesh(coverGeometry, coverMaterial);
  cover.rotation.x = -Math.PI / 2;
  cover.position.y = 0;
  group.add(cover);

  let _isOpen = false;
  let _isLowering = false;
  let coverY = 0;

  function activate() {
    if (!_isOpen && !_isLowering) {
      _isLowering = true;
    }
  }

  function update(dt) {
    if (_isLowering && !_isOpen) {
      coverY -= LOWER_SPEED * dt;
      cover.position.y = coverY;
      if (coverY <= -PIT_DEPTH) {
        coverY = -PIT_DEPTH;
        cover.position.y = coverY;
        _isLowering = false;
        _isOpen = true;
      }
    }
  }

  function containsPoint(x, z) {
    return Math.abs(x) < half && Math.abs(z) < half;
  }

  function isOpen() { return _isOpen; }
  function isLowering() { return _isLowering; }
  function getCoverY() { return coverY; }

  return { group, cover, depthFloor, activate, update, containsPoint, isOpen, isLowering, getCoverY, pitSize };
}
