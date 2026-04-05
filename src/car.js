import * as THREE from 'three';

const RESTITUTION = 0.6;
const FRICTION = 0.98;

export function createCar(startPos = { x: 0, z: 0 }, options = {}) {
  const width = 2;
  const height = 1;
  const depth = 3;

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

  const FLAME_DURATION = 0.5;
  let flamethrowerActive = false;
  let flamethrowerTimer = 0;

  function activateFlamethrower() {
    flamethrowerActive = true;
    flamethrowerTimer = FLAME_DURATION;
  }

  // Flipper - wedge at the front of the car
  const flipperWidth = width;
  const flipperHeight = 0.15;
  const flipperDepth = 1.2;
  const flipperGeometry = new THREE.BoxGeometry(flipperWidth, flipperHeight, flipperDepth);
  // Shift geometry pivot to the back edge so it rotates from the hinge point
  flipperGeometry.translate(0, 0, -flipperDepth / 2);
  const flipperMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const flipper = new THREE.Mesh(flipperGeometry, flipperMaterial);
  flipper.position.set(0, -height / 2, -depth / 2);
  flipper.castShadow = true;
  group.add(flipper);

  const FLIPPER_MAX_ANGLE = Math.PI / 3; // 60 degrees
  const FLIPPER_UP_SPEED = 12;
  const FLIPPER_DOWN_SPEED = 4;
  let flipperAngle = 0;
  let flipperActive = false;

  function activateFlipper() {
    flipperActive = true;
  }

  let rotation = 0;
  const velocity = { x: 0, z: 0 };

  function applyCustomisation(selections = {}) {
    if ('model' in selections) {
      body.visible = selections.model !== null;
    }
    if ('wheels' in selections) {
      const show = selections.wheels !== null;
      wheels.forEach(w => { w.visible = show; });
    }
    if ('flipper' in selections) {
      flipper.visible = selections.flipper !== null;
    }
  }

  function reset() {
    group.position.set(startPos.x, groupY, startPos.z);
    rotation = 0;
    group.rotation.y = 0;
    velocity.x = 0;
    velocity.z = 0;
    flipperAngle = 0;
    flipperActive = false;
    flipper.rotation.x = 0;
    flamethrowerActive = false;
    flamethrowerTimer = 0;
    flame.visible = false;
  }

  function accelerate(amount) {
    velocity.x += -Math.sin(rotation) * amount;
    velocity.z += -Math.cos(rotation) * amount;
  }

  function turnLeft(amount) {
    rotation += amount;
    group.rotation.y = rotation;
  }

  function turnRight(amount) {
    rotation -= amount;
    group.rotation.y = rotation;
  }

  function bounceOffWalls(arenaSize) {
    const half = arenaSize / 2;
    let bounced = false;

    const cosR = Math.abs(Math.cos(rotation));
    const sinR = Math.abs(Math.sin(rotation));

    // Effective half-extents include sub-components:
    //   - wheels extend wheelWidth beyond each side of the body
    //   - flipper projects flipperDepth * cos(angle) beyond the front of the body
    const effectiveHalfWidth = width / 2 + wheelWidth;
    const effectiveHalfDepth = depth / 2 + flipperDepth * Math.cos(flipperAngle);

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
    velocity.x *= FRICTION;
    velocity.z *= FRICTION;

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
    if (flamethrowerActive) {
      flamethrowerTimer -= dt;
      if (flamethrowerTimer <= 0) {
        flamethrowerTimer = 0;
        flamethrowerActive = false;
      }
    }
    flame.visible = flamethrowerActive;
  }

  return {
    group,
    mesh: body,
    wheels,
    flipper,
    flamethrower,
    flame,
    get flipperAngle() { return flipperAngle; },
    get flamethrowerActive() { return flamethrowerActive; },
    get rotation() { return rotation; },
    get velocity() { return velocity; },
    accelerate,
    activateFlipper,
    activateFlamethrower,
    turnLeft,
    turnRight,
    bounceOffWalls,
    update,
    reset,
    applyCustomisation,
  };
}
