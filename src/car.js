import * as THREE from 'three';

const RESTITUTION = 0.6;
const FRICTION = 0.98;

export const CAR_BODY_WIDTH = 2;
export const CAR_BODY_DEPTH = 3;
export const FLIPPER_BODY_DEPTH = 1.2;
export const FLIPPER_MAX_ANGLE = Math.PI / 3; // 60 degrees

export const MODEL_CATALOGUE = [
  { id: 'standard', label: 'Standard', mass: 1.0, width: 2,   height: 1,    depth: 3,   color: 0xff4444 },
  { id: 'wedge',    label: 'Wedge',    mass: 0.8, width: 2.6, height: 0.65, depth: 2.5, color: 0xff8800 },
  { id: 'heavy',    label: 'Heavy',    mass: 2.0, width: 2.2, height: 1.8,  depth: 3.8, color: 0x4488ff },
];

export const WHEEL_CATALOGUE = [
  { id: 'standard', label: 'Standard', radius: 0.6,  friction: 0.980, velocityMult: 1.0,  color: 0x222222 },
  { id: 'offroad',  label: 'Off-Road', radius: 0.75, friction: 0.970, velocityMult: 0.85, color: 0x2a3a1a },
  { id: 'racing',   label: 'Racing',   radius: 0.45, friction: 0.993, velocityMult: 1.2,  color: 0xaaaa00 },
];

export const FLIPPER_CATALOGUE = [
  { id: 'standard', label: 'Standard', depth: 1.2, power: 1.0, maxAngle: Math.PI / 3,   upSpeed: 12, downSpeed: 4,  color: 0xcccccc },
  { id: 'heavy',    label: 'Heavy',    depth: 1.8, power: 2.0, maxAngle: Math.PI / 2.5, upSpeed: 8,  downSpeed: 3,  color: 0x888888 },
  { id: 'light',    label: 'Light',    depth: 0.8, power: 0.6, maxAngle: Math.PI / 4,   upSpeed: 20, downSpeed: 6,  color: 0xeeeeee },
];

export function createCar(startPos = { x: 0, z: 0 }, options = {}) {
  // Physics bounding-box dimensions are fixed to the standard model so that
  // wall-bounce calculations remain stable regardless of which visual model is selected.
  const width = CAR_BODY_WIDTH;
  const height = 1;
  const depth = CAR_BODY_DEPTH;

  // Standard wheel radius drives the group height; other catalogue radii are adjusted
  // in local Y so every wheel type sits flush with the floor at this fixed group height.
  const wheelRadius = options.wheelRadius || WHEEL_CATALOGUE[0].radius;
  const groupY = wheelRadius + height / 2;

  const group = new THREE.Group();
  group.position.set(startPos.x, groupY, startPos.z);

  // --- Body meshes (one per MODEL_CATALOGUE entry) ---
  const bodyMeshes = new Map();
  for (const spec of MODEL_CATALOGUE) {
    const geo = new THREE.BoxGeometry(spec.width, spec.height, spec.depth);
    const mat = new THREE.MeshStandardMaterial({ color: spec.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.visible = (spec.id === 'standard');
    group.add(mesh);
    bodyMeshes.set(spec.id, mesh);
  }
  const body = bodyMeshes.get('standard'); // retained for internal positioning references

  // --- Wheel sets (one set of 4 per WHEEL_CATALOGUE entry) ---
  function buildWheelSet(spec) {
    const r = spec.radius;
    const wWidth = r * 0.5;
    const offsetX = width / 2 + wWidth / 2;
    const offsetZ = depth / 2 - 0.4;
    // Adjust local Y so each wheel type sits on the floor regardless of groupY.
    const localY = r - groupY;
    const geo = new THREE.CylinderGeometry(r, r, wWidth, spec.id === 'offroad' ? 12 : 16);
    const mat = new THREE.MeshStandardMaterial({ color: spec.color });
    const positions = [
      { x: -offsetX, z: -offsetZ },
      { x:  offsetX, z: -offsetZ },
      { x: -offsetX, z:  offsetZ },
      { x:  offsetX, z:  offsetZ },
    ];
    return positions.map(pos => {
      const wheel = new THREE.Mesh(geo, mat);
      wheel.position.set(pos.x, localY, pos.z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      group.add(wheel);
      return wheel;
    });
  }

  // The standard wheel set uses options.wheelRadius so the existing API
  // (createCar with a custom wheelRadius) keeps working.
  const standardWheelSpec = { ...WHEEL_CATALOGUE[0], radius: wheelRadius };
  const wheelSets = new Map();
  wheelSets.set('standard', buildWheelSet(standardWheelSpec));
  for (const spec of WHEEL_CATALOGUE.slice(1)) {
    const set = buildWheelSet(spec);
    set.forEach(w => { w.visible = false; });
    wheelSets.set(spec.id, set);
  }
  const wheelWidth = wheelRadius * 0.5; // used for the standard set's bounce calc

  // Flamethrower - barrel at the middle of the car (top center)
  const flamethrowerGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.0, 8);
  flamethrowerGeometry.rotateX(Math.PI / 2);
  const flamethrowerMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const flamethrower = new THREE.Mesh(flamethrowerGeometry, flamethrowerMaterial);
  flamethrower.position.set(0, height / 2, 0);
  flamethrower.castShadow = true;
  group.add(flamethrower);

  // Flame - cone that shoots forward from the barrel
  const flameGeometry = new THREE.ConeGeometry(0.35, 1.5, 8);
  flameGeometry.rotateX(-Math.PI / 2);
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6600,
    emissive: 0xff4400,
    emissiveIntensity: 1.0,
  });
  const flame = new THREE.Mesh(flameGeometry, flameMaterial);
  flame.position.set(0, height / 2, -1.25);
  flame.visible = false;
  group.add(flame);

  // Flame particles - small spheres that stream in front of the car when active
  const N_PARTICLES = 15;
  const PARTICLE_LIFETIME = 0.5;
  const PARTICLE_SPEED = 4;
  const PARTICLE_SPREAD = 0.3;
  const PARTICLE_SPAWN_Z = -1.75; // just past the barrel tip (front of car)
  const PARTICLE_SPAWN_Y = height / 2;

  const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
  const particles = [];
  for (let i = 0; i < N_PARTICLES; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0,
    });
    const mesh = new THREE.Mesh(particleGeometry, mat);
    mesh.visible = false;
    group.add(mesh);
    particles.push({
      mesh,
      age: Math.random() * PARTICLE_LIFETIME,
      spawnX: (Math.random() - 0.5) * PARTICLE_SPREAD,
    });
  }

  let flamethrowerActive = false;

  function activateFlamethrower() {
    flamethrowerActive = true;
  }

  function deactivateFlamethrower() {
    flamethrowerActive = false;
  }

  // --- Flipper meshes (one per FLIPPER_CATALOGUE entry) ---
  function buildFlipperMesh(spec) {
    const geo = new THREE.BoxGeometry(width, spec.depth < 1 ? 0.1 : spec.depth < 1.5 ? 0.15 : 0.25, spec.depth);
    geo.translate(0, 0, -spec.depth / 2);
    const mat = new THREE.MeshStandardMaterial({ color: spec.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -height / 2, -depth / 2);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  }

  const flipperMeshes = new Map();
  for (const spec of FLIPPER_CATALOGUE) {
    const mesh = buildFlipperMesh(spec);
    mesh.visible = (spec.id === 'standard');
    flipperMeshes.set(spec.id, mesh);
  }
  const flipper = flipperMeshes.get('standard'); // retained for backward compatibility

  let flipperAngle = 0;
  let flipperActive = false;

  function activateFlipper() {
    if (!hasFlipper) return;
    flipperActive = true;
  }

  let rotation = 0;
  const velocity = { x: 0, z: 0 };
  let currentMass = options.mass ?? MODEL_CATALOGUE[0].mass;
  const collisionRadius = Math.sqrt((width / 2) ** 2 + (depth / 2) ** 2);
  let hasWheels = true;
  let hasFlipper = true;

  // Active variant tracking
  let activeModelId = 'standard';
  let activeWheelId = 'standard';
  let activeFlipperId = 'standard';

  // Mutable physics parameters driven by selected variants
  let currentFriction = FRICTION;
  let currentVelocityMult = 1.0;
  let currentWheelWidth = wheelWidth;
  let currentFlipperPower = FLIPPER_CATALOGUE[0].power;
  let currentFlipperMaxAngle = FLIPPER_CATALOGUE[0].maxAngle;
  let currentFlipperUpSpeed = FLIPPER_CATALOGUE[0].upSpeed;
  let currentFlipperDownSpeed = FLIPPER_CATALOGUE[0].downSpeed;
  let currentFlipperDepth = FLIPPER_CATALOGUE[0].depth;

  function applyCustomisation(selections = {}) {
    if ('model' in selections) {
      activeModelId = selections.model;
      bodyMeshes.forEach((mesh, id) => { mesh.visible = id === selections.model; });
      if (selections.model !== null) {
        const spec = MODEL_CATALOGUE.find(m => m.id === selections.model);
        if (spec) currentMass = spec.mass;
      }
    }
    if ('wheels' in selections) {
      hasWheels = selections.wheels !== null;
      activeWheelId = selections.wheels;
      wheelSets.forEach((set, id) => {
        const visible = id === selections.wheels;
        set.forEach(w => { w.visible = visible; });
      });
      if (selections.wheels !== null) {
        const spec = WHEEL_CATALOGUE.find(w => w.id === selections.wheels);
        if (spec) {
          currentFriction = spec.friction;
          currentVelocityMult = spec.velocityMult;
          currentWheelWidth = spec.radius * 0.5;
        }
      } else {
        currentFriction = FRICTION;
        currentVelocityMult = 1.0;
      }
    }
    if ('flipper' in selections) {
      hasFlipper = selections.flipper !== null;
      activeFlipperId = selections.flipper;
      flipperMeshes.forEach((mesh, id) => { mesh.visible = id === selections.flipper; });
      if (selections.flipper !== null) {
        const spec = FLIPPER_CATALOGUE.find(f => f.id === selections.flipper);
        if (spec) {
          currentFlipperPower = spec.power;
          currentFlipperMaxAngle = spec.maxAngle;
          currentFlipperUpSpeed = spec.upSpeed;
          currentFlipperDownSpeed = spec.downSpeed;
          currentFlipperDepth = spec.depth;
        }
      }
    }
  }

  function reset() {
    group.position.set(startPos.x, groupY, startPos.z);
    rotation = 0;
    group.rotation.y = 0;
    velocity.x = 0;
    velocity.z = 0;
    hasWheels = true;
    flipperAngle = 0;
    flipperActive = false;
    flipperMeshes.forEach(mesh => { mesh.rotation.x = 0; });
    flamethrowerActive = false;
    flame.visible = false;
    particles.forEach(p => {
      p.mesh.visible = false;
      p.mesh.material.opacity = 0;
      p.age = Math.random() * PARTICLE_LIFETIME;
      p.spawnX = (Math.random() - 0.5) * PARTICLE_SPREAD;
    });
  }

  function accelerate(amount) {
    if (!hasWheels) return;
    velocity.x += -Math.sin(rotation) * amount * currentVelocityMult;
    velocity.z += -Math.cos(rotation) * amount * currentVelocityMult;
  }

  function turnLeft(amount) {
    if (!hasWheels) return;
    rotation += amount;
    group.rotation.y = rotation;
  }

  function turnRight(amount) {
    if (!hasWheels) return;
    rotation -= amount;
    group.rotation.y = rotation;
  }

  function bounceOffWalls(arenaSize) {
    const half = arenaSize / 2;
    let bounced = false;

    const cosR = Math.abs(Math.cos(rotation));
    const sinR = Math.abs(Math.sin(rotation));

    // Effective half-extents include sub-components:
    //   - wheels extend currentWheelWidth beyond each side of the body
    //   - flipper projects currentFlipperDepth * cos(angle) beyond the front of the body
    const effectiveHalfWidth = width / 2 + currentWheelWidth;
    const effectiveHalfDepth = depth / 2 + (hasFlipper ? currentFlipperDepth * Math.cos(flipperAngle) : 0);

    const halfExtentX = cosR * effectiveHalfWidth + sinR * effectiveHalfDepth;
    const halfExtentZ = sinR * effectiveHalfWidth + cosR * effectiveHalfDepth;

    const limitX = half - halfExtentX;
    const limitZ = half - halfExtentZ;

    if (group.position.x <= -limitX) {
      group.position.x = -limitX;
      velocity.x = Math.abs(velocity.x) * RESTITUTION;
      bounced = true;
    } else if (group.position.x >= limitX) {
      group.position.x = limitX;
      velocity.x = -Math.abs(velocity.x) * RESTITUTION;
      bounced = true;
    }

    if (group.position.z <= -limitZ) {
      group.position.z = -limitZ;
      velocity.z = Math.abs(velocity.z) * RESTITUTION;
      bounced = true;
    } else if (group.position.z >= limitZ) {
      group.position.z = limitZ;
      velocity.z = -Math.abs(velocity.z) * RESTITUTION;
      bounced = true;
    }

    return { bounced };
  }

  function update(dt) {
    group.position.x += velocity.x * dt;
    group.position.z += velocity.z * dt;
    velocity.x *= currentFriction;
    velocity.z *= currentFriction;

    // Flipper animation
    const activeFlipper = flipperMeshes.get(activeFlipperId || 'standard');
    if (flipperActive) {
      flipperAngle += currentFlipperUpSpeed * dt;
      if (flipperAngle >= currentFlipperMaxAngle) {
        flipperAngle = currentFlipperMaxAngle;
        flipperActive = false;
      }
    } else if (flipperAngle > 0) {
      flipperAngle -= currentFlipperDownSpeed * dt;
      if (flipperAngle < 0) flipperAngle = 0;
    }
    if (activeFlipper) activeFlipper.rotation.x = -flipperAngle;

    // Flamethrower animation
    flame.visible = flamethrowerActive;
    if (flamethrowerActive) {
      particles.forEach(p => {
        p.age += dt;
        if (p.age >= PARTICLE_LIFETIME) {
          p.age = 0;
          p.spawnX = (Math.random() - 0.5) * PARTICLE_SPREAD;
        }
        const t = p.age / PARTICLE_LIFETIME;
        p.mesh.position.set(
          p.spawnX,
          PARTICLE_SPAWN_Y,
          PARTICLE_SPAWN_Z - PARTICLE_SPEED * p.age,
        );
        p.mesh.material.opacity = 1 - t;
        const scale = 0.5 + t * 1.5;
        p.mesh.scale.set(scale, scale, scale);
        p.mesh.visible = true;
      });
    } else {
      particles.forEach(p => { p.mesh.visible = false; });
    }
  }

  return {
    group,
    get mesh() { return bodyMeshes.get(activeModelId || 'standard'); },
    get wheels() { return wheelSets.get(activeWheelId || 'standard'); },
    get flipper() { return flipperMeshes.get(activeFlipperId || 'standard'); },
    flamethrower,
    flame,
    particles,
    get flipperAngle() { return flipperAngle; },
    get flipperActive() { return flipperActive; },
    get flamethrowerActive() { return flamethrowerActive; },
    get rotation() { return rotation; },
    get velocity() { return velocity; },
    get mass() { return currentMass; },
    get flipperPower() { return currentFlipperPower; },
    get flipperDepth() { return currentFlipperDepth; },
    get flipperMaxAngle() { return currentFlipperMaxAngle; },
    collisionRadius,
    accelerate,
    activateFlipper,
    activateFlamethrower,
    deactivateFlamethrower,
    turnLeft,
    turnRight,
    bounceOffWalls,
    update,
    reset,
    applyCustomisation,
  };
}
