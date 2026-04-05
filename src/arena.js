import * as THREE from 'three';

export function createArena(size) {
  const group = new THREE.Group();

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(size, size);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Walls
  const wallHeight = 2;
  const wallThickness = 0.5;
  const half = size / 2;

  const wallConfigs = [
    { width: size, pos: [0, wallHeight / 2, -half], rotation: 0 },        // North
    { width: size, pos: [0, wallHeight / 2, half], rotation: 0 },         // South
    { width: size, pos: [-half, wallHeight / 2, 0], rotation: Math.PI / 2 }, // West
    { width: size, pos: [half, wallHeight / 2, 0], rotation: Math.PI / 2 },  // East
  ];

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const walls = wallConfigs.map(config => {
    const geometry = new THREE.BoxGeometry(config.width, wallHeight, wallThickness);
    const wall = new THREE.Mesh(geometry, wallMaterial);
    wall.position.set(...config.pos);
    wall.rotation.y = config.rotation;
    group.add(wall);
    return wall;
  });

  return { floor, walls, group, size };
}
