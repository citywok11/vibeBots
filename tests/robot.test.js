import { describe, it, expect } from 'vitest';
import { createRobot } from '../src/robot.js';

describe('Robot', () => {
  it('should create a robot with a group', () => {
    const robot = createRobot();
    expect(robot.group).toBeDefined();
    expect(robot.group.isGroup).toBe(true);
  });

  it('should create a robot with a body mesh', () => {
    const robot = createRobot();
    expect(robot.mesh).toBeDefined();
    expect(robot.mesh.isMesh).toBe(true);
  });

  it('should have a box-shaped body', () => {
    const robot = createRobot();
    const params = robot.mesh.geometry.parameters;
    expect(params.width).toBeDefined();
    expect(params.height).toBeDefined();
    expect(params.depth).toBeDefined();
  });

  it('should start at a given position or default to origin', () => {
    const robot = createRobot();
    expect(robot.group.position.x).toBe(0);
    expect(robot.group.position.z).toBe(0);

    const robot2 = createRobot({ x: 5, z: -8 });
    expect(robot2.group.position.x).toBe(5);
    expect(robot2.group.position.z).toBe(-8);
  });

  it('should have a velocity with x and z components', () => {
    const robot = createRobot();
    expect(robot.velocity).toBeDefined();
    expect(typeof robot.velocity.x).toBe('number');
    expect(typeof robot.velocity.z).toBe('number');
  });

  it('should have zero velocity by default (static)', () => {
    const robot = createRobot();
    expect(robot.velocity.x).toBe(0);
    expect(robot.velocity.z).toBe(0);
  });

  it('should stay still when update(dt) is called with zero velocity', () => {
    const robot = createRobot({ x: 0, z: 0 });
    const startX = robot.group.position.x;
    const startZ = robot.group.position.z;
    robot.update(0.1);
    expect(robot.group.position.x).toBe(startX);
    expect(robot.group.position.z).toBe(startZ);
  });

  it('should move proportionally to dt when velocity is set', () => {
    const robot1 = createRobot({ x: 0, z: 0 });
    const robot2 = createRobot({ x: 0, z: 0 });
    robot1.velocity.x = 5;
    robot1.velocity.z = 5;
    robot2.velocity.x = 5;
    robot2.velocity.z = 5;
    robot1.update(0.1);
    robot2.update(0.2);
    const dist1 = Math.abs(robot1.group.position.x) + Math.abs(robot1.group.position.z);
    const dist2 = Math.abs(robot2.group.position.x) + Math.abs(robot2.group.position.z);
    expect(dist2).toBeCloseTo(dist1 * 2, 5);
  });

  it('should expose a mass property', () => {
    const robot = createRobot();
    expect(typeof robot.mass).toBe('number');
    expect(robot.mass).toBeGreaterThan(0);
  });

  it('should use a custom mass when provided', () => {
    const robot = createRobot({}, { mass: 3 });
    expect(robot.mass).toBe(3);
  });

  it('should expose a collisionRadius property', () => {
    const robot = createRobot();
    expect(typeof robot.collisionRadius).toBe('number');
    expect(robot.collisionRadius).toBeGreaterThan(0);
  });

  it('should bounce off the left wall', () => {
    const robot = createRobot({ x: -24, z: 0 });
    robot.velocity.x = -10;
    robot.velocity.z = 0;
    robot.bounceOffWalls(50);
    expect(robot.velocity.x).toBeGreaterThan(0);
  });

  it('should bounce off the right wall', () => {
    const robot = createRobot({ x: 24, z: 0 });
    robot.velocity.x = 10;
    robot.velocity.z = 0;
    robot.bounceOffWalls(50);
    expect(robot.velocity.x).toBeLessThan(0);
  });

  it('should bounce off the front wall', () => {
    const robot = createRobot({ x: 0, z: -24 });
    robot.velocity.x = 0;
    robot.velocity.z = -10;
    robot.bounceOffWalls(50);
    expect(robot.velocity.z).toBeGreaterThan(0);
  });

  it('should bounce off the back wall', () => {
    const robot = createRobot({ x: 0, z: 24 });
    robot.velocity.x = 0;
    robot.velocity.z = 10;
    robot.bounceOffWalls(50);
    expect(robot.velocity.z).toBeLessThan(0);
  });

  it('bounceOffWalls returns { bounced: true } when hitting a wall', () => {
    const robot = createRobot({ x: 24, z: 0 });
    robot.velocity.x = 10;
    const result = robot.bounceOffWalls(50);
    expect(result.bounced).toBe(true);
  });

  it('bounceOffWalls returns { bounced: false } when not hitting a wall', () => {
    const robot = createRobot({ x: 0, z: 0 });
    robot.velocity.x = 1;
    const result = robot.bounceOffWalls(50);
    expect(result.bounced).toBe(false);
  });

  it('should have a different body color than the player car', () => {
    const robot = createRobot();
    const color = robot.mesh.material.color.getHex();
    // Player car is 0xff4444 (red); robot should be a different color
    expect(color).not.toBe(0xff4444);
  });

  it('should expose a reset() function', () => {
    const robot = createRobot({ x: 5, z: 5 });
    robot.update(1);
    robot.reset();
    expect(robot.group.position.x).toBe(5);
    expect(robot.group.position.z).toBe(5);
  });

  it('should apply friction to velocity on each update', () => {
    const robot = createRobot({ x: 0, z: 0 });
    robot.velocity.x = 10;
    robot.velocity.z = 0;
    robot.update(0.1);
    expect(robot.velocity.x).toBeLessThan(10);
    expect(robot.velocity.x).toBeGreaterThan(0);
  });

  it('should reset velocity to zero', () => {
    const robot = createRobot({ x: 0, z: 0 });
    robot.velocity.x = 10;
    robot.velocity.z = 10;
    robot.reset();
    expect(robot.velocity.x).toBe(0);
    expect(robot.velocity.z).toBe(0);
  });
});
