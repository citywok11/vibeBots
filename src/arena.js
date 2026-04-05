import * as THREE from 'three';

const STAND_TIER_COUNT = 3;
const STAND_TIER_HEIGHT = 1.8;
const STAND_TIER_DEPTH = 3.5;
const STAND_WIDTH_EXTRA = 14;
const STAND_WALL_GAP = 1.5;

const FIGURES_PER_ROW = 18;
const FIGURE_WIDTH = 0.55;
const FIGURE_BODY_HEIGHT = 0.75;
const FIGURE_BODY_DEPTH = 0.35;
const FIGURE_HEAD_SIZE = 0.42;
const FIGURE_HEAD_COLOR = 0xffd5a0;
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

        const bodyGeo = new THREE.BoxGeometry(FIGURE_WIDTH, FIGURE_BODY_HEIGHT, FIGURE_BODY_DEPTH);
        const bodyMat = new THREE.MeshStandardMaterial({ color: figureColor });
        const figBody = new THREE.Mesh(bodyGeo, bodyMat);

        const xPos = (col / (FIGURES_PER_ROW - 1) - 0.5) * (standWidth - 3);
        figBody.position.set(
          xPos,
          tier * STAND_TIER_HEIGHT + STAND_TIER_HEIGHT / 2 + FIGURE_BODY_HEIGHT / 2,
          tier * STAND_TIER_DEPTH,
        );
        figBody.rotation.z = Math.sin(col * 1.3 + tier * 0.7) * 0.08;

        const headGeo = new THREE.BoxGeometry(FIGURE_HEAD_SIZE, FIGURE_HEAD_SIZE, FIGURE_HEAD_SIZE);
        const headMat = new THREE.MeshStandardMaterial({ color: FIGURE_HEAD_COLOR });
        const figHead = new THREE.Mesh(headGeo, headMat);
        figHead.position.y = FIGURE_BODY_HEIGHT / 2 + FIGURE_HEAD_SIZE / 2;
        figBody.add(figHead);

        standGroup.add(figBody);
        audienceFigures.push(figBody);
      }
    }

    standGroup.position.set(...config.pos);
    standGroup.rotation.y = config.rotY;
    stands.push(standGroup);
  });

  return { stands, audienceFigures };
}

export function createArena(size, { pitCutout } = {}) {
  const group = new THREE.Group();

  // Floor — if a pit cutout is specified, punch a hole so the pit shaft is visible
  const half = size / 2;
  let floorGeometry;
  if (pitCutout) {
    const shape = new THREE.Shape();
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.lineTo(-half, -half);

    const ph = pitCutout / 2;
    const hole = new THREE.Path();
    hole.moveTo(-ph, -ph);
    hole.lineTo(ph, -ph);
    hole.lineTo(ph, ph);
    hole.lineTo(-ph, ph);
    hole.lineTo(-ph, -ph);
    shape.holes.push(hole);

    floorGeometry = new THREE.ShapeGeometry(shape);
  } else {
    floorGeometry = new THREE.PlaneGeometry(size, size);
  }
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Walls
  const wallHeight = 2;
  const wallThickness = 0.5;

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
