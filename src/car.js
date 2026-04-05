import * as THREE from 'three';

const RESTITUTION = 0.6;
const FRICTION = 0.98;
const SPOKE_COUNT = 4;
const SPOKE_COLOR = 0x888888;
const AXLE_GAP = 0.3;
const AXLE_RADIUS = 0.08;
const AXLE_COLOR = 0x555555;
const MAX_STEER_ANGLE = Math.PI / 6; // 30 degrees max front wheel steer
const STEER_RETURN_SPEED = 8;        // how fast wheels centre when not turning (radians/s)

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

export const MACHINE_GUN_CATALOGUE = [
  { id: 'standard', label: 'Standard' },
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
  group.rotation.order = 'YXZ'; // yaw first, then pitch/roll in body space (pit lean, impacts)
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
    const offsetX = width / 2 + AXLE_GAP + wWidth / 2;
    const offsetZ = depth / 2 - 0.4;
    // Adjust local Y so each wheel type sits on the floor regardless of groupY.
    const localY = r - groupY;
    const geo = new THREE.CylinderGeometry(r, r, wWidth, spec.id === 'offroad' ? 12 : 16);
    const mat = new THREE.MeshStandardMaterial({ color: spec.color });
    const spokeMat = new THREE.MeshStandardMaterial({ color: SPOKE_COLOR });
    const axleMat = new THREE.MeshStandardMaterial({ color: AXLE_COLOR });
    // Axle length spans from body edge to inner face of wheel
    const axleLength = AXLE_GAP + wWidth / 2;
    const axleGeo = new THREE.CylinderGeometry(AXLE_RADIUS, AXLE_RADIUS, axleLength, 8);
    const positions = [
      { x: -offsetX, z: -offsetZ, front: true },
      { x:  offsetX, z: -offsetZ, front: true },
      { x: -offsetX, z:  offsetZ, front: false },
      { x:  offsetX, z:  offsetZ, front: false },
    ];
    const steerGroups = [];
    const wheelGroups = positions.map(pos => {
      const wheelGroup = new THREE.Group();
      wheelGroup.rotation.z = Math.PI / 2;

      // Inner spin group rotates around Y (the cylinder axis) independently
      const spinGroup = new THREE.Group();

      const rim = new THREE.Mesh(geo, mat);
      rim.castShadow = true;
      spinGroup.add(rim);

      // Spoke markings across the wheel face so rotation is visible
      const spokeWidth = r * 0.15;
      const spokeDepth = wWidth + 0.01;
      for (let i = 0; i < SPOKE_COUNT; i++) {
        const spokeGeo = new THREE.BoxGeometry(spokeWidth, r * 1.8, spokeDepth);
        const spoke = new THREE.Mesh(spokeGeo, spokeMat);
        spoke.rotation.y = (Math.PI / SPOKE_COUNT) * i;
        spinGroup.add(spoke);
      }

      wheelGroup.add(spinGroup);

      // Axle pole connecting body to wheel — sits in the wheelGroup but
      // outside the spin group so it doesn't rotate with the wheel.
      const axle = new THREE.Mesh(axleGeo, axleMat);
      const sign = Math.sign(pos.x);
      // In wheelGroup local space (after z=PI/2), local Y points along world X.
      // Position the axle halfway between body edge and wheel centre.
      axle.position.y = sign * (axleLength / 2);
      wheelGroup.add(axle);

      // Wrap every wheel in a steering group so it pivots around world Y
      const steerGroup = new THREE.Group();
      steerGroup.position.set(pos.x, localY, pos.z);
      steerGroup.add(wheelGroup);
      group.add(steerGroup);
      steerGroups.push(steerGroup);

      return wheelGroup;
    });
    wheelGroups._steerGroups = steerGroups;
    return wheelGroups;
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
  let hasFlamethrower = true;

  // Machine gun - barrel offset to the right of centre
  const machineGunGeometry = new THREE.CylinderGeometry(0.06, 0.08, 1.2, 8);
  machineGunGeometry.rotateX(Math.PI / 2);
  const machineGunMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const machineGun = new THREE.Mesh(machineGunGeometry, machineGunMaterial);
  machineGun.position.set(0.5, height / 2, 0);
  machineGun.castShadow = true;
  group.add(machineGun);

  // Muzzle flash - small cone at the barrel tip
  const muzzleFlashGeometry = new THREE.ConeGeometry(0.15, 0.5, 6);
  muzzleFlashGeometry.rotateX(-Math.PI / 2);
  const muzzleFlashMaterial = new THREE.MeshStandardMaterial({
    color: 0xffdd00,
    emissive: 0xffaa00,
    emissiveIntensity: 1.5,
  });
  const muzzleFlash = new THREE.Mesh(muzzleFlashGeometry, muzzleFlashMaterial);
  muzzleFlash.position.set(0.5, height / 2, -1.5);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  // Bullet particles - small fast-moving spheres
  const N_MG_PARTICLES = 20;
  const MG_PARTICLE_LIFETIME = 0.15;
  const MG_PARTICLE_SPEED = 12;
  const MG_PARTICLE_SPREAD = 0.05;
  const MG_PARTICLE_SPAWN_Z = -1.6;
  const MG_PARTICLE_SPAWN_Y = height / 2;

  const mgParticleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
  const mgParticles = [];
  for (let i = 0; i < N_MG_PARTICLES; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      emissive: 0xffaa00,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0,
    });
    const mesh = new THREE.Mesh(mgParticleGeometry, mat);
    mesh.visible = false;
    group.add(mesh);
    mgParticles.push({
      mesh,
      age: Math.random() * MG_PARTICLE_LIFETIME,
      spawnX: 0.5 + (Math.random() - 0.5) * MG_PARTICLE_SPREAD,
    });
  }

  let machineGunActive = false;
  let hasMachineGun = true;

  function activateFlamethrower() {
    if (!hasFlamethrower) return;
    machineGunActive = false;
    flamethrowerActive = true;
  }

  function deactivateFlamethrower() {
    flamethrowerActive = false;
  }

  function activateMachineGun() {
    if (!hasMachineGun) return;
    flamethrowerActive = false;
    machineGunActive = true;
  }

  function deactivateMachineGun() {
    machineGunActive = false;
  }

  // --- Flipper meshes (one per FLIPPER_CATALOGUE entry) ---
  // Each flipper is built with a pivot Group at the hinge point so the paddle
  // swings in a true rotational arc rather than translating linearly.
  function flipperThickness(depth) {
    if (depth < 1) return 0.1;
    if (depth < 1.5) return 0.15;
    return 0.25;
  }

  function buildFlipperSet(spec) {
    // Pivot sits at the hinge: bottom of the car body, front face.
    const pivot = new THREE.Group();
    pivot.position.set(0, -height / 2, -depth / 2);
    group.add(pivot);

    // Flipper mesh is a child of the pivot.  The geometry is un-translated;
    // instead the mesh is offset so the back edge sits at the pivot origin
    // and the paddle extends forward (local -Z).
    const geo = new THREE.BoxGeometry(width, flipperThickness(spec.depth), spec.depth);
    const mat = new THREE.MeshStandardMaterial({ color: spec.color });
    const mesh = new THREE.Mesh(geo, mat);
    // Offset: centre of geometry is half the flipper depth ahead of the hinge
    mesh.position.set(0, 0, -spec.depth / 2);
    mesh.castShadow = true;
    pivot.add(mesh);

    return { pivot, mesh };
  }

  const flipperSets = new Map(); // id → { pivot, mesh }
  const flipperPivots = new Map(); // id → pivot group
  const flipperMeshes = new Map(); // id → mesh (kept for backward-compat getter)
  for (const spec of FLIPPER_CATALOGUE) {
    const set = buildFlipperSet(spec);
    const isDefault = spec.id === 'standard';
    set.pivot.visible = isDefault;
    flipperSets.set(spec.id, set);
    flipperPivots.set(spec.id, set.pivot);
    flipperMeshes.set(spec.id, set.mesh);
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
  let velocityY = 0;
  let currentMass = options.mass ?? MODEL_CATALOGUE[0].mass;
  const collisionRadius = Math.sqrt((width / 2) ** 2 + (depth / 2) ** 2);
  let hasWheels = true;
  let hasFlipper = true;
  let angularVelocity = 0;
  let steerAngle = 0;     // current visual steering angle of front wheels

  // Pitch and roll tilt from collision impacts (visual only)
  const TILT_DECAY = 8;    // how fast tilt returns to zero (per second)
  const TILT_MAX = 0.3;    // max tilt in radians (~17 degrees)
  let pitchTilt = 0;       // rotation around X axis (forward/back rock)
  let rollTilt = 0;        // rotation around Z axis (side-to-side rock)

  // Active variant tracking
  let activeModelId = 'standard';
  let activeWheelId = 'standard';
  let activeFlipperId = 'standard';

  // Mutable physics parameters driven by selected variants
  let currentFriction = FRICTION;
  let currentVelocityMult = 1.0;
  let currentWheelWidth = wheelWidth;
  let currentWheelRadius = wheelRadius;
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
          currentWheelRadius = spec.radius;
        }
      } else {
        currentFriction = FRICTION;
        currentVelocityMult = 1.0;
      }
    }
    if ('flipper' in selections) {
      hasFlipper = selections.flipper !== null;
      activeFlipperId = selections.flipper;
      flipperPivots.forEach((pivot, id) => { pivot.visible = id === selections.flipper; });
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
    if ('flamethrower' in selections) {
      hasFlamethrower = selections.flamethrower !== null;
      flamethrower.visible = hasFlamethrower;
      if (!hasFlamethrower) {
        flamethrowerActive = false;
        flame.visible = false;
        particles.forEach(p => { p.mesh.visible = false; });
      }
    }
    if ('machineGun' in selections) {
      hasMachineGun = selections.machineGun !== null;
      machineGun.visible = hasMachineGun;
      if (!hasMachineGun) {
        machineGunActive = false;
        muzzleFlash.visible = false;
        mgParticles.forEach(p => { p.mesh.visible = false; });
      }
    }
  }

  function reset() {
    group.position.set(startPos.x, groupY, startPos.z);
    rotation = 0;
    group.rotation.y = 0;
    group.rotation.x = 0;
    group.rotation.z = 0;
    velocity.x = 0;
    velocity.z = 0;
    velocityY = 0;
    angularVelocity = 0;
    pitchTilt = 0;
    rollTilt = 0;
    steerAngle = 0;
    hasWheels = true;
    flipperAngle = 0;
    flipperActive = false;
    flipperPivots.forEach(pivot => { pivot.rotation.x = 0; });
    flamethrowerActive = false;
    flame.visible = false;
    particles.forEach(p => {
      p.mesh.visible = false;
      p.mesh.material.opacity = 0;
      p.age = Math.random() * PARTICLE_LIFETIME;
      p.spawnX = (Math.random() - 0.5) * PARTICLE_SPREAD;
    });
    machineGunActive = false;
    muzzleFlash.visible = false;
    mgParticles.forEach(p => {
      p.mesh.visible = false;
      p.mesh.material.opacity = 0;
      p.age = Math.random() * MG_PARTICLE_LIFETIME;
      p.spawnX = 0.5 + (Math.random() - 0.5) * MG_PARTICLE_SPREAD;
    });
  }

  function isAirborne() {
    return group.position.y > groupY + 0.01;
  }

  function accelerate(amount) {
    if (!hasWheels) return;
    if (isAirborne()) return;
    velocity.x += -Math.sin(rotation) * amount * currentVelocityMult; 
    velocity.z += -Math.cos(rotation) * amount * currentVelocityMult;
  }

  function turnLeft(amount) {
    if (!hasWheels) return;
    steerAngle = MAX_STEER_ANGLE;
    if (isAirborne()) return;
    rotation += amount;
    group.rotation.y = rotation;
  }

  function turnRight(amount) {
    if (!hasWheels) return;
    steerAngle = -MAX_STEER_ANGLE;
    if (isAirborne()) return;
    rotation -= amount;
    group.rotation.y = rotation;
  }

  function bounceOffWalls(arenaSize) {
    const half = arenaSize / 2;
    let bounced = false;

    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    // The car is asymmetric in depth: the flipper projects only from the front.
    // Use the four corners of the effective bounding shape to compute the true
    // axis-aligned extents at any rotation, rather than a symmetric rectangle.
    //   halfW          = width/2 + AXLE_GAP + currentWheelWidth (wheels extend past each side)
    //   frontHalfDepth = depth/2 + currentFlipperDepth*cos(angle) (flipper at front)
    //   backHalfDepth  = depth/2 (back of body, no flipper)
    const halfW = width / 2 + AXLE_GAP + currentWheelWidth;
    const frontHalfDepth = depth / 2 + (hasFlipper ? currentFlipperDepth * Math.cos(flipperAngle) : 0);
    const backHalfDepth = depth / 2;

    let maxX = -Infinity, minX = Infinity;
    let maxZ = -Infinity, minZ = Infinity;

    for (const lz of [-frontHalfDepth, backHalfDepth]) {
      for (const lx of [-halfW, halfW]) {
        const wx = cosR * lx + sinR * lz;
        const wz = -sinR * lx + cosR * lz;
        if (wx > maxX) maxX = wx;
        if (wx < minX) minX = wx;
        if (wz > maxZ) maxZ = wz;
        if (wz < minZ) minZ = wz;
      }
    }

    if (group.position.x + minX <= -half) {
      group.position.x = -half - minX;
      velocity.x = Math.abs(velocity.x) * RESTITUTION;
      bounced = true;
    } else if (group.position.x + maxX >= half) {
      group.position.x = half - maxX;
      velocity.x = -Math.abs(velocity.x) * RESTITUTION;
      bounced = true;
    }

    if (group.position.z + minZ <= -half) {
      group.position.z = -half - minZ;
      velocity.z = Math.abs(velocity.z) * RESTITUTION;
      bounced = true;
    } else if (group.position.z + maxZ >= half) {
      group.position.z = half - maxZ;
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

    // Vertical physics (gravity + ground clamp)
    const GRAVITY = 30;
    velocityY -= GRAVITY * dt;
    group.position.y += velocityY * dt;
    if (group.position.y <= groupY) {
      group.position.y = groupY;
      velocityY = 0;
    }

    // Apply angular velocity (yaw spin from collisions)
    const ANGULAR_FRICTION = 0.95;
    rotation += angularVelocity * dt;
    angularVelocity *= ANGULAR_FRICTION;
    if (Math.abs(angularVelocity) < 0.01) angularVelocity = 0;

    // Decay pitch and roll tilt back to zero
    pitchTilt *= Math.max(0, 1 - TILT_DECAY * dt);
    rollTilt *= Math.max(0, 1 - TILT_DECAY * dt);
    if (Math.abs(pitchTilt) < 0.001) pitchTilt = 0;
    if (Math.abs(rollTilt) < 0.001) rollTilt = 0;

    applyFrameRotation(0, 0);

    // Spin wheels based on forward speed
    const fwdX = -Math.sin(rotation);
    const fwdZ = -Math.cos(rotation);
    const forwardSpeed = velocity.x * fwdX + velocity.z * fwdZ;
    const spinDelta = (forwardSpeed * dt) / currentWheelRadius;
    const activeWheels = wheelSets.get(activeWheelId || 'standard');
    if (activeWheels) {
      activeWheels.forEach(w => {
        const spinGroup = w.children[0];
        spinGroup.rotation.y += spinDelta;
      });

      // Steer front wheels — decay back to centre when not actively turning
      if (steerAngle > 0) {
        steerAngle = Math.max(0, steerAngle - STEER_RETURN_SPEED * dt);
      } else if (steerAngle < 0) {
        steerAngle = Math.min(0, steerAngle + STEER_RETURN_SPEED * dt);
      }
      const steerGroups = activeWheels._steerGroups;
      if (steerGroups) {
        steerGroups.forEach(sg => { sg.rotation.y = steerAngle; });
      }
    }

    // Flipper animation — rotate the pivot group so the paddle swings in an arc
    const activePivot = flipperPivots.get(activeFlipperId || 'standard');
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
    if (activePivot) activePivot.rotation.x = -flipperAngle;

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

    // Machine gun animation
    muzzleFlash.visible = machineGunActive;
    if (machineGunActive) {
      muzzleFlash.visible = Math.floor(Date.now() / 50) % 2 === 0; // flicker at ~20 Hz
      mgParticles.forEach(p => {
        p.age += dt;
        if (p.age >= MG_PARTICLE_LIFETIME) {
          p.age = 0;
          p.spawnX = 0.5 + (Math.random() - 0.5) * MG_PARTICLE_SPREAD;
        }
        const t = p.age / MG_PARTICLE_LIFETIME;
        p.mesh.position.set(
          p.spawnX,
          MG_PARTICLE_SPAWN_Y,
          MG_PARTICLE_SPAWN_Z - MG_PARTICLE_SPEED * p.age,
        );
        p.mesh.material.opacity = 1 - t;
        p.mesh.visible = true;
      });
    } else {
      mgParticles.forEach(p => { p.mesh.visible = false; });
    }
  }

  /**
   * Applies a yaw angular impulse from a collision.
   * @param {number} impulse - Angular velocity change in radians/s
   */
  function applyAngularImpulse(impulse) {
    angularVelocity += impulse;
  }

  /**
   * Applies a visual pitch and roll tilt based on the collision impact direction.
   * The tilt is relative to the car's local frame: a hit from the front/back
   * produces pitch, a hit from the side produces roll.
   *
   * @param {number} nx - X component of collision normal (world space)
   * @param {number} nz - Z component of collision normal (world space)
   * @param {number} speed - Impact speed (scales tilt magnitude)
   */
  function applyImpactTilt(nx, nz, speed) {
    const TILT_SCALE = 0.04; // how much tilt per unit of impact speed

    // Transform the world-space impact normal into the car's local frame
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);
    const localX = nx * cosR - nz * sinR;
    const localZ = nx * sinR + nz * cosR;

    // localZ → pitch (hit from front/back rocks forward/back)
    // localX → roll (hit from left/right rocks side to side)
    const rawPitch = -localZ * speed * TILT_SCALE;
    const rawRoll = localX * speed * TILT_SCALE;

    pitchTilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, pitchTilt + rawPitch));
    rollTilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, rollTilt + rawRoll));
  }

  function applyFrameRotation(pitPitch, pitRoll) {
    group.rotation.set(pitchTilt + pitPitch, rotation, rollTilt + pitRoll);
  }

  return {
    group,
    get mesh() { return bodyMeshes.get(activeModelId || 'standard'); },
    get wheels() { return wheelSets.get(activeWheelId || 'standard'); },
    get flipper() { return flipperMeshes.get(activeFlipperId || 'standard'); },
    get flipperPivot() { return flipperPivots.get(activeFlipperId || 'standard'); },
    flamethrower,
    flame,
    particles,
    machineGun,
    muzzleFlash,
    mgParticles,
    get flipperAngle() { return flipperAngle; },
    get flipperActive() { return flipperActive; },
    get flamethrowerActive() { return flamethrowerActive; },
    get machineGunActive() { return machineGunActive; },
    get rotation() { return rotation; },
    get velocity() { return velocity; },
    get velocityY() { return velocityY; },
    set velocityY(v) { velocityY = v; },
    get mass() { return currentMass; },
    get flipperPower() { return currentFlipperPower; },
    get flipperDepth() { return currentFlipperDepth; },
    get flipperMaxAngle() { return currentFlipperMaxAngle; },
    get angularVelocity() { return angularVelocity; },
    get pitchTilt() { return pitchTilt; },
    get rollTilt() { return rollTilt; },
    get groundY() { return groupY; },
    get wheelThicknessHalf() { return currentWheelWidth / 2; },
    collisionRadius,
    accelerate,
    activateFlipper,
    activateFlamethrower,
    deactivateFlamethrower,
    activateMachineGun,
    deactivateMachineGun,
    turnLeft,
    turnRight,
    bounceOffWalls,
    update,
    applyFrameRotation,
    reset,
    applyCustomisation,
    applyAngularImpulse,
    applyImpactTilt,
  };
}
