import * as THREE from 'three';

const RESTITUTION = 0.6;
const FRICTION = 0.98;

export const CAR_BODY_WIDTH = 2;
export const CAR_BODY_DEPTH = 3;
export const FLIPPER_BODY_DEPTH = 1.2;
export const FLIPPER_MAX_ANGLE = Math.PI / 3; // 60 degrees

export function createCar(startPos = { x: 0, z: 0 }, options = {}) {
  const width = CAR_BODY_WIDTH;
  const height = 1;
  const depth = CAR_BODY_DEPTH;

  const wheelRadius = options.wheelRadius || 0.6;
  const wheelWidth = wheelRadius * 0.5;

  // Group Y: wheels sit on the ground, body sits on top of wheels
  const groupY = wheelRadius + height / 2;

  const group = new THREE.Group();
  group.position.set(startPos.x, groupY, startPos.z);

  // Body
  const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  group.add(body);

  // Wheels
  const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });

  const wheelOffsetX = width / 2 + wheelWidth / 2;
  const wheelOffsetZ = depth / 2 - 0.4;
  const wheelY = -height / 2;

  const wheelPositions = [
    { x: -wheelOffsetX, z: -wheelOffsetZ }, // front-left
    { x:  wheelOffsetX, z: -wheelOffsetZ }, // front-right
    { x: -wheelOffsetX, z:  wheelOffsetZ }, // back-left
    { x:  wheelOffsetX, z:  wheelOffsetZ }, // back-right
  ];

  const wheels = wheelPositions.map(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(pos.x, wheelY, pos.z);
    wheel.rotation.z = Math.PI / 2; // rotate cylinder to lie on its side
    wheel.castShadow = true;
    group.add(wheel);
    return wheel;
  });

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

  function activateFlamethrower() {
    if (!hasFlamethrower) return;
    flamethrowerActive = true;
  }

  function deactivateFlamethrower() {
    flamethrowerActive = false;
  }

  // Flipper - wedge at the front of the car
  const flipperWidth = width;
  const flipperHeight = 0.15;
  const flipperDepth = FLIPPER_BODY_DEPTH;
  const flipperGeometry = new THREE.BoxGeometry(flipperWidth, flipperHeight, flipperDepth);
  // Shift geometry pivot to the back edge so it rotates from the hinge point
  flipperGeometry.translate(0, 0, -flipperDepth / 2);
  const flipperMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const flipper = new THREE.Mesh(flipperGeometry, flipperMaterial);
  flipper.position.set(0, -height / 2, -depth / 2);
  flipper.castShadow = true;
  group.add(flipper);

  const FLIPPER_UP_SPEED = 12;
  const FLIPPER_DOWN_SPEED = 4;
  let flipperAngle = 0;
  let flipperActive = false;

  function activateFlipper() {
    if (!hasFlipper) return;
    flipperActive = true;
  }

  let rotation = 0;
  const velocity = { x: 0, z: 0 };
  const mass = options.mass ?? 1;
  const collisionRadius = Math.sqrt((width / 2) ** 2 + (depth / 2) ** 2);
  let hasWheels = true;
  let hasFlipper = true;
  let angularVelocity = 0;

  // Pitch and roll tilt from collision impacts (visual only)
  const TILT_DECAY = 8;    // how fast tilt returns to zero (per second)
  const TILT_MAX = 0.3;    // max tilt in radians (~17 degrees)
  let pitchTilt = 0;       // rotation around X axis (forward/back rock)
  let rollTilt = 0;        // rotation around Z axis (side-to-side rock)

  function applyCustomisation(selections = {}) {
    if ('model' in selections) {
      body.visible = selections.model !== null;
    }
    if ('wheels' in selections) {
      hasWheels = selections.wheels !== null;
      wheels.forEach(w => { w.visible = hasWheels; });
    }
    if ('flipper' in selections) {
      hasFlipper = selections.flipper !== null;
      flipper.visible = hasFlipper;
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
  }

  function reset() {
    group.position.set(startPos.x, groupY, startPos.z);
    rotation = 0;
    group.rotation.y = 0;
    group.rotation.x = 0;
    group.rotation.z = 0;
    velocity.x = 0;
    velocity.z = 0;
    angularVelocity = 0;
    pitchTilt = 0;
    rollTilt = 0;
    hasWheels = true;
    flipperAngle = 0;
    flipperActive = false;
    flipper.rotation.x = 0;
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
    velocity.x += -Math.sin(rotation) * amount;
    velocity.z += -Math.cos(rotation) * amount;
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

    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    // The car is asymmetric in depth: the flipper projects only from the front.
    // Use the four corners of the effective bounding shape to compute the true
    // axis-aligned extents at any rotation, rather than a symmetric rectangle.
    //   halfW          = width/2 + wheelWidth (wheels extend past each side)
    //   frontHalfDepth = depth/2 + flipperDepth*cos(angle) (flipper at front)
    //   backHalfDepth  = depth/2 (back of body, no flipper)
    const halfW = width / 2 + wheelWidth;
    const frontHalfDepth = depth / 2 + (hasFlipper ? flipperDepth * Math.cos(flipperAngle) : 0);
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
    velocity.x *= FRICTION;
    velocity.z *= FRICTION;

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

    // Apply all rotations to the group
    group.rotation.set(pitchTilt, rotation, rollTilt);

    // Flipper animation
    if (flipperActive) {
      flipperAngle += FLIPPER_UP_SPEED * dt;
      if (flipperAngle >= FLIPPER_MAX_ANGLE) {
        flipperAngle = FLIPPER_MAX_ANGLE;
        flipperActive = false;
      }
    } else if (flipperAngle > 0) {
      flipperAngle -= FLIPPER_DOWN_SPEED * dt;
      if (flipperAngle < 0) flipperAngle = 0;
    }
    flipper.rotation.x = -flipperAngle;

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

  return {
    group,
    mesh: body,
    wheels,
    flipper,
    flamethrower,
    flame,
    particles,
    get flipperAngle() { return flipperAngle; },
    get flipperActive() { return flipperActive; },
    get flamethrowerActive() { return flamethrowerActive; },
    get rotation() { return rotation; },
    get velocity() { return velocity; },
    get mass() { return mass; },
    get angularVelocity() { return angularVelocity; },
    get pitchTilt() { return pitchTilt; },
    get rollTilt() { return rollTilt; },
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
    applyAngularImpulse,
    applyImpactTilt,
  };
}
