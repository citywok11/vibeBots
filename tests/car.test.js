import { describe, it, expect } from 'vitest';
import { createCar } from '../src/car.js';

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
  // effectiveHalfWidth = width/2 + wheelWidth = 1 + 0.3 = 1.3
  // effectiveHalfDepth (flat)  = depth/2 + flipperDepth*cos(0)   = 1.5 + 1.2 = 2.7
  // effectiveHalfDepth (60deg) = depth/2 + flipperDepth*cos(π/3) = 1.5 + 0.6 = 2.1
  // With arenaSize=50 (half=25):
  //   wheel  limitX       = 25 - 1.3 = 23.7
  //   flipper limitZ flat = 25 - 2.7 = 22.3
  //   flipper limitZ 60°  = 25 - 2.1 = 22.9

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

  it('should automatically deactivate after the flame duration expires', () => {
    const car = createCar();
    car.activateFlamethrower();
    // Simulate enough time for the flame to expire (0.5s duration)
    for (let i = 0; i < 50; i++) {
      car.update(0.02);
    }
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
});
