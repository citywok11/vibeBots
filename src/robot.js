import * as THREE from 'three';

const RESTITUTION = 0.6;
const GRAVITY = 20;

export const ROBOT_BODY_WIDTH = 2;
export const ROBOT_BODY_DEPTH = 3;
const FRICTION = 0.98;
const COLLISION_LATERAL_FRICTION = 0.8;
const SPOKE_COUNT = 4;
const SPOKE_COLOR = 0x888888;
const AXLE_GAP = 0.3;
const AXLE_RADIUS = 0.08;
const AXLE_COLOR = 0x555555;

export function createRobot(startPos = { x: 0, z: 0 }, options = {}) {
  const width = ROBOT_BODY_WIDTH;
  const height = 1;
  const depth = ROBOT_BODY_DEPTH;

  const wheelRadius = options.wheelRadius || 0.6;
  const groupY = wheelRadius + height / 2;

  const group = new THREE.Group();
  group.rotation.order = 'YXZ'; // yaw first, then pitch/roll in body space
  group.position.set(startPos.x, groupY, startPos.z);

  // Body
  const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4444ff });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.castShadow = true;
  group.add(body);

  // Wheels
  const wheelWidth = wheelRadius * 0.5;
  const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const spokeMaterial = new THREE.MeshStandardMaterial({ color: SPOKE_COLOR });
  const axleMaterial = new THREE.MeshStandardMaterial({ color: AXLE_COLOR });
  const axleLength = AXLE_GAP + wheelWidth / 2;
  const axleGeo = new THREE.CylinderGeometry(AXLE_RADIUS, AXLE_RADIUS, axleLength, 8);

  const wheelOffsetX = width / 2 + AXLE_GAP + wheelWidth / 2;
  const wheelOffsetZ = depth / 2 - 0.4;
  const wheelY = -height / 2;

  const wheelPositions = [
    { x: -wheelOffsetX, z: -wheelOffsetZ },
    { x:  wheelOffsetX, z: -wheelOffsetZ },
    { x: -wheelOffsetX, z:  wheelOffsetZ },
    { x:  wheelOffsetX, z:  wheelOffsetZ },
  ];

  const wheels = wheelPositions.map(pos => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(pos.x, wheelY, pos.z);
    wheelGroup.rotation.z = Math.PI / 2;

    // Inner spin group rotates around Y (the cylinder axis) independently
    const spinGroup = new THREE.Group();

    const rim = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rim.castShadow = true;
    spinGroup.add(rim);

    // Spoke markings so rotation is visible
    const spokeWidth = wheelRadius * 0.15;
    const spokeDepth = wheelWidth + 0.01;
    for (let i = 0; i < SPOKE_COUNT; i++) {
      const spokeGeo = new THREE.BoxGeometry(spokeWidth, wheelRadius * 1.8, spokeDepth);
      const spoke = new THREE.Mesh(spokeGeo, spokeMaterial);
      spoke.rotation.y = (Math.PI / SPOKE_COUNT) * i;
      spinGroup.add(spoke);
    }

    wheelGroup.add(spinGroup);

    // Axle pole connecting body to wheel
    const axle = new THREE.Mesh(axleGeo, axleMaterial);
    const sign = Math.sign(pos.x);
    axle.position.y = sign * (axleLength / 2);
    wheelGroup.add(axle);

    group.add(wheelGroup);
    return wheelGroup;
  });

  const mass = options.mass ?? 1;
  const collisionRadius = Math.sqrt((width / 2) ** 2 + (depth / 2) ** 2);

  const AI_SPEED = 8;
  const AI_ACCEL = 15;
  const AI_TURN_SPEED = 2;

  const velocity = { x: 0, z: 0 };
  let velocityY = 0;
  let angularVelocity = 0;

  // Pitch and roll tilt from collision impacts (visual only, small wobble on ground)
  const TILT_DECAY = 8;
  const TILT_MAX = 0.3;
  let pitchTilt = 0;
  let rollTilt = 0;

  // Airborne tumble — full 3D angular velocities applied while in the air
  let pitchVelocity = 0;   // rad/s around local X axis (forward tumble)
  let rollVelocity = 0;    // rad/s around local Z axis (sideways tumble)
  let airPitch = 0;         // accumulated pitch angle while airborne
  let airRoll = 0;          // accumulated roll angle while airborne

  function reset() {
    group.position.set(startPos.x, groupY, startPos.z);
    velocity.x = 0;
    velocity.z = 0;
    velocityY = 0;
    angularVelocity = 0;
    pitchTilt = 0;
    rollTilt = 0;
    pitchVelocity = 0;
    rollVelocity = 0;
    airPitch = 0;
    airRoll = 0;
    group.rotation.set(0, 0, 0);
  }

  function bounceOffWalls(arenaSize) {
    const half = arenaSize / 2;
    let bounced = false;

    const rotation = group.rotation.y;
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    // Compute the axis-aligned bounding box from the four corners of the
    // robot's oriented rectangle so corners can't clip through walls.
    const halfW = width / 2;
    const halfD = depth / 2;

    let maxX = -Infinity, minX = Infinity;
    let maxZ = -Infinity, minZ = Infinity;

    for (const lz of [-halfD, halfD]) {
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

    const wasAirborne = group.position.y > groupY + 0.01;

    velocityY -= GRAVITY * dt;
    group.position.y += velocityY * dt;
    if (group.position.y <= groupY) {
      group.position.y = groupY;
      velocityY = 0;

      // Landing — snap upright and clear tumble state
      if (wasAirborne) {
        pitchVelocity = 0;
        rollVelocity = 0;
        airPitch = 0;
        airRoll = 0;
      }
    }
    velocity.x *= FRICTION;
    velocity.z *= FRICTION;

    const airborne = group.position.y > groupY + 0.01;

    // Apply angular velocity (yaw spin from collisions)
    const ANGULAR_FRICTION = 0.95;
    group.rotation.y += angularVelocity * dt;
    angularVelocity *= ANGULAR_FRICTION;
    if (Math.abs(angularVelocity) < 0.01) angularVelocity = 0;

    if (airborne) {
      // Airborne: integrate pitch/roll angular velocities for free tumbling
      const AIR_ANGULAR_FRICTION = 0.99;
      airPitch += pitchVelocity * dt;
      airRoll += rollVelocity * dt;
      pitchVelocity *= AIR_ANGULAR_FRICTION;
      rollVelocity *= AIR_ANGULAR_FRICTION;

      applyFrameRotation(airPitch, airRoll);
    } else {
      // Grounded: small cosmetic tilt from collisions, decays quickly
      pitchTilt *= Math.max(0, 1 - TILT_DECAY * dt);
      rollTilt *= Math.max(0, 1 - TILT_DECAY * dt);
      if (Math.abs(pitchTilt) < 0.001) pitchTilt = 0;
      if (Math.abs(rollTilt) < 0.001) rollTilt = 0;

      applyFrameRotation(0, 0);
    }

    // Spin wheels based on forward speed
    const angle = group.rotation.y;
    const fwdX = Math.sin(angle);
    const fwdZ = -Math.cos(angle);
    const forwardSpeed = velocity.x * fwdX + velocity.z * fwdZ;
    const spinDelta = (forwardSpeed * dt) / wheelRadius;
    wheels.forEach(w => {
      const spinGroup = w.children[0];
      spinGroup.rotation.y += spinDelta;
    });
  }

  function applyFrameRotation(pitPitch, pitRoll) {
    const yaw = group.rotation.y;
    group.rotation.set(pitchTilt + pitPitch, yaw, rollTilt + pitRoll);
  }

  /**
   * Applies angle-dependent lateral friction to the robot's velocity after a collision.
   *
   * The robot's wheels roll freely along its forward axis but resist sideways movement.
   * The friction applied scales with how perpendicular the collision direction is to the
   * robot's forward axis:
   *   - Collision parallel to wheels (front/rear hit) → no extra friction
   *   - Collision perpendicular to wheels (side hit)  → maximum friction
   *
   * @param {number} nx - X component of the normalised collision direction (car → robot)
   * @param {number} nz - Z component of the normalised collision direction (car → robot)
   */
  function applyCollisionFriction(nx, nz) {
    const angle = group.rotation.y;
    const forwardX = Math.sin(angle);
    const forwardZ = -Math.cos(angle);

    // How perpendicular the collision is to the robot's rolling direction (0 = parallel, 1 = perpendicular)
    const dot = nx * forwardX + nz * forwardZ;
    const perpendicularFactor = 1 - dot * dot;

    // Decompose velocity into forward and lateral components
    const vf = velocity.x * forwardX + velocity.z * forwardZ;
    const vfx = vf * forwardX;
    const vfz = vf * forwardZ;
    const vlx = velocity.x - vfx;
    const vlz = velocity.z - vfz;

    // Damp only the lateral component, scaled by how sideways the hit was
    const lateralDamping = 1 - perpendicularFactor * COLLISION_LATERAL_FRICTION;
    velocity.x = vfx + vlx * lateralDamping;
    velocity.z = vfz + vlz * lateralDamping;
  }

  /**
   * Applies a yaw angular impulse from a collision.
   * @param {number} impulse - Angular velocity change in radians/s
   */
  function applyAngularImpulse(impulse) {
    angularVelocity += impulse;
  }

  /**
   * Applies 3D tumble angular velocities from a flipper launch.
   *
   * The flipper contact position determines which way the robot tumbles:
   *   - pitchImpulse: forward tumble (positive = nose-down, negative = nose-up)
   *   - rollImpulse:  sideways tumble (positive = rolls right, negative = rolls left)
   *   - yawImpulse:   spin around vertical axis
   *
   * @param {number} pitchImpulse - Angular velocity change around X axis (rad/s)
   * @param {number} rollImpulse  - Angular velocity change around Z axis (rad/s)
   * @param {number} [yawImpulse=0] - Angular velocity change around Y axis (rad/s)
   */
  function applyFlipTumble(pitchImpulse, rollImpulse, yawImpulse = 0) {
    pitchVelocity += pitchImpulse;
    rollVelocity += rollImpulse;
    angularVelocity += yawImpulse;
  }

  function isAirborne() {
    return group.position.y > groupY + 0.01;
  }

  /**
   * Simple chase AI: turns to face targetPos and accelerates toward it.
   * Call once per frame before update(dt).
   * Does nothing while the robot is airborne — wheels have no traction.
   *
   * @param {number} dt - Delta time in seconds
   * @param {{ x: number, z: number }} targetPos - World-space position to chase
   */
  function updateAI(dt, targetPos) {
    if (isAirborne()) return;
    const dx = targetPos.x - group.position.x;
    const dz = targetPos.z - group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.1) return;

    // Rotate to face target
    const targetAngle = Math.atan2(dx, -dz);
    let angleDiff = targetAngle - group.rotation.y;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    const maxTurn = AI_TURN_SPEED * dt;
    if (Math.abs(angleDiff) <= maxTurn) {
      group.rotation.y = targetAngle;
    } else {
      group.rotation.y += Math.sign(angleDiff) * maxTurn;
    }

    // Accelerate in the forward direction up to AI_SPEED
    const forwardX = Math.sin(group.rotation.y);
    const forwardZ = -Math.cos(group.rotation.y);
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    if (speed < AI_SPEED) {
      velocity.x += forwardX * AI_ACCEL * dt;
      velocity.z += forwardZ * AI_ACCEL * dt;
      const newSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
      if (newSpeed > AI_SPEED) {
        velocity.x = (velocity.x / newSpeed) * AI_SPEED;
        velocity.z = (velocity.z / newSpeed) * AI_SPEED;
      }
    }
  }

  /**
   * Applies a visual pitch and roll tilt based on the collision impact direction.
   *
   * @param {number} nx - X component of collision normal (world space)
   * @param {number} nz - Z component of collision normal (world space)
   * @param {number} speed - Impact speed (scales tilt magnitude)
   */
  function applyImpactTilt(nx, nz, speed) {
    const TILT_SCALE = 0.04;

    const angle = group.rotation.y;
    const cosR = Math.cos(angle);
    const sinR = Math.sin(angle);
    const localX = nx * cosR - nz * sinR;
    const localZ = nx * sinR + nz * cosR;

    const rawPitch = -localZ * speed * TILT_SCALE;
    const rawRoll = localX * speed * TILT_SCALE;

    pitchTilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, pitchTilt + rawPitch));
    rollTilt = Math.max(-TILT_MAX, Math.min(TILT_MAX, rollTilt + rawRoll));
  }

  return {
    group,
    mesh: body,
    get mass() { return mass; },
    collisionRadius,
    get velocity() { return velocity; },
    get velocityY() { return velocityY; },
    set velocityY(v) { velocityY = v; },
    get groundY() { return groupY; },
    get wheelThicknessHalf() { return wheelWidth / 2; },
    get angularVelocity() { return angularVelocity; },
    get pitchTilt() { return pitchTilt; },
    get rollTilt() { return rollTilt; },
    bounceOffWalls,
    update,
    updateAI,
    applyFrameRotation,
    applyCollisionFriction,
    applyAngularImpulse,
    applyFlipTumble,
    applyImpactTilt,
    reset,
  };
}
