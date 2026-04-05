import { describe, it, expect } from 'vitest';
import { createCar, MODEL_CATALOGUE, WHEEL_CATALOGUE, FLIPPER_CATALOGUE } from '../src/car.js';

describe('Car', () => {
  it('should create a car with a mesh', () => {
    const car = createCar();
    expect(car.mesh).toBeDefined();
    expect(car.mesh.isMesh).toBe(true);
  });

  it('should be a rectangular box shape', () => {
    const car = createCar();
    const params = car.mesh.geometry.parameters;
    expect(params.width).toBeDefined();
    expect(params.height).toBeDefined();
    expect(params.depth).toBeDefined();
    expect(params.depth).toBeGreaterThan(params.width);
  });

  it('should have a group containing body and wheels', () => {
    const car = createCar();
    expect(car.group.isGroup).toBe(true);
    expect(car.group.children).toContain(car.mesh);
  });

  it('should start at a given position or default to origin', () => {
    const car = createCar();
    expect(car.group.position.x).toBe(0);
    expect(car.group.position.z).toBe(0);

    const car2 = createCar({ x: 5, z: 10 });
    expect(car2.group.position.x).toBe(5);
    expect(car2.group.position.z).toBe(10);
  });

  it('should have a forward direction (rotation)', () => {
    const car = createCar();
    expect(car.rotation).toBe(0);
  });

  it('should accelerate forward and move via update', () => {
    const car = createCar();
    car.accelerate(10);
    // Velocity should be set, position unchanged until update
    expect(car.velocity.z).toBeLessThan(0);
    const startZ = car.group.position.z;
    car.update(0.1);
    expect(car.group.position.z).toBeLessThan(startZ);
  });

  it('should accelerate backward and move via update', () => {
    const car = createCar();
    car.accelerate(-10);
    expect(car.velocity.z).toBeGreaterThan(0);
    const startZ = car.group.position.z;
    car.update(0.1);
    expect(car.group.position.z).toBeGreaterThan(startZ);
  });

  it('should turn left and right', () => {
    const car = createCar();
    const startRotation = car.rotation;
    car.turnLeft(0.1);
    expect(car.rotation).toBeGreaterThan(startRotation);
    car.turnRight(0.2);
    expect(car.rotation).toBeLessThan(startRotation);
  });

  it('should accelerate in the rotated direction', () => {
    const car = createCar();
    car.turnLeft(Math.PI / 2); // face -X
    car.accelerate(10);
    expect(car.velocity.x).toBeCloseTo(-10, 0);
    expect(car.velocity.z).toBeCloseTo(0, 0);
  });

  it('should accumulate velocity across multiple accelerations', () => {
    const car = createCar();
    car.accelerate(5);
    car.accelerate(5);
    expect(car.velocity.z).toBeCloseTo(-10, 0);
  });

  it('should expose a mass property', () => {
    const car = createCar();
    expect(typeof car.mass).toBe('number');
    expect(car.mass).toBeGreaterThan(0);
  });

  it('should use a custom mass when provided', () => {
    const car = createCar({}, { mass: 2 });
    expect(car.mass).toBe(2);
  });

  it('should expose a collisionRadius property', () => {
    const car = createCar();
    expect(typeof car.collisionRadius).toBe('number');
    expect(car.collisionRadius).toBeGreaterThan(0);
  });
});

describe('Car wheels', () => {
  it('should have 4 wheels', () => {
    const car = createCar();
    expect(car.wheels).toHaveLength(4);
  });

  it('each wheel should be a mesh with cylinder geometry', () => {
    const car = createCar();
    car.wheels.forEach(wheel => {
      expect(wheel.isMesh).toBe(true);
      expect(wheel.geometry.type).toBe('CylinderGeometry');
    });
  });

  it('should have 2 wheels at the front and 2 at the back', () => {
    const car = createCar();
    // Front wheels have negative local Z, back wheels have positive local Z
    const frontWheels = car.wheels.filter(w => w.position.z < 0);
    const backWheels = car.wheels.filter(w => w.position.z > 0);
    expect(frontWheels).toHaveLength(2);
    expect(backWheels).toHaveLength(2);
  });

  it('should have wheels on left and right sides', () => {
    const car = createCar();
    const leftWheels = car.wheels.filter(w => w.position.x < 0);
    const rightWheels = car.wheels.filter(w => w.position.x > 0);
    expect(leftWheels).toHaveLength(2);
    expect(rightWheels).toHaveLength(2);
  });

  it('should have wheels attached to the car group so they move together', () => {
    const car = createCar();
    car.wheels.forEach(wheel => {
      expect(car.group.children).toContain(wheel);
    });
  });

  it('wheels should be at the bottom of the car body', () => {
    const car = createCar();
    car.wheels.forEach(wheel => {
      expect(wheel.position.y).toBeLessThanOrEqual(0);
    });
  });

  it('should accept a custom wheel radius', () => {
    const car = createCar({ x: 0, z: 0 }, { wheelRadius: 0.8 });
    const params = car.wheels[0].geometry.parameters;
    expect(params.radiusTop).toBeCloseTo(0.8);
    expect(params.radiusBottom).toBeCloseTo(0.8);
  });

  it('should lift the car body based on wheel radius', () => {
    const smallWheels = createCar({ x: 0, z: 0 }, { wheelRadius: 0.5 });
    const bigWheels = createCar({ x: 0, z: 0 }, { wheelRadius: 1.2 });

    // Bigger wheels = higher group Y position
    expect(bigWheels.group.position.y).toBeGreaterThan(smallWheels.group.position.y);
  });

  it('should have wheel bottoms touching the ground (y=0)', () => {
    const radii = [0.5, 0.8, 1.2];
    radii.forEach(r => {
      const car = createCar({ x: 0, z: 0 }, { wheelRadius: r });
      // The wheel center in local space + group Y should place the bottom at y=0
      const wheelWorldY = car.group.position.y + car.wheels[0].position.y;
      expect(wheelWorldY).toBeCloseTo(r, 5);
    });
  });

  it('should default to a reasonable wheel radius when none specified', () => {
    const car = createCar();
    const params = car.wheels[0].geometry.parameters;
    expect(params.radiusTop).toBeGreaterThan(0);
  });

  it('should scale wheel width proportionally to radius', () => {
    const small = createCar({ x: 0, z: 0 }, { wheelRadius: 0.5 });
    const big = createCar({ x: 0, z: 0 }, { wheelRadius: 1.0 });
    const smallWidth = small.wheels[0].geometry.parameters.height; // cylinder "height" = wheel width
    const bigWidth = big.wheels[0].geometry.parameters.height;
    expect(bigWidth).toBeGreaterThan(smallWidth);
  });

  it('should expose groundY equal to the group resting height', () => {
    const car = createCar({ x: 0, z: 0 }, { wheelRadius: 0.6 });
    expect(car.groundY).toBeCloseTo(0.6 + 0.5); // wheelRadius + bodyHeight/2
    expect(car.groundY).toBeCloseTo(car.group.position.y);
  });

  it('groundY should scale with custom wheel radius', () => {
    const car = createCar({ x: 0, z: 0 }, { wheelRadius: 1.0 });
    expect(car.groundY).toBeCloseTo(1.0 + 0.5);
  });

  it('groundY should remain constant even when group.position.y is changed', () => {
    const car = createCar({ x: 0, z: 0 }, { wheelRadius: 0.6 });
    const originalGroundY = car.groundY;
    car.group.position.y = -3;
    expect(car.groundY).toBeCloseTo(originalGroundY);
  });
});

describe('Car flipper', () => {
  it('should have a flipper attached to the car group', () => {
    const car = createCar();
    expect(car.flipper).toBeDefined();
    expect(car.flipper.isMesh).toBe(true);
    expect(car.group.children).toContain(car.flipper);
  });

  it('should position the flipper at the front of the car', () => {
    const car = createCar();
    // Front is negative Z in local space
    expect(car.flipper.position.z).toBeLessThan(0);
  });

  it('should position the flipper at the bottom of the body', () => {
    const car = createCar();
    expect(car.flipper.position.y).toBeLessThanOrEqual(0);
  });

  it('should have the flipper span the width of the car', () => {
    const car = createCar();
    const params = car.flipper.geometry.parameters;
    // Flipper width should be close to the car body width
    expect(params.width).toBeCloseTo(2, 0);
  });

  it('should start with flipper in the down (resting) position', () => {
    const car = createCar();
    expect(car.flipperAngle).toBe(0);
  });

  it('should activate the flipper (flip up)', () => {
    const car = createCar();
    car.activateFlipper();
    car.update(0.016);
    expect(car.flipperAngle).toBeGreaterThan(0);
  });

  it('should animate the flipper over time when activated', () => {
    const car = createCar();
    car.activateFlipper();
    const angle1 = car.flipperAngle;
    car.update(0.05);
    const angle2 = car.flipperAngle;
    // Should be animating toward max
    expect(angle2).toBeGreaterThanOrEqual(angle1);
  });

  it('should automatically return the flipper to resting position', () => {
    const car = createCar();
    car.activateFlipper();
    // Simulate enough time for full flip cycle
    for (let i = 0; i < 100; i++) {
      car.update(0.05);
    }
    expect(car.flipperAngle).toBeCloseTo(0, 1);
  });

  it('should not exceed the max flipper angle', () => {
    const car = createCar();
    car.activateFlipper();
    for (let i = 0; i < 200; i++) {
      car.update(0.016);
    }
    // Should always stay within bounds
    expect(car.flipperAngle).toBeGreaterThanOrEqual(0);
    expect(car.flipperAngle).toBeLessThanOrEqual(Math.PI / 2);
  });
});

describe('Car velocity and wall collision', () => {
  it('should start with zero velocity', () => {
    const car = createCar();
    expect(car.velocity.x).toBe(0);
    expect(car.velocity.z).toBe(0);
  });

  it('should bounce off the north wall (-Z) and reverse Z velocity', () => {
    const arenaSize = 50;
    const car = createCar({ x: 0, z: -24 });
    car.accelerate(30);
    car.update(1); // move into the wall
    const result = car.bounceOffWalls(arenaSize);

    expect(result.bounced).toBe(true);
    expect(car.velocity.z).toBeGreaterThan(0);
    expect(car.group.position.z).toBeGreaterThanOrEqual(-arenaSize / 2);
  });

  it('should bounce off the south wall (+Z) and reverse Z velocity', () => {
    const arenaSize = 50;
    const car = createCar({ x: 0, z: 24 });
    car.accelerate(-30);
    car.update(1);
    const result = car.bounceOffWalls(arenaSize);

    expect(result.bounced).toBe(true);
    expect(car.velocity.z).toBeLessThan(0);
    expect(car.group.position.z).toBeLessThanOrEqual(arenaSize / 2);
  });

  it('should bounce off the west wall (-X) and reverse X velocity', () => {
    const arenaSize = 50;
    const car = createCar({ x: -24, z: 0 });
    car.turnLeft(Math.PI / 2);
    car.accelerate(30);
    car.update(1);
    const result = car.bounceOffWalls(arenaSize);

    expect(result.bounced).toBe(true);
    expect(car.velocity.x).toBeGreaterThan(0);
    expect(car.group.position.x).toBeGreaterThanOrEqual(-arenaSize / 2);
  });

  it('should bounce off the east wall (+X) and reverse X velocity', () => {
    const arenaSize = 50;
    const car = createCar({ x: 24, z: 0 });
    car.turnRight(Math.PI / 2);
    car.accelerate(30);
    car.update(1);
    const result = car.bounceOffWalls(arenaSize);

    expect(result.bounced).toBe(true);
    expect(car.velocity.x).toBeLessThan(0);
    expect(car.group.position.x).toBeLessThanOrEqual(arenaSize / 2);
  });

  it('should not bounce when inside the arena', () => {
    const arenaSize = 50;
    const car = createCar();
    car.accelerate(5);
    car.update(0.1);
    const result = car.bounceOffWalls(arenaSize);

    expect(result.bounced).toBe(false);
  });

  it('should lose energy on bounce (restitution < 1)', () => {
    const arenaSize = 50;
    const car = createCar({ x: 0, z: -24 });
    car.accelerate(30);
    car.update(1);
    const speedBefore = Math.abs(car.velocity.z);
    car.bounceOffWalls(arenaSize);
    const speedAfter = Math.abs(car.velocity.z);

    expect(speedAfter).toBeLessThan(speedBefore);
    expect(speedAfter).toBeGreaterThan(0);
  });

  it('should apply velocity decay over time via update', () => {
    const car = createCar();
    car.accelerate(10);
    car.update(0.016);
    const vAfter1 = Math.abs(car.velocity.z);
    car.update(0.016);
    const vAfter2 = Math.abs(car.velocity.z);

    expect(vAfter2).toBeLessThan(vAfter1);
  });

  it('should account for car body size when bouncing (not just center point)', () => {
    const arenaSize = 50;
    const half = arenaSize / 2;
    // Car is 2 wide x 3 deep. At rotation=0, depth is along Z.
    // Car half-depth = 1.5, so car edge should stop at wall, not center.
    const car = createCar({ x: 0, z: -(half - 1) });
    car.accelerate(10);
    car.update(1);
    car.bounceOffWalls(arenaSize);

    // Car center should be at least half-depth (1.5) away from the wall
    expect(car.group.position.z).toBeGreaterThanOrEqual(-half + 1.5);
  });

  it('should account for car width when bouncing sideways', () => {
    const arenaSize = 50;
    const half = arenaSize / 2;
    // Car is 2 wide. At rotation=0, width is along X. Half-width = 1.
    const car = createCar({ x: half - 0.5, z: 0 });
    car.turnRight(Math.PI / 2);
    car.accelerate(10);
    car.update(1);
    car.bounceOffWalls(arenaSize);

    // Car center should be at least half-depth (1.5) from east wall when rotated 90 degrees
    // (depth axis is now along X)
    expect(car.group.position.x).toBeLessThanOrEqual(half - 1.5);
  });

  it('should compute correct bounds when car is rotated 45 degrees', () => {
    const arenaSize = 50;
    const half = arenaSize / 2;
    const car = createCar({ x: 0, z: -(half - 1) });
    car.turnLeft(Math.PI / 4); // 45 degrees
    car.accelerate(10);
    car.update(1);
    car.bounceOffWalls(arenaSize);

    // At 45 degrees, the car's Z footprint is:
    // (|cos(45)| * depth + |sin(45)| * width) / 2
    // = (0.707 * 3 + 0.707 * 2) / 2 ≈ 1.77
    const expectedMargin = (Math.abs(Math.cos(Math.PI / 4)) * 3 + Math.abs(Math.sin(Math.PI / 4)) * 2) / 2;
    expect(car.group.position.z).toBeGreaterThanOrEqual(-half + expectedMargin - 0.01);
  });

  it('should preserve bounce velocity even when accelerating next frame', () => {
    const arenaSize = 50;
    const car = createCar({ x: 0, z: -24 });
    // Build up speed toward the wall
    car.accelerate(50);
    car.update(1);
    car.bounceOffWalls(arenaSize);

    const bounceVelocity = car.velocity.z;
    expect(bounceVelocity).toBeGreaterThan(0);

    // Next frame: small acceleration toward wall shouldn't overwrite bounce
    car.accelerate(2);
    expect(car.velocity.z).toBeGreaterThan(0);
  });
});

describe('Car sub-component collision detection (wheels and flipper)', () => {
  // Default geometry constants (mirrored from car.js for clarity in tests)
  // width=2, depth=3, wheelRadius=0.6, wheelWidth=0.3, flipperDepth=1.2
  // halfW          = width/2 + wheelWidth = 1 + 0.3 = 1.3
  // frontHalfDepth (flat)  = depth/2 + flipperDepth*cos(0)   = 1.5 + 1.2 = 2.7
  // frontHalfDepth (60deg) = depth/2 + flipperDepth*cos(π/3) = 1.5 + 0.6 = 2.1
  // backHalfDepth          = depth/2 = 1.5   (no flipper at the back)
  // With arenaSize=50 (half=25) at rotation=0:
  //   wheel  limitX            = 25 - 1.3 = 23.7
  //   front (flipper) limitZ   = 25 - 2.7 = 22.3  (north wall, flipper faces north)
  //   front (60°) limitZ       = 25 - 2.1 = 22.9
  //   back  limitZ             = 25 - 1.5 = 23.5  (south wall, back faces south)

  describe('Wheel collision', () => {
    it('should bounce off the east wall when the wheel extends into it even though the body centre is clear', () => {
      // body-only limitX = 25 - 1 = 24; wheel limitX = 25 - 1.3 = 23.7
      // At x=23.8: old code → no bounce (23.8 < 24), new code → bounce (23.8 > 23.7)
      const arenaSize = 50;
      const car = createCar({ x: 23.8, z: 0 });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });

    it('should bounce off the west wall when the wheel extends into it even though the body centre is clear', () => {
      const arenaSize = 50;
      const car = createCar({ x: -23.8, z: 0 });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });

    it('should not bounce when all wheels are inside the arena', () => {
      // wheel outer edge at x = 23 + 1.3 = 24.3, well inside 25
      const arenaSize = 50;
      const car = createCar({ x: 23, z: 0 });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(false);
    });

    it('should clamp position so no wheel extends beyond the arena wall', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      // effectiveHalfWidth = width/2 + wheelWidth = 1 + (0.6 * 0.5) = 1.3
      const effectiveHalfWidth = 2 / 2 + 0.6 * 0.5;

      const car = createCar({ x: 40, z: 0 }); // well past the east wall
      car.bounceOffWalls(arenaSize);
      // After clamping, the wheel outer edge must sit at or inside the arena wall
      expect(car.group.position.x + effectiveHalfWidth).toBeLessThanOrEqual(half + 0.001);
    });
  });

  describe('Asymmetric front/back collision (flipper only at front)', () => {
    // The car is NOT symmetric in depth: the flipper only projects from the front.
    // frontHalfDepth (flat) = depth/2 + flipperDepth = 1.5 + 1.2 = 2.7
    // backHalfDepth          = depth/2               = 1.5
    // With arenaSize=50 (half=25):
    //   front limit (toward north wall) = 25 - 2.7 = 22.3  (flipper tip touches wall)
    //   back  limit (toward south wall) = 25 - 1.5 = 23.5  (back body edge touches wall)
    const CAR_DEPTH = 3; // matches depth constant in car.js

    it('should not bounce off the south wall when facing north and the back end is clear', () => {
      // Car at z=22.5, rotation=0 (facing north, flipper at front/north, back at south).
      // Back of body at 22.5 + 1.5 = 24.0 — safely inside south wall at 25.
      // Old (buggy) code used symmetric depth 2.7 → limit = 22.3 → 22.5 > 22.3 → false bounce.
      const arenaSize = 50;
      const car = createCar({ x: 0, z: 22.5 });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(false);
    });

    it('should bounce off the south wall when facing north and the back end reaches the wall', () => {
      // Car at z=23.6, rotation=0. Back at 23.6 + 1.5 = 25.1 — past south wall.
      const arenaSize = 50;
      const car = createCar({ x: 0, z: 23.6 });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });

    it('should clamp south wall collision to back half-depth when facing north', () => {
      // Car launched well past south wall (rotation=0, back facing south).
      // After clamping, the back edge (car.z + backHalfDepth) should sit at the wall.
      const arenaSize = 50;
      const half = arenaSize / 2;
      const backHalfDepth = CAR_DEPTH / 2;
      const car = createCar({ x: 0, z: 40 });
      car.bounceOffWalls(arenaSize);
      expect(car.group.position.z + backHalfDepth).toBeCloseTo(half, 5);
    });

    it('should not bounce off the north wall when facing south and the back end is clear', () => {
      // Car at z=-22.5, rotation=π (facing south, back faces north).
      // Back of body at -22.5 - 1.5 = -24.0 — inside north wall at -25.
      const arenaSize = 50;
      const car = createCar({ x: 0, z: -22.5 });
      car.turnLeft(Math.PI); // rotation = π → facing south, back toward north
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(false);
    });

    it('should clamp north wall collision to back half-depth when facing south', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      const backHalfDepth = CAR_DEPTH / 2;
      const car = createCar({ x: 0, z: -40 });
      car.turnLeft(Math.PI);
      car.bounceOffWalls(arenaSize);
      // Back of car (at car.z - backHalfDepth when rotation=π) sits at north wall
      expect(car.group.position.z - backHalfDepth).toBeCloseTo(-half, 5);
    });
  });

  describe('Flipper deselected collision', () => {
    // When flipper is deselected, effectiveHalfDepth = depth/2 = 1.5 only (no flipper contribution)
    // With arenaSize=50 (half=25): limitZ = 25 - 1.5 = 23.5

    it('should not include flipper depth when flipper is deselected', () => {
      // At z=-23: with flipper → bounces (limitZ=22.3); without flipper → no bounce (limitZ=23.5)
      const arenaSize = 50;
      const car = createCar({ x: 0, z: -23 });
      car.applyCustomisation({ flipper: null });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(false);
    });

    it('should bounce using body-only depth when flipper is deselected', () => {
      // At z=-23.8: body limitZ = 25 - 1.5 = 23.5 → should bounce even without flipper
      const arenaSize = 50;
      const car = createCar({ x: 0, z: -23.8 });
      car.applyCustomisation({ flipper: null });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });

    it('should restore flipper collision depth when flipper is re-selected', () => {
      // At z=-23: no bounce when flipper absent, but should bounce once flipper is re-selected
      const arenaSize = 50;
      const car = createCar({ x: 0, z: -23 });
      car.applyCustomisation({ flipper: null });
      expect(car.bounceOffWalls(arenaSize).bounced).toBe(false);
      car.group.position.z = -23; // reset position
      car.applyCustomisation({ flipper: 'standard' });
      expect(car.bounceOffWalls(arenaSize).bounced).toBe(true);
    });
  });

  describe('Flipper collision', () => {
    it('should bounce off the north wall when the flat flipper extends into it even though the body centre is clear', () => {
      // body-only limitZ = 25 - 1.5 = 23.5; flipper limitZ (flat) = 25 - 2.7 = 22.3
      // At z=-23: old code → no bounce (23 < 23.5), new code → bounce (23 > 22.3)
      const arenaSize = 50;
      const car = createCar({ x: 0, z: -23 });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });

    it('should bounce off the south wall when the flat flipper faces south and extends into it', () => {
      // Rotate car 180°: flipper now faces +Z (south wall)
      const arenaSize = 50;
      const car = createCar({ x: 0, z: 23 });
      car.turnLeft(Math.PI);
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });

    it('should not bounce when the flat flipper is inside the arena', () => {
      // flipper tip at z = -22 - 2.7 = -24.7, inside the north wall at -25
      const arenaSize = 50;
      const car = createCar({ x: 0, z: -22 });
      const result = car.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(false);
    });

    it('should allow the car closer to the wall when the flipper is fully raised', () => {
      // flat  (angle=0):   limitZ = 25 - 2.7 = 22.3 → car at -22.5 bounces
      // raised (angle=60°): limitZ = 25 - 2.1 = 22.9 → car at -22.5 does NOT bounce
      const arenaSize = 50;

      const carFlat = createCar({ x: 0, z: -22.5 });
      expect(carFlat.bounceOffWalls(arenaSize).bounced).toBe(true);

      const carRaised = createCar({ x: 0, z: -22.5 });
      carRaised.activateFlipper();
      carRaised.update(0.1); // 0.1s × 12 rad/s = 1.2 rad > π/3 → clamped at max angle
      expect(carRaised.bounceOffWalls(arenaSize).bounced).toBe(false);
    });

    it('should clamp position so the flat flipper tip does not extend beyond the arena wall', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      const flipperDepth = 1.2;
      const halfBodyDepth = 3 / 2; // car depth / 2

      const car = createCar({ x: 0, z: -40 }); // well past the north wall
      car.bounceOffWalls(arenaSize);
      // Flipper tip in car-group space: position.z - halfBodyDepth - flipperDepth*cos(0)
      const flipperTip = car.group.position.z - halfBodyDepth - flipperDepth;
      expect(flipperTip).toBeGreaterThanOrEqual(-half - 0.001);
    });
  });

  describe('reset()', () => {
    it('should restore position to startPos', () => {
      const car = createCar({ x: 5, z: 10 });
      car.accelerate(20);
      car.update(1);
      car.reset();
      expect(car.group.position.x).toBe(5);
      expect(car.group.position.z).toBe(10);
    });

    it('should zero out velocity', () => {
      const car = createCar();
      car.accelerate(20);
      car.reset();
      expect(car.velocity.x).toBe(0);
      expect(car.velocity.z).toBe(0);
    });

    it('should reset rotation to 0', () => {
      const car = createCar();
      car.turnLeft(1.5);
      car.reset();
      expect(car.rotation).toBe(0);
      expect(car.group.rotation.y).toBe(0);
    });

    it('should reset flipper angle to 0', () => {
      const car = createCar();
      car.activateFlipper();
      car.update(0.5);
      car.reset();
      expect(car.flipperAngle).toBe(0);
    });
  });
});

describe('Car flamethrower', () => {
  it('should have a flamethrower barrel attached to the car group', () => {
    const car = createCar();
    expect(car.flamethrower).toBeDefined();
    expect(car.flamethrower.isMesh).toBe(true);
    expect(car.group.children).toContain(car.flamethrower);
  });

  it('should have a flame mesh attached to the car group', () => {
    const car = createCar();
    expect(car.flame).toBeDefined();
    expect(car.flame.isMesh).toBe(true);
    expect(car.group.children).toContain(car.flame);
  });

  it('should position the flamethrower barrel at the middle of the car (z ≈ 0)', () => {
    const car = createCar();
    expect(car.flamethrower.position.z).toBeCloseTo(0, 5);
  });

  it('should position the flamethrower barrel on top of the car body', () => {
    const car = createCar();
    expect(car.flamethrower.position.y).toBeGreaterThan(0);
  });

  it('should position the flamethrower barrel at the horizontal center of the car (x = 0)', () => {
    const car = createCar();
    expect(car.flamethrower.position.x).toBeCloseTo(0, 5);
  });

  it('should start with the flamethrower inactive', () => {
    const car = createCar();
    expect(car.flamethrowerActive).toBe(false);
  });

  it('should start with the flame hidden', () => {
    const car = createCar();
    expect(car.flame.visible).toBe(false);
  });

  it('should activate the flamethrower when activateFlamethrower() is called', () => {
    const car = createCar();
    car.activateFlamethrower();
    expect(car.flamethrowerActive).toBe(true);
  });

  it('should show the flame when the flamethrower is active', () => {
    const car = createCar();
    car.activateFlamethrower();
    car.update(0.016);
    expect(car.flame.visible).toBe(true);
  });

  it('should stay active while activateFlamethrower is held (channel behaviour)', () => {
    const car = createCar();
    car.activateFlamethrower();
    for (let i = 0; i < 50; i++) {
      car.update(0.02);
    }
    expect(car.flamethrowerActive).toBe(true);
    expect(car.flame.visible).toBe(true);
  });

  it('should deactivate when deactivateFlamethrower() is called', () => {
    const car = createCar();
    car.activateFlamethrower();
    car.update(0.016);
    car.deactivateFlamethrower();
    car.update(0.016);
    expect(car.flamethrowerActive).toBe(false);
    expect(car.flame.visible).toBe(false);
  });

  it('should reset flamethrower state on reset()', () => {
    const car = createCar();
    car.activateFlamethrower();
    car.update(0.016);
    car.reset();
    expect(car.flamethrowerActive).toBe(false);
    expect(car.flame.visible).toBe(false);
  });

  it('should have flame particles attached to the car group', () => {
    const car = createCar();
    expect(car.particles).toBeDefined();
    expect(car.particles.length).toBeGreaterThan(0);
    car.particles.forEach(p => {
      expect(car.group.children).toContain(p.mesh);
    });
  });

  it('should hide particles when flamethrower is inactive', () => {
    const car = createCar();
    car.update(0.016);
    car.particles.forEach(p => {
      expect(p.mesh.visible).toBe(false);
    });
  });

  it('should show particles when flamethrower is active', () => {
    const car = createCar();
    car.activateFlamethrower();
    car.update(0.1);
    const anyVisible = car.particles.some(p => p.mesh.visible);
    expect(anyVisible).toBe(true);
  });

  it('should hide particles after flamethrower is deactivated', () => {
    const car = createCar();
    car.activateFlamethrower();
    car.update(0.1);
    car.deactivateFlamethrower();
    car.update(0.016);
    car.particles.forEach(p => {
      expect(p.mesh.visible).toBe(false);
    });
  });

  it('should reset particle visibility on reset()', () => {
    const car = createCar();
    car.activateFlamethrower();
    car.update(0.1);
    car.reset();
    car.particles.forEach(p => {
      expect(p.mesh.visible).toBe(false);
    });
  });
});

describe('Car applyCustomisation()', () => {
  it('should expose an applyCustomisation method', () => {
    const car = createCar();
    expect(typeof car.applyCustomisation).toBe('function');
  });

  it('should hide the flipper when flipper selection is null', () => {
    const car = createCar();
    car.applyCustomisation({ flipper: null });
    expect(car.flipper.visible).toBe(false);
  });

  it('should show the flipper when flipper selection is standard', () => {
    const car = createCar();
    car.flipper.visible = false;
    car.applyCustomisation({ flipper: 'standard' });
    expect(car.flipper.visible).toBe(true);
  });

  it('should hide all wheels when wheels selection is null', () => {
    const car = createCar();
    car.applyCustomisation({ wheels: null });
    car.wheels.forEach(wheel => {
      expect(wheel.visible).toBe(false);
    });
  });

  it('should show all wheels when wheels selection is standard', () => {
    const car = createCar();
    car.wheels.forEach(w => { w.visible = false; });
    car.applyCustomisation({ wheels: 'standard' });
    car.wheels.forEach(wheel => {
      expect(wheel.visible).toBe(true);
    });
  });

  it('should hide the body mesh when model selection is null', () => {
    const car = createCar();
    car.applyCustomisation({ model: null });
    expect(car.mesh.visible).toBe(false);
  });

  it('should show the body mesh when model selection is standard', () => {
    const car = createCar();
    car.mesh.visible = false;
    car.applyCustomisation({ model: 'standard' });
    expect(car.mesh.visible).toBe(true);
  });

  it('should apply all three selections at once', () => {
    const car = createCar();
    car.applyCustomisation({ model: null, wheels: null, flipper: null });
    expect(car.mesh.visible).toBe(false);
    car.wheels.forEach(wheel => expect(wheel.visible).toBe(false));
    expect(car.flipper.visible).toBe(false);
  });

  it('should apply mixed selections correctly', () => {
    const car = createCar();
    car.applyCustomisation({ model: 'standard', wheels: null, flipper: 'standard' });
    expect(car.mesh.visible).toBe(true);
    car.wheels.forEach(wheel => expect(wheel.visible).toBe(false));
    expect(car.flipper.visible).toBe(true);
  });

  it('should ignore unknown keys and not throw', () => {
    const car = createCar();
    expect(() => car.applyCustomisation({ unknown: 'value' })).not.toThrow();
  });

  it('should not affect flamethrower visibility', () => {
    const car = createCar();
    car.applyCustomisation({ model: null, wheels: null, flipper: null });
    expect(car.flamethrower.visible).toBe(true);
  });

  it('should prevent accelerate when wheels are deselected', () => {
    const car = createCar();
    car.applyCustomisation({ wheels: null });
    car.accelerate(10);
    expect(car.velocity.x).toBe(0);
    expect(car.velocity.z).toBe(0);
  });

  it('should prevent turnLeft when wheels are deselected', () => {
    const car = createCar();
    const initialRotation = car.rotation;
    car.applyCustomisation({ wheels: null });
    car.turnLeft(1);
    expect(car.rotation).toBe(initialRotation);
  });

  it('should prevent turnRight when wheels are deselected', () => {
    const car = createCar();
    const initialRotation = car.rotation;
    car.applyCustomisation({ wheels: null });
    car.turnRight(1);
    expect(car.rotation).toBe(initialRotation);
  });

  it('should allow movement again when wheels are re-selected after being deselected', () => {
    const car = createCar();
    car.applyCustomisation({ wheels: null });
    car.accelerate(10);
    expect(car.velocity.x).toBe(0);
    car.applyCustomisation({ wheels: 'standard' });
    car.accelerate(10);
    expect(Math.abs(car.velocity.x) + Math.abs(car.velocity.z)).toBeGreaterThan(0);
  });

  it('should prevent activateFlipper when flipper is deselected', () => {
    const car = createCar();
    car.applyCustomisation({ flipper: null });
    car.activateFlipper();
    car.update(0.5);
    expect(car.flipperAngle).toBe(0);
  });

  it('should allow activateFlipper again when flipper is re-selected after being deselected', () => {
    const car = createCar();
    car.applyCustomisation({ flipper: null });
    car.activateFlipper();
    car.update(0.5);
    expect(car.flipperAngle).toBe(0);
    car.applyCustomisation({ flipper: 'standard' });
    car.activateFlipper();
    car.update(0.5);
    expect(car.flipperAngle).toBeGreaterThan(0);
  });

  it('should hide the flamethrower barrel when flamethrower selection is null', () => {
    const car = createCar();
    car.applyCustomisation({ flamethrower: null });
    expect(car.flamethrower.visible).toBe(false);
  });

  it('should show the flamethrower barrel when flamethrower selection is standard', () => {
    const car = createCar();
    car.flamethrower.visible = false;
    car.applyCustomisation({ flamethrower: 'standard' });
    expect(car.flamethrower.visible).toBe(true);
  });

  it('should prevent activateFlamethrower when flamethrower is deselected', () => {
    const car = createCar();
    car.applyCustomisation({ flamethrower: null });
    car.activateFlamethrower();
    car.update(0.016);
    expect(car.flamethrowerActive).toBe(false);
    expect(car.flame.visible).toBe(false);
  });

  it('should allow activateFlamethrower again when flamethrower is re-selected after being deselected', () => {
    const car = createCar();
    car.applyCustomisation({ flamethrower: null });
    car.activateFlamethrower();
    car.update(0.016);
    expect(car.flamethrowerActive).toBe(false);
    car.applyCustomisation({ flamethrower: 'standard' });
    car.activateFlamethrower();
    car.update(0.016);
    expect(car.flamethrowerActive).toBe(true);
    expect(car.flame.visible).toBe(true);
  });

  it('should hide flame and particles immediately when flamethrower is deselected while active', () => {
    const car = createCar();
    car.activateFlamethrower();
    car.update(0.1);
    car.applyCustomisation({ flamethrower: null });
    expect(car.flame.visible).toBe(false);
    car.particles.forEach(p => {
      expect(p.mesh.visible).toBe(false);
    });
  });
});

describe('Car angular velocity (yaw spin from collisions)', () => {
  it('should expose an angularVelocity property starting at zero', () => {
    const car = createCar();
    expect(car.angularVelocity).toBe(0);
  });

  it('should expose an applyAngularImpulse method', () => {
    const car = createCar();
    expect(typeof car.applyAngularImpulse).toBe('function');
  });

  it('should change angularVelocity when applyAngularImpulse is called', () => {
    const car = createCar();
    car.applyAngularImpulse(2);
    expect(car.angularVelocity).toBe(2);
  });

  it('should accumulate angular impulses', () => {
    const car = createCar();
    car.applyAngularImpulse(1);
    car.applyAngularImpulse(0.5);
    expect(car.angularVelocity).toBeCloseTo(1.5);
  });

  it('should rotate the car over time based on angularVelocity', () => {
    const car = createCar();
    car.applyAngularImpulse(5);
    const rotBefore = car.rotation;
    car.update(0.1);
    expect(car.rotation).not.toBe(rotBefore);
  });

  it('should apply angular friction so angularVelocity decays over time', () => {
    const car = createCar();
    car.applyAngularImpulse(5);
    car.update(0.1);
    expect(car.angularVelocity).toBeLessThan(5);
    expect(car.angularVelocity).toBeGreaterThan(0);
  });

  it('should eventually stop spinning (angular velocity decays to zero)', () => {
    const car = createCar();
    car.applyAngularImpulse(2);
    for (let i = 0; i < 200; i++) car.update(0.016);
    expect(car.angularVelocity).toBe(0);
  });

  it('should reset angularVelocity on reset()', () => {
    const car = createCar();
    car.applyAngularImpulse(5);
    car.update(0.1);
    car.reset();
    expect(car.angularVelocity).toBe(0);
  });
});

describe('Car collision tilt (pitch and roll)', () => {
  it('should expose pitchTilt and rollTilt properties starting at zero', () => {
    const car = createCar();
    expect(car.pitchTilt).toBe(0);
    expect(car.rollTilt).toBe(0);
  });

  it('should expose an applyImpactTilt method', () => {
    const car = createCar();
    expect(typeof car.applyImpactTilt).toBe('function');
  });

  it('should set pitchTilt when hit from the front (negative Z in local frame)', () => {
    const car = createCar();
    // Hit from the front: normal pointing toward car = (0, 1) in world with rotation 0
    car.applyImpactTilt(0, 1, 5);
    expect(car.pitchTilt).not.toBe(0);
  });

  it('should set rollTilt when hit from the side', () => {
    const car = createCar();
    // Hit from the right side: normal pointing toward car = (-1, 0)
    car.applyImpactTilt(-1, 0, 5);
    expect(car.rollTilt).not.toBe(0);
  });

  it('should clamp tilt to maximum value', () => {
    const car = createCar();
    car.applyImpactTilt(1, 0, 1000);
    expect(Math.abs(car.rollTilt)).toBeLessThanOrEqual(0.3 + 0.001);
    expect(Math.abs(car.pitchTilt)).toBeLessThanOrEqual(0.3 + 0.001);
  });

  it('should decay tilt back to zero over time', () => {
    const car = createCar();
    car.applyImpactTilt(1, 1, 5);
    const pitchBefore = Math.abs(car.pitchTilt);
    car.update(0.1);
    expect(Math.abs(car.pitchTilt)).toBeLessThan(pitchBefore);
  });

  it('should fully decay tilt to zero after enough time', () => {
    const car = createCar();
    car.applyImpactTilt(1, 1, 5);
    for (let i = 0; i < 200; i++) car.update(0.016);
    expect(car.pitchTilt).toBe(0);
    expect(car.rollTilt).toBe(0);
  });

  it('should reset pitchTilt and rollTilt on reset()', () => {
    const car = createCar();
    car.applyImpactTilt(1, 1, 5);
    car.reset();
    expect(car.pitchTilt).toBe(0);
    expect(car.rollTilt).toBe(0);
  });

  it('should apply tilt relative to car rotation', () => {
    // Car rotated 90 degrees: a world-space X hit should now affect pitch, not roll
    const car1 = createCar();
    car1.applyImpactTilt(1, 0, 5); // side hit → roll
    const roll1 = car1.rollTilt;

    const car2 = createCar();
    car2.turnLeft(Math.PI / 2); // rotate 90°
    car2.applyImpactTilt(1, 0, 5); // same world-space hit, but now it's a front hit in local frame
    const roll2 = car2.rollTilt;

    // car1 should have more roll than car2 (car2's hit went to pitch instead)
    expect(Math.abs(roll1)).toBeGreaterThan(Math.abs(roll2));
  });
});

describe('Component catalogues', () => {
  it('MODEL_CATALOGUE should have at least 3 entries', () => {
    expect(MODEL_CATALOGUE.length).toBeGreaterThanOrEqual(3);
  });

  it('every MODEL_CATALOGUE entry should have id, label, mass, width, height, depth, color', () => {
    MODEL_CATALOGUE.forEach(spec => {
      expect(typeof spec.id).toBe('string');
      expect(typeof spec.label).toBe('string');
      expect(typeof spec.mass).toBe('number');
      expect(spec.mass).toBeGreaterThan(0);
      expect(typeof spec.width).toBe('number');
      expect(typeof spec.height).toBe('number');
      expect(typeof spec.depth).toBe('number');
    });
  });

  it('MODEL_CATALOGUE should include standard, wedge and heavy entries', () => {
    const ids = MODEL_CATALOGUE.map(m => m.id);
    expect(ids).toContain('standard');
    expect(ids).toContain('wedge');
    expect(ids).toContain('heavy');
  });

  it('model variants should have different mass values', () => {
    const masses = MODEL_CATALOGUE.map(m => m.mass);
    const unique = new Set(masses);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('WHEEL_CATALOGUE should have at least 3 entries', () => {
    expect(WHEEL_CATALOGUE.length).toBeGreaterThanOrEqual(3);
  });

  it('every WHEEL_CATALOGUE entry should have id, label, radius, friction, velocityMult, color', () => {
    WHEEL_CATALOGUE.forEach(spec => {
      expect(typeof spec.id).toBe('string');
      expect(typeof spec.label).toBe('string');
      expect(typeof spec.radius).toBe('number');
      expect(spec.radius).toBeGreaterThan(0);
      expect(typeof spec.friction).toBe('number');
      expect(typeof spec.velocityMult).toBe('number');
    });
  });

  it('WHEEL_CATALOGUE should include standard, offroad and racing entries', () => {
    const ids = WHEEL_CATALOGUE.map(w => w.id);
    expect(ids).toContain('standard');
    expect(ids).toContain('offroad');
    expect(ids).toContain('racing');
  });

  it('wheel variants should have different friction values', () => {
    const frictions = WHEEL_CATALOGUE.map(w => w.friction);
    const unique = new Set(frictions);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('wheel variants should have different velocityMult values', () => {
    const mults = WHEEL_CATALOGUE.map(w => w.velocityMult);
    const unique = new Set(mults);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('FLIPPER_CATALOGUE should have at least 3 entries', () => {
    expect(FLIPPER_CATALOGUE.length).toBeGreaterThanOrEqual(3);
  });

  it('every FLIPPER_CATALOGUE entry should have id, label, depth, power, maxAngle, upSpeed, downSpeed', () => {
    FLIPPER_CATALOGUE.forEach(spec => {
      expect(typeof spec.id).toBe('string');
      expect(typeof spec.label).toBe('string');
      expect(typeof spec.depth).toBe('number');
      expect(spec.depth).toBeGreaterThan(0);
      expect(typeof spec.power).toBe('number');
      expect(typeof spec.maxAngle).toBe('number');
      expect(typeof spec.upSpeed).toBe('number');
      expect(typeof spec.downSpeed).toBe('number');
    });
  });

  it('FLIPPER_CATALOGUE should include standard, heavy and light entries', () => {
    const ids = FLIPPER_CATALOGUE.map(f => f.id);
    expect(ids).toContain('standard');
    expect(ids).toContain('heavy');
    expect(ids).toContain('light');
  });

  it('flipper variants should have different power values', () => {
    const powers = FLIPPER_CATALOGUE.map(f => f.power);
    const unique = new Set(powers);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('Car model variant physics', () => {
  it('should expose a flipperPower getter', () => {
    const car = createCar();
    expect(typeof car.flipperPower).toBe('number');
    expect(car.flipperPower).toBeGreaterThan(0);
  });

  it('should expose a flipperDepth getter', () => {
    const car = createCar();
    expect(typeof car.flipperDepth).toBe('number');
    expect(car.flipperDepth).toBeGreaterThan(0);
  });

  it('should expose a flipperMaxAngle getter', () => {
    const car = createCar();
    expect(typeof car.flipperMaxAngle).toBe('number');
    expect(car.flipperMaxAngle).toBeGreaterThan(0);
  });

  it('applyCustomisation with wedge model should change mass to wedge mass', () => {
    const car = createCar();
    car.applyCustomisation({ model: 'wedge' });
    const wedgeSpec = MODEL_CATALOGUE.find(m => m.id === 'wedge');
    expect(car.mass).toBeCloseTo(wedgeSpec.mass, 5);
  });

  it('applyCustomisation with heavy model should change mass to heavy mass', () => {
    const car = createCar();
    car.applyCustomisation({ model: 'heavy' });
    const heavySpec = MODEL_CATALOGUE.find(m => m.id === 'heavy');
    expect(car.mass).toBeCloseTo(heavySpec.mass, 5);
  });

  it('applyCustomisation with wedge model should show wedge body and hide others', () => {
    const car = createCar();
    car.applyCustomisation({ model: 'wedge' });
    expect(car.mesh.visible).toBe(true);
    expect(car.mesh.geometry.parameters.width).toBeCloseTo(
      MODEL_CATALOGUE.find(m => m.id === 'wedge').width, 5
    );
  });

  it('applyCustomisation with heavy model should show heavy body and hide others', () => {
    const car = createCar();
    car.applyCustomisation({ model: 'heavy' });
    expect(car.mesh.visible).toBe(true);
    expect(car.mesh.geometry.parameters.width).toBeCloseTo(
      MODEL_CATALOGUE.find(m => m.id === 'heavy').width, 5
    );
  });

  it('standard model mass should be restored when switching back to standard', () => {
    const car = createCar();
    const stdMass = MODEL_CATALOGUE.find(m => m.id === 'standard').mass;
    car.applyCustomisation({ model: 'heavy' });
    car.applyCustomisation({ model: 'standard' });
    expect(car.mass).toBeCloseTo(stdMass, 5);
  });
});

describe('Car wheel variant physics', () => {
  it('applyCustomisation with offroad wheels should reduce velocity from accelerate', () => {
    const carStd = createCar();
    carStd.accelerate(10);
    const stdVel = Math.abs(carStd.velocity.z);

    const carOff = createCar();
    carOff.applyCustomisation({ wheels: 'offroad' });
    carOff.accelerate(10);
    const offVel = Math.abs(carOff.velocity.z);

    const offroadSpec = WHEEL_CATALOGUE.find(w => w.id === 'offroad');
    expect(offroadSpec.velocityMult).toBeLessThan(1);
    expect(offVel).toBeLessThan(stdVel);
  });

  it('applyCustomisation with racing wheels should increase velocity from accelerate', () => {
    const carStd = createCar();
    carStd.accelerate(10);
    const stdVel = Math.abs(carStd.velocity.z);

    const carRace = createCar();
    carRace.applyCustomisation({ wheels: 'racing' });
    carRace.accelerate(10);
    const raceVel = Math.abs(carRace.velocity.z);

    const racingSpec = WHEEL_CATALOGUE.find(w => w.id === 'racing');
    expect(racingSpec.velocityMult).toBeGreaterThan(1);
    expect(raceVel).toBeGreaterThan(stdVel);
  });

  it('offroad wheels should have higher friction (more deceleration) than racing', () => {
    const offroadSpec = WHEEL_CATALOGUE.find(w => w.id === 'offroad');
    const racingSpec = WHEEL_CATALOGUE.find(w => w.id === 'racing');
    expect(offroadSpec.friction).toBeLessThan(racingSpec.friction);
  });

  it('applyCustomisation with offroad wheels should apply offroad friction in update', () => {
    const carStd = createCar();
    carStd.applyCustomisation({ wheels: 'standard' });
    carStd.accelerate(10);
    const velBefore = Math.abs(carStd.velocity.z);
    carStd.update(0.1);
    const decayStd = velBefore - Math.abs(carStd.velocity.z);

    const carOff = createCar();
    carOff.applyCustomisation({ wheels: 'offroad' });
    carOff.accelerate(10);
    const velBefore2 = Math.abs(carOff.velocity.z);
    carOff.update(0.1);
    const decayOff = velBefore2 - Math.abs(carOff.velocity.z);

    // Off-road friction is lower (decelerates faster per update step)
    const offroadSpec = WHEEL_CATALOGUE.find(w => w.id === 'offroad');
    const stdSpec = WHEEL_CATALOGUE.find(w => w.id === 'standard');
    expect(offroadSpec.friction).toBeLessThan(stdSpec.friction);
    expect(decayOff).toBeGreaterThan(decayStd);
  });

  it('switching to offroad wheels should show offroad wheel meshes', () => {
    const car = createCar();
    car.applyCustomisation({ wheels: 'offroad' });
    car.wheels.forEach(w => { expect(w.visible).toBe(true); });
  });

  it('switching to racing wheels should show racing wheel meshes', () => {
    const car = createCar();
    car.applyCustomisation({ wheels: 'racing' });
    car.wheels.forEach(w => { expect(w.visible).toBe(true); });
  });

  it('switching wheel type updates the active wheel set returned by car.wheels', () => {
    const car = createCar();
    car.applyCustomisation({ wheels: 'standard' });
    const stdWheels = car.wheels;
    car.applyCustomisation({ wheels: 'offroad' });
    const offWheels = car.wheels;
    expect(stdWheels).not.toBe(offWheels);
  });
});

describe('Car flipper variant physics', () => {
  it('applyCustomisation with heavy flipper should update flipperPower', () => {
    const car = createCar();
    car.applyCustomisation({ flipper: 'heavy' });
    const spec = FLIPPER_CATALOGUE.find(f => f.id === 'heavy');
    expect(car.flipperPower).toBeCloseTo(spec.power, 5);
  });

  it('applyCustomisation with light flipper should update flipperPower', () => {
    const car = createCar();
    car.applyCustomisation({ flipper: 'light' });
    const spec = FLIPPER_CATALOGUE.find(f => f.id === 'light');
    expect(car.flipperPower).toBeCloseTo(spec.power, 5);
  });

  it('heavy flipper should have greater depth than standard', () => {
    const car = createCar();
    const stdDepth = car.flipperDepth;
    car.applyCustomisation({ flipper: 'heavy' });
    expect(car.flipperDepth).toBeGreaterThan(stdDepth);
  });

  it('light flipper should have smaller depth than standard', () => {
    const car = createCar();
    const stdDepth = car.flipperDepth;
    car.applyCustomisation({ flipper: 'light' });
    expect(car.flipperDepth).toBeLessThan(stdDepth);
  });

  it('heavy flipper maxAngle should be greater than standard maxAngle', () => {
    const car = createCar();
    const stdAngle = car.flipperMaxAngle;
    car.applyCustomisation({ flipper: 'heavy' });
    expect(car.flipperMaxAngle).toBeGreaterThan(stdAngle);
  });

  it('light flipper should animate faster than standard (higher upSpeed)', () => {
    const lightSpec = FLIPPER_CATALOGUE.find(f => f.id === 'light');
    const stdSpec = FLIPPER_CATALOGUE.find(f => f.id === 'standard');
    expect(lightSpec.upSpeed).toBeGreaterThan(stdSpec.upSpeed);
  });

  it('heavy flipper should animate slower than standard (lower upSpeed)', () => {
    const heavySpec = FLIPPER_CATALOGUE.find(f => f.id === 'heavy');
    const stdSpec = FLIPPER_CATALOGUE.find(f => f.id === 'standard');
    expect(heavySpec.upSpeed).toBeLessThan(stdSpec.upSpeed);
  });

  it('switching to heavy flipper should show heavy flipper mesh', () => {
    const car = createCar();
    car.applyCustomisation({ flipper: 'heavy' });
    expect(car.flipper.visible).toBe(true);
    const spec = FLIPPER_CATALOGUE.find(f => f.id === 'heavy');
    expect(car.flipper.geometry.parameters.depth).toBeCloseTo(spec.depth, 5);
  });

  it('switching to light flipper should show light flipper mesh', () => {
    const car = createCar();
    car.applyCustomisation({ flipper: 'light' });
    expect(car.flipper.visible).toBe(true);
    const spec = FLIPPER_CATALOGUE.find(f => f.id === 'light');
    expect(car.flipper.geometry.parameters.depth).toBeCloseTo(spec.depth, 5);
  });

  it('heavy flipper variant should animate more slowly than standard', () => {
    const carStd = createCar();
    carStd.applyCustomisation({ flipper: 'standard' });
    carStd.activateFlipper();
    carStd.update(0.05);
    const stdAngle = carStd.flipperAngle;

    const carHeavy = createCar();
    carHeavy.applyCustomisation({ flipper: 'heavy' });
    carHeavy.activateFlipper();
    carHeavy.update(0.05);
    const heavyAngle = carHeavy.flipperAngle;

    expect(heavyAngle).toBeLessThan(stdAngle);
  });

  it('light flipper variant should animate faster than standard', () => {
    const carStd = createCar();
    carStd.applyCustomisation({ flipper: 'standard' });
    carStd.activateFlipper();
    carStd.update(0.02);
    const stdAngle = carStd.flipperAngle;

    const carLight = createCar();
    carLight.applyCustomisation({ flipper: 'light' });
    carLight.activateFlipper();
    carLight.update(0.02);
    const lightAngle = carLight.flipperAngle;

    expect(lightAngle).toBeGreaterThan(stdAngle);
  });
});
