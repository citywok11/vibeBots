import * as THREE from 'three';

const RESTITUTION = 0.6;
const GRAVITY = 20;

export const ROBOT_BODY_WIDTH = 2;
export const ROBOT_BODY_DEPTH = 3;
const FRICTION = 0.98;
const COLLISION_LATERAL_FRICTION = 0.8;

export function createRobot(startPos = { x: 0, z: 0 }, options = {}) {
  const width = ROBOT_BODY_WIDTH;
  const height = 1;
  const depth = ROBOT_BODY_DEPTH;

  const wheelRadius = options.wheelRadius || 0.6;
  const groupY = wheelRadius + height / 2;

  const group = new THREE.Group();
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

  const wheelOffsetX = width / 2 + wheelWidth / 2;
  const wheelOffsetZ = depth / 2 - 0.4;
  const wheelY = -height / 2;

  const wheelPositions = [
    { x: -wheelOffsetX, z: -wheelOffsetZ },
    { x:  wheelOffsetX, z: -wheelOffsetZ },
    { x: -wheelOffsetX, z:  wheelOffsetZ },
    { x:  wheelOffsetX, z:  wheelOffsetZ },
  ];

  wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(pos.x, wheelY, pos.z);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    group.add(wheel);
  });

  const mass = options.mass ?? 1;
  const collisionRadius = Math.sqrt((width / 2) ** 2 + (depth / 2) ** 2);

  const velocity = { x: 0, z: 0 };
  let velocityY = 0;
  let angularVelocity = 0;

  // Pitch and roll tilt from collision impacts (visual only)
  const TILT_DECAY = 8;
  const TILT_MAX = 0.3;
  let pitchTilt = 0;
  let rollTilt = 0;

  function reset() {
    group.position.set(startPos.x, groupY, startPos.z);
    velocity.x = 0;
    velocity.z = 0;
    velocityY = 0;
    angularVelocity = 0;
    pitchTilt = 0;
    rollTilt = 0;
    group.rotation.set(0, 0, 0);
  }

  function bounceOffWalls(arenaSize) {
    const half = arenaSize / 2;
    const halfExtentX = width / 2;
    const halfExtentZ = depth / 2;

    const limitX = half - halfExtentX;
    const limitZ = half - halfExtentZ;

    let bounced = false;

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

    velocityY -= GRAVITY * dt;
    group.position.y += velocityY * dt;
    if (group.position.y <= groupY) {
      group.position.y = groupY;
      velocityY = 0;
    }
    velocity.x *= FRICTION;
    velocity.z *= FRICTION;

    // Apply angular velocity (yaw spin from collisions)
    const ANGULAR_FRICTION = 0.95;
    group.rotation.y += angularVelocity * dt;
    angularVelocity *= ANGULAR_FRICTION;
    if (Math.abs(angularVelocity) < 0.01) angularVelocity = 0;

    // Decay pitch and roll tilt back to zero
    pitchTilt *= Math.max(0, 1 - TILT_DECAY * dt);
    rollTilt *= Math.max(0, 1 - TILT_DECAY * dt);
    if (Math.abs(pitchTilt) < 0.001) pitchTilt = 0;
    if (Math.abs(rollTilt) < 0.001) rollTilt = 0;

    // Apply pitch and roll (preserve yaw)
    const yaw = group.rotation.y;
    group.rotation.set(pitchTilt, yaw, rollTilt);
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
    get angularVelocity() { return angularVelocity; },
    get pitchTilt() { return pitchTilt; },
    get rollTilt() { return rollTilt; },
    bounceOffWalls,
    update,
    applyCollisionFriction,
    applyAngularImpulse,
    applyImpactTilt,
    reset,
  };
}
