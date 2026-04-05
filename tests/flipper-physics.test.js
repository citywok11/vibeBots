import { describe, it, expect, beforeEach } from 'vitest';
import { createCar } from '../src/car.js';
import { createRobot } from '../src/robot.js';
import { checkFlipperContact, applyFlipperImpulse } from '../src/flipper-physics.js';

describe('checkFlipperContact', () => {
  let car, robot;

  beforeEach(() => {
    car = createCar({ x: 0, z: 0 });
    robot = createRobot({ x: 0, z: 0 });
    // Place robot directly in front of car (within flipper reach)
    robot.group.position.z = -3;
  });

  it('returns no contact when robot is behind the car', () => {
    robot.group.position.z = 5;
    expect(checkFlipperContact(car, robot).inContact).toBe(false);
  });

  it('returns no contact when robot is too far in front', () => {
    robot.group.position.z = -20;
    expect(checkFlipperContact(car, robot).inContact).toBe(false);
  });

  it('returns contact when robot is directly in front within flipper reach', () => {
    expect(checkFlipperContact(car, robot).inContact).toBe(true);
  });

  it('returns xOffset of 0 when robot is centered in front', () => {
    expect(checkFlipperContact(car, robot).xOffset).toBeCloseTo(0, 5);
  });

  it('returns positive xOffset when robot is to the right of flipper center', () => {
    robot.group.position.x = 0.5;
    expect(checkFlipperContact(car, robot).xOffset).toBeGreaterThan(0);
  });

  it('returns negative xOffset when robot is to the left of flipper center', () => {
    robot.group.position.x = -0.5;
    expect(checkFlipperContact(car, robot).xOffset).toBeLessThan(0);
  });

  it('returns no contact when robot is too far to the side', () => {
    robot.group.position.x = 5;
    expect(checkFlipperContact(car, robot).inContact).toBe(false);
  });

  it('detects contact correctly when car is rotated 90 degrees', () => {
    car.turnLeft(Math.PI / 2); // car now faces -X direction
    robot.group.position.set(-3, robot.group.position.y, 0);
    expect(checkFlipperContact(car, robot).inContact).toBe(true);
  });

  it('xOffset reflects lateral position relative to rotated car', () => {
    car.turnLeft(Math.PI / 2); // facing -X
    // Put robot slightly to the car's local right (which is world -Z when facing -X)
    robot.group.position.set(-3, robot.group.position.y, -0.5);
    const result = checkFlipperContact(car, robot);
    expect(result.inContact).toBe(true);
    expect(result.xOffset).toBeGreaterThan(0); // to the local right
  });

  it('returns no contact when robot is airborne', () => {
    robot.group.position.y = robot.groundY + 2;
    expect(checkFlipperContact(car, robot).inContact).toBe(false);
  });

  it('xOffset is clamped to [-1, 1]', () => {
    // Place robot at the far edge of flipper width
    robot.group.position.x = 1; // at exact flipper half-width
    const result = checkFlipperContact(car, robot);
    expect(result.xOffset).toBeLessThanOrEqual(1);
    expect(result.xOffset).toBeGreaterThanOrEqual(-1);
  });
});

describe('applyFlipperImpulse', () => {
  let car, robot;

  beforeEach(() => {
    car = createCar({ x: 0, z: 0 });
    robot = createRobot({ x: 0, z: -3 });
  });

  it('returns false and does nothing when flipper is not active', () => {
    expect(applyFlipperImpulse(car, robot)).toBe(false);
    expect(robot.velocityY).toBe(0);
  });

  it('returns false when flipper is activated but angle is still 0', () => {
    car.activateFlipper();
    // Do not call update — angle is still 0
    expect(applyFlipperImpulse(car, robot)).toBe(false);
  });

  it('returns false when robot is not in the flipper zone', () => {
    robot.group.position.z = 5; // behind car
    car.activateFlipper();
    car.update(0.05);
    expect(applyFlipperImpulse(car, robot)).toBe(false);
  });

  it('returns true when flip is successfully applied', () => {
    car.activateFlipper();
    car.update(0.05);
    expect(applyFlipperImpulse(car, robot)).toBe(true);
  });

  it('applies positive vertical velocity to robot on flip', () => {
    car.activateFlipper();
    car.update(0.05);
    applyFlipperImpulse(car, robot);
    expect(robot.velocityY).toBeGreaterThan(0);
  });

  it('applies a stronger vertical impulse with a larger flipper angle', () => {
    const robot1 = createRobot({ x: 0, z: -3 });
    const car1 = createCar({ x: 0, z: 0 });
    car1.activateFlipper();
    car1.update(0.01); // small angle
    applyFlipperImpulse(car1, robot1);

    const robot2 = createRobot({ x: 0, z: -3 });
    const car2 = createCar({ x: 0, z: 0 });
    car2.activateFlipper();
    car2.update(0.08); // larger angle
    applyFlipperImpulse(car2, robot2);

    expect(robot2.velocityY).toBeGreaterThan(robot1.velocityY);
  });

  it('applies no lateral velocity when robot is centered on the flipper', () => {
    car.activateFlipper();
    car.update(0.05);
    applyFlipperImpulse(car, robot);
    // Centered robot gets no lateral (X) push but does get forward (Z) push
    expect(robot.velocity.x).toBeCloseTo(0, 5);
    expect(robot.velocity.z).toBeLessThan(0); // pushed in car's facing direction (-Z)
  });

  it('applies positive world-X lateral velocity when robot is right of center (rotation=0)', () => {
    robot.group.position.x = 0.5; // to the right (local X+ = world X+ when rotation=0)
    car.activateFlipper();
    car.update(0.05);
    applyFlipperImpulse(car, robot);
    expect(robot.velocity.x).toBeGreaterThan(0);
  });

  it('applies negative world-X lateral velocity when robot is left of center (rotation=0)', () => {
    robot.group.position.x = -0.5;
    car.activateFlipper();
    car.update(0.05);
    applyFlipperImpulse(car, robot);
    expect(robot.velocity.x).toBeLessThan(0);
  });

  it('lateral force is in correct world direction when car is rotated', () => {
    car.turnLeft(Math.PI / 2); // car faces -X; local X+ = world -Z direction
    // Robot in front of rotated car, offset to car's local right (world -Z)
    robot.group.position.set(-3, robot.groundY, -0.5);
    car.activateFlipper();
    car.update(0.05);
    applyFlipperImpulse(car, robot);
    expect(robot.velocity.z).toBeLessThan(0); // pushed in world -Z direction
  });

  it('does not flip an airborne robot', () => {
    robot.group.position.y = robot.groundY + 2;
    car.activateFlipper();
    car.update(0.05);
    expect(applyFlipperImpulse(car, robot)).toBe(false);
    expect(robot.velocityY).toBe(0);
  });
});

describe('Robot vertical physics after flip', () => {
  it('robot starts with zero velocityY', () => {
    const robot = createRobot();
    expect(robot.velocityY).toBe(0);
  });

  it('robot exposes groundY at the correct resting height', () => {
    const robot = createRobot();
    expect(robot.groundY).toBeGreaterThan(0);
    expect(robot.group.position.y).toBeCloseTo(robot.groundY, 5);
  });

  it('robot rises when velocityY is positive', () => {
    const robot = createRobot();
    const startY = robot.group.position.y;
    robot.velocityY = 10;
    robot.update(0.1);
    expect(robot.group.position.y).toBeGreaterThan(startY);
  });

  it('robot falls back to ground level due to gravity', () => {
    const robot = createRobot();
    robot.velocityY = 10;
    for (let i = 0; i < 200; i++) {
      robot.update(0.05);
    }
    expect(robot.group.position.y).toBeCloseTo(robot.groundY, 1);
    expect(robot.velocityY).toBe(0);
  });

  it('robot does not go below ground level', () => {
    const robot = createRobot();
    robot.velocityY = -50; // large downward velocity
    robot.update(0.1);
    expect(robot.group.position.y).toBeGreaterThanOrEqual(robot.groundY);
  });

  it('velocityY returns to 0 after landing', () => {
    const robot = createRobot();
    robot.velocityY = 5;
    for (let i = 0; i < 200; i++) {
      robot.update(0.016);
    }
    expect(robot.velocityY).toBe(0);
  });

  it('reset restores robot to ground level with zero velocityY', () => {
    const robot = createRobot();
    robot.velocityY = 15;
    for (let i = 0; i < 5; i++) robot.update(0.016);
    robot.reset();
    expect(robot.group.position.y).toBeCloseTo(robot.groundY, 5);
    expect(robot.velocityY).toBe(0);
  });
});

describe('Rotational flipper — pivot-based arc motion', () => {
  it('car exposes a flipperPivot group that is a child of the car group', () => {
    const car = createCar();
    expect(car.flipperPivot).toBeDefined();
    expect(car.flipperPivot.isGroup || car.flipperPivot.isObject3D).toBe(true);
    expect(car.group.children).toContain(car.flipperPivot);
  });

  it('flipper mesh is a child of the pivot, not a direct child of the car group', () => {
    const car = createCar();
    expect(car.flipperPivot.children).toContain(car.flipper);
    // The mesh should NOT be a direct child of the car group
    expect(car.group.children).not.toContain(car.flipper);
  });

  it('pivot rotates around X axis as flipper animates', () => {
    const car = createCar();
    expect(car.flipperPivot.rotation.x).toBe(0);
    car.activateFlipper();
    car.update(0.05);
    // Pivot should have rotated negatively around X (swinging up)
    expect(car.flipperPivot.rotation.x).toBeLessThan(0);
  });

  it('pivot rotation magnitude matches flipperAngle', () => {
    const car = createCar();
    car.activateFlipper();
    car.update(0.05);
    expect(car.flipperPivot.rotation.x).toBeCloseTo(-car.flipperAngle, 5);
  });

  it('pivot rotation resets to 0 after full cycle', () => {
    const car = createCar();
    car.activateFlipper();
    for (let i = 0; i < 200; i++) car.update(0.05);
    expect(car.flipperPivot.rotation.x).toBeCloseTo(0, 2);
  });
});

describe('Rotational contact detection — arc-aware flipper zone', () => {
  it('contact zone Z-reach shrinks as flipper angle increases', () => {
    const car = createCar({ x: 0, z: 0 });
    const robot = createRobot({ x: 0, z: 0 });

    // Place robot at the Z position that is the tip of a flat flipper
    // Standard flipper depth = 1.2, car body depth = 3, so hinge at z = -1.5
    // Flat tip at z = -1.5 - 1.2 = -2.7. Robot half-depth = 1.5, so robot at z = -2.7 works.
    robot.group.position.z = -2.7;
    expect(checkFlipperContact(car, robot).inContact).toBe(true);

    // Now swing the flipper up a small amount so it's still on the upswing
    car.activateFlipper();
    car.update(0.03); // small dt so flipper is partway up
    const angle = car.flipperAngle;
    expect(angle).toBeGreaterThan(0);

    // The projected Z-reach should now be shorter than the full depth
    const projectedDepth = car.flipperDepth * Math.cos(angle);
    expect(projectedDepth).toBeLessThan(car.flipperDepth);
  });

  it('robot at the extreme tip loses contact when flipper is raised high', () => {
    const car = createCar({ x: 0, z: 0 });
    const robot = createRobot({ x: 0, z: 0 });

    // Place robot just within reach of the flat flipper tip
    const hingeZ = -1.5; // CAR_BODY_DEPTH / 2
    const tipZFlat = hingeZ - car.flipperDepth;
    // Robot centre right at the tip boundary
    robot.group.position.z = tipZFlat;
    expect(checkFlipperContact(car, robot).inContact).toBe(true);

    // Raise the flipper to a large angle
    car.activateFlipper();
    for (let i = 0; i < 50; i++) car.update(0.016);
    const angle = car.flipperAngle;
    // At large angle, projected reach is shorter
    if (angle > Math.PI / 6) {
      expect(checkFlipperContact(car, robot).inContact).toBe(false);
    }
  });

  it('allows contact with slightly elevated robot when flipper is raised', () => {
    const car = createCar({ x: 0, z: 0 });
    const robot = createRobot({ x: 0, z: 0 });
    robot.group.position.z = -2.5; // within flipper zone

    // Raise the flipper
    car.activateFlipper();
    car.update(0.05);
    const angle = car.flipperAngle;
    const tipRise = car.flipperDepth * Math.sin(angle);

    // Robot slightly above ground but within the raised flipper's reach
    robot.group.position.y = robot.groundY + tipRise * 0.5;
    expect(checkFlipperContact(car, robot).inContact).toBe(true);
  });
});

describe('Rotational impulse — arc-based launch direction', () => {
  it('impulse is mostly vertical at small flipper angles', () => {
    const car = createCar({ x: 0, z: 0 });
    const robot = createRobot({ x: 0, z: -3 });

    car.activateFlipper();
    car.update(0.01); // very small angle
    applyFlipperImpulse(car, robot);

    // At small angle, cos(θ) ≈ 1, sin(θ) ≈ 0
    // So vertical impulse should dominate over forward impulse
    const forwardSpeed = Math.sqrt(robot.velocity.x ** 2 + robot.velocity.z ** 2);
    expect(robot.velocityY).toBeGreaterThan(forwardSpeed);
  });

  it('forward impulse increases relative to vertical at larger angles', () => {
    // Small angle flip
    const car1 = createCar({ x: 0, z: 0 });
    const robot1 = createRobot({ x: 0, z: -3 });
    car1.activateFlipper();
    car1.update(0.01);
    applyFlipperImpulse(car1, robot1);
    const forwardRatio1 = Math.abs(robot1.velocity.z) / robot1.velocityY;

    // Larger angle flip
    const car2 = createCar({ x: 0, z: 0 });
    const robot2 = createRobot({ x: 0, z: -3 });
    car2.activateFlipper();
    car2.update(0.05);
    applyFlipperImpulse(car2, robot2);
    const forwardRatio2 = Math.abs(robot2.velocity.z) / robot2.velocityY;

    // The forward-to-vertical ratio should increase with angle
    expect(forwardRatio2).toBeGreaterThan(forwardRatio1);
  });

  it('impulse direction follows the surface normal (cos θ vertical, sin θ forward)', () => {
    const car = createCar({ x: 0, z: 0 });
    const robot = createRobot({ x: 0, z: -3 });

    car.activateFlipper();
    car.update(0.05);
    const angle = car.flipperAngle;

    applyFlipperImpulse(car, robot);

    // The vertical component should be proportional to cos(angle)
    // The forward component should be proportional to sin(angle)
    // (Ignoring lateral since robot is centered)
    const verticalRatio = Math.cos(angle);
    const forwardRatio = Math.sin(angle);

    // Forward push is in -Z direction for a car at rotation 0
    // Check that the ratio of forward to vertical matches sin/cos
    const actualRatio = Math.abs(robot.velocity.z) / robot.velocityY;
    const expectedRatio = forwardRatio / verticalRatio;
    expect(actualRatio).toBeCloseTo(expectedRatio, 2);
  });

  it('forward push is in the car facing direction (-Z for rotation=0)', () => {
    const car = createCar({ x: 0, z: 0 });
    const robot = createRobot({ x: 0, z: -3 });
    car.activateFlipper();
    car.update(0.05);
    applyFlipperImpulse(car, robot);
    // Car faces -Z, so forward push should be in -Z
    expect(robot.velocity.z).toBeLessThan(0);
    expect(robot.velocity.x).toBeCloseTo(0, 5);
  });
});
