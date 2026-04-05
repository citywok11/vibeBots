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

  it('returns true when objects are overlapping and moving toward each other', () => {
    const a = makeObj(0, 0, 5, 0);
    const b = makeObj(2, 0, 0, 0);
    expect(resolveCollision(a, b)).toBe(true);
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
    expect(result).toBe(true);
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
});
