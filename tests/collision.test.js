import { describe, it, expect } from 'vitest';
import { resolveCollision } from '../src/collision.js';

function makeObj(x, z, vx, vz, mass = 1, collisionRadius = 1.5) {
  return {
    position: { x, z },
    velocity: { x: vx, z: vz },
    mass,
    collisionRadius,
  };
}

describe('resolveCollision', () => {
  it('returns false when objects are not overlapping', () => {
    const a = makeObj(0, 0, 5, 0);
    const b = makeObj(10, 0, 0, 0);
    expect(resolveCollision(a, b)).toBe(false);
  });

  it('returns truthy result object when objects are overlapping and moving toward each other', () => {
    const a = makeObj(0, 0, 5, 0);
    const b = makeObj(2, 0, 0, 0);
    expect(resolveCollision(a, b)).toBeTruthy();
  });

  it('transfers velocity from moving car to static robot', () => {
    const car = makeObj(0, 0, 5, 0);
    const robot = makeObj(2, 0, 0, 0);
    resolveCollision(car, robot);
    expect(robot.velocity.x).toBeGreaterThan(0);
  });

  it('slows down the car after hitting the static robot', () => {
    const car = makeObj(0, 0, 5, 0);
    const robot = makeObj(2, 0, 0, 0);
    resolveCollision(car, robot);
    expect(car.velocity.x).toBeLessThan(5);
  });

  it('equal mass head-on collision: velocities are exchanged (with restitution)', () => {
    const a = makeObj(0, 0, 5, 0, 1);
    const b = makeObj(2, 0, -5, 0, 1);
    resolveCollision(a, b);
    expect(a.velocity.x).toBeLessThan(0);
    expect(b.velocity.x).toBeGreaterThan(0);
  });

  it('heavier robot resists velocity change more than lighter car', () => {
    const lightCar = makeObj(0, 0, 5, 0, 1);
    const heavyRobot = makeObj(2, 0, 0, 0, 5);
    resolveCollision(lightCar, heavyRobot);
    const lightRobotObj = makeObj(2, 0, 0, 0, 1);
    const lightCar2 = makeObj(0, 0, 5, 0, 1);
    resolveCollision(lightCar2, lightRobotObj);
    expect(heavyRobot.velocity.x).toBeLessThan(lightRobotObj.velocity.x);
  });

  it('heavier car pushes robot further than lighter car', () => {
    const heavyCar = makeObj(0, 0, 5, 0, 5);
    const robot1 = makeObj(2, 0, 0, 0, 1);
    resolveCollision(heavyCar, robot1);

    const lightCar = makeObj(0, 0, 5, 0, 1);
    const robot2 = makeObj(2, 0, 0, 0, 1);
    resolveCollision(lightCar, robot2);

    expect(robot1.velocity.x).toBeGreaterThan(robot2.velocity.x);
  });

  it('does not resolve when objects are moving apart', () => {
    const a = makeObj(0, 0, -5, 0);
    const b = makeObj(2, 0, 5, 0);
    const result = resolveCollision(a, b);
    expect(result).toBe(false);
    expect(a.velocity.x).toBe(-5);
    expect(b.velocity.x).toBe(5);
  });

  it('separates overlapping objects to prevent tunnelling', () => {
    const a = makeObj(0, 0, 5, 0, 1, 1.5);
    const b = makeObj(2, 0, 0, 0, 1, 1.5);
    const overlap = (1.5 + 1.5) - 2;
    resolveCollision(a, b);
    const dist = Math.abs(b.position.x - a.position.x);
    expect(dist).toBeGreaterThanOrEqual(3 - 0.001);
  });

  it('works for collisions in the z direction', () => {
    const a = makeObj(0, 0, 0, 5);
    const b = makeObj(0, 2, 0, 0);
    resolveCollision(a, b);
    expect(b.velocity.z).toBeGreaterThan(0);
    expect(a.velocity.z).toBeLessThan(5);
  });

  it('works for diagonal collisions', () => {
    const a = makeObj(0, 0, 4, 4);
    const b = makeObj(2, 2, 0, 0);
    const result = resolveCollision(a, b);
    expect(result).toBeTruthy();
    const speedBAfter = Math.sqrt(b.velocity.x ** 2 + b.velocity.z ** 2);
    expect(speedBAfter).toBeGreaterThan(0);
  });

  it('conserves momentum in equal-mass elastic-like collision', () => {
    const a = makeObj(0, 0, 5, 0, 1);
    const b = makeObj(2, 0, 0, 0, 1);
    const totalMomentumBefore = a.velocity.x * a.mass + b.velocity.x * b.mass;
    resolveCollision(a, b, 1);
    const totalMomentumAfter = a.velocity.x * a.mass + b.velocity.x * b.mass;
    expect(totalMomentumAfter).toBeCloseTo(totalMomentumBefore, 5);
  });

  it('applies restitution to reduce post-collision speed', () => {
    const a = makeObj(0, 0, 5, 0, 1);
    const b = makeObj(2, 0, 0, 0, 1);
    const speedBefore = Math.abs(a.velocity.x);
    resolveCollision(a, b, 0.6);
    const speedAAfter = Math.abs(a.velocity.x);
    const speedBAfter = Math.abs(b.velocity.x);
    expect(speedAAfter + speedBAfter).toBeLessThan(speedBefore * 2);
  });

  it('returns false when objects are exactly at minimum distance', () => {
    const a = makeObj(0, 0, 5, 0, 1, 1.5);
    const b = makeObj(3, 0, 0, 0, 1, 1.5);
    const result = resolveCollision(a, b);
    expect(result).toBe(false);
  });

  describe('collision result object', () => {
    it('returns an object with angular impulse properties when collision occurs', () => {
      const a = makeObj(0, 0, 5, 0);
      const b = makeObj(2, 0, 0, 0);
      const result = resolveCollision(a, b);
      expect(result).toBeTruthy();
      expect(typeof result.angularImpulseA).toBe('number');
      expect(typeof result.angularImpulseB).toBe('number');
    });

    it('returns impact normal pointing from a to b', () => {
      const a = makeObj(0, 0, 5, 0);
      const b = makeObj(2, 0, 0, 0);
      const result = resolveCollision(a, b);
      expect(result.impactNormal.x).toBeGreaterThan(0); // b is to the right of a
      expect(result.impactNormal.z).toBeCloseTo(0, 5);
    });

    it('returns impact speed', () => {
      const a = makeObj(0, 0, 5, 0);
      const b = makeObj(2, 0, 0, 0);
      const result = resolveCollision(a, b);
      expect(result.impactSpeed).toBeGreaterThan(0);
    });

    it('returns a contact point between the two objects', () => {
      const a = makeObj(0, 0, 5, 0);
      const b = makeObj(2, 0, 0, 0);
      const result = resolveCollision(a, b);
      expect(result.contactPoint).toBeDefined();
      // Contact point should be between the two objects
      expect(result.contactPoint.x).toBeGreaterThanOrEqual(Math.min(a.position.x, b.position.x));
      expect(result.contactPoint.x).toBeLessThanOrEqual(Math.max(a.position.x, b.position.x));
    });

    it('produces zero angular impulse for a perfectly head-on symmetric collision', () => {
      // Head-on along X: contact point is on the line between centres
      // Both objects have same mass and same radius → lever arm is along normal → cross product is zero
      const a = makeObj(0, 0, 5, 0, 1, 1.5);
      const b = makeObj(2, 0, -5, 0, 1, 1.5);
      const result = resolveCollision(a, b);
      expect(result.angularImpulseA).toBeCloseTo(0, 3);
      expect(result.angularImpulseB).toBeCloseTo(0, 3);
    });

    it('produces non-zero angular impulse for an off-centre collision', () => {
      // Object a hits b at an angle; b is an oriented rectangle so the
      // surface contact point is offset from the centre-to-centre line.
      const a = makeObj(0, 0, 5, 5, 1, 1.5);
      Object.assign(a, { rotation: 0, bodyWidth: 2, bodyDepth: 3 });
      const b = makeObj(1, 1, 0, 0, 1, 1.5);
      Object.assign(b, { rotation: 0, bodyWidth: 2, bodyDepth: 3 });
      const result = resolveCollision(a, b);
      // At least one should have non-zero angular impulse
      const totalAngular = Math.abs(result.angularImpulseA) + Math.abs(result.angularImpulseB);
      expect(totalAngular).toBeGreaterThan(0);
    });

    it('heavier object receives less angular impulse than lighter object', () => {
      const a = makeObj(0, 0, 5, 3, 1, 1.5);
      Object.assign(a, { rotation: 0, bodyWidth: 2, bodyDepth: 3 });
      const b = makeObj(1.5, 1, 0, 0, 5, 1.5);
      Object.assign(b, { rotation: 0, bodyWidth: 2, bodyDepth: 3 });
      const result = resolveCollision(a, b);
      // Heavier object (b) should have smaller angular impulse magnitude
      expect(Math.abs(result.angularImpulseB)).toBeLessThan(Math.abs(result.angularImpulseA));
    });
  });
});
