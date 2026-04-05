import * as THREE from 'three';

const STAND_TIER_COUNT = 3;
const STAND_TIER_HEIGHT = 1.8;
const STAND_TIER_DEPTH = 3.5;
const STAND_WIDTH_EXTRA = 14;
const STAND_WALL_GAP = 1.5;

const FIGURES_PER_ROW = 18;
const FIGURE_HEIGHT = 1.2;
const FIGURE_WIDTH = 0.55;
const FIGURE_COLORS = [
  0xff3333, 0x3366ff, 0xffdd00, 0x33cc44,
  0xff55cc, 0x00ccff, 0xffffff, 0xff8800,
];

function createStandsAndAudience(size, wallThickness) {
  const half = size / 2;
  const standWidth = size + STAND_WIDTH_EXTRA;
  const offset = half + wallThickness / 2 + STAND_WALL_GAP;

  const tierMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a4a });
  const stands = [];
  const audienceFigures = [];

  // North (z<0, tiers step toward -Z), South (z>0, tiers toward +Z),
  // East  (x>0, tiers toward +X),     West  (x<0, tiers toward -X)
  const sideConfigs = [
    { pos: [0, 0, -offset],  rotY: Math.PI      },  // North
    { pos: [0, 0,  offset],  rotY: 0             },  // South
    { pos: [ offset, 0, 0],  rotY: Math.PI / 2   },  // East
    { pos: [-offset, 0, 0],  rotY: -Math.PI / 2  },  // West
  ];

  sideConfigs.forEach(config => {
    const standGroup = new THREE.Group();

    for (let tier = 0; tier < STAND_TIER_COUNT; tier++) {
      const tierGeo = new THREE.BoxGeometry(standWidth, STAND_TIER_HEIGHT, STAND_TIER_DEPTH);
      const tierMesh = new THREE.Mesh(tierGeo, tierMaterial);
      tierMesh.position.set(0, tier * STAND_TIER_HEIGHT, tier * STAND_TIER_DEPTH);
      standGroup.add(tierMesh);

      for (let col = 0; col < FIGURES_PER_ROW; col++) {
        const figureColor = FIGURE_COLORS[(col + tier * 3) % FIGURE_COLORS.length];
        const figGeo = new THREE.BoxGeometry(FIGURE_WIDTH, FIGURE_HEIGHT, FIGURE_WIDTH);
        const figMat = new THREE.MeshStandardMaterial({ color: figureColor });
        const fig = new THREE.Mesh(figGeo, figMat);
        const xPos = (col / (FIGURES_PER_ROW - 1) - 0.5) * (standWidth - 3);
        fig.position.set(
          xPos,
          tier * STAND_TIER_HEIGHT + STAND_TIER_HEIGHT / 2 + FIGURE_HEIGHT / 2,
          tier * STAND_TIER_DEPTH,
        );
        standGroup.add(fig);
        audienceFigures.push(fig);
      }
    }

    standGroup.position.set(...config.pos);
    standGroup.rotation.y = config.rotY;
    stands.push(standGroup);
  });

  return { stands, audienceFigures };
}

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

  // Audience stands
  const { stands, audienceFigures } = createStandsAndAudience(size, wallThickness);
  stands.forEach(stand => group.add(stand));

  return { floor, walls, stands, audienceFigures, group, size };
}
