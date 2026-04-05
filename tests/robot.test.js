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

  describe('applyCollisionFriction', () => {
    it('should expose an applyCollisionFriction method', () => {
      const robot = createRobot();
      expect(typeof robot.applyCollisionFriction).toBe('function');
    });

    it('should not reduce velocity when collision is parallel to the rolling direction (front/rear hit)', () => {
      const robot = createRobot();
      // Default rotation.y = 0 → forward is (0, -1) in XZ
      // Collision normal (0, -1) is exactly along the forward axis → no lateral friction
      robot.velocity.x = 0;
      robot.velocity.z = 5;
      robot.applyCollisionFriction(0, -1);
      expect(robot.velocity.x).toBeCloseTo(0, 5);
      expect(robot.velocity.z).toBeCloseTo(5, 5);
    });

    it('should significantly reduce velocity when collision is perpendicular to the wheels (side hit)', () => {
      const robot = createRobot();
      // Collision normal (1, 0) is perpendicular to forward (0, -1) → maximum lateral friction
      robot.velocity.x = 5;
      robot.velocity.z = 0;
      robot.applyCollisionFriction(1, 0);
      expect(Math.abs(robot.velocity.x)).toBeLessThan(5);
      // Should be reduced by ~80 %
      expect(Math.abs(robot.velocity.x)).toBeCloseTo(5 * (1 - 0.8), 5);
    });

    it('should apply partial friction at 45 degrees (between parallel and perpendicular)', () => {
      // Perpendicular hit: max friction
      const robotPerp = createRobot();
      robotPerp.velocity.x = 5;
      robotPerp.velocity.z = 0;
      robotPerp.applyCollisionFriction(1, 0);
      const speedPerp = Math.sqrt(robotPerp.velocity.x ** 2 + robotPerp.velocity.z ** 2);

      // 45-degree hit: partial friction
      const robot45 = createRobot();
      robot45.velocity.x = 5;
      robot45.velocity.z = 0;
      const diag = 1 / Math.sqrt(2);
      robot45.applyCollisionFriction(diag, -diag);
      const speed45 = Math.sqrt(robot45.velocity.x ** 2 + robot45.velocity.z ** 2);

      // Parallel hit: no friction
      const robotPar = createRobot();
      robotPar.velocity.x = 5;
      robotPar.velocity.z = 0;
      robotPar.applyCollisionFriction(0, -1);
      const speedPar = Math.sqrt(robotPar.velocity.x ** 2 + robotPar.velocity.z ** 2);

      expect(speed45).toBeGreaterThan(speedPerp);
      expect(speed45).toBeLessThan(speedPar);
    });

    it('should respect the robot rotation when computing the forward axis', () => {
      const robot = createRobot();
      // Rotate robot 90° so its forward becomes (1, 0) in XZ
      robot.group.rotation.y = Math.PI / 2;

      // Collision along new forward (1, 0) → no friction
      robot.velocity.x = 5;
      robot.velocity.z = 0;
      robot.applyCollisionFriction(1, 0);
      expect(robot.velocity.x).toBeCloseTo(5, 5);
      expect(robot.velocity.z).toBeCloseTo(0, 5);
    });
  });

  it('should apply friction to horizontal velocity on each update', () => {
    const robot = createRobot({ x: 0, z: 0 });
    robot.velocity.x = 5;
    robot.velocity.z = 3;
    robot.update(0.1);
    // Horizontal velocity should decay due to friction (0.98)
    expect(robot.velocity.x).toBeCloseTo(5 * 0.98, 5);
    expect(robot.velocity.z).toBeCloseTo(3 * 0.98, 5);
  });

  describe('angular velocity (yaw spin from collisions)', () => {
    it('should expose an angularVelocity property starting at zero', () => {
      const robot = createRobot();
      expect(robot.angularVelocity).toBe(0);
    });

    it('should expose an applyAngularImpulse method', () => {
      const robot = createRobot();
      expect(typeof robot.applyAngularImpulse).toBe('function');
    });

    it('should change angularVelocity when applyAngularImpulse is called', () => {
      const robot = createRobot();
      robot.applyAngularImpulse(3);
      expect(robot.angularVelocity).toBe(3);
    });

    it('should rotate the robot over time based on angularVelocity', () => {
      const robot = createRobot();
      const rotBefore = robot.group.rotation.y;
      robot.applyAngularImpulse(5);
      robot.update(0.1);
      expect(robot.group.rotation.y).not.toBe(rotBefore);
    });

    it('should apply angular friction so angularVelocity decays over time', () => {
      const robot = createRobot();
      robot.applyAngularImpulse(5);
      robot.update(0.1);
      expect(robot.angularVelocity).toBeLessThan(5);
      expect(robot.angularVelocity).toBeGreaterThan(0);
    });

    it('should eventually stop spinning', () => {
      const robot = createRobot();
      robot.applyAngularImpulse(2);
      for (let i = 0; i < 200; i++) robot.update(0.016);
      expect(robot.angularVelocity).toBe(0);
    });

    it('should reset angularVelocity on reset()', () => {
      const robot = createRobot();
      robot.applyAngularImpulse(5);
      robot.update(0.1);
      robot.reset();
      expect(robot.angularVelocity).toBe(0);
    });
  });

  describe('collision tilt (pitch and roll)', () => {
    it('should expose pitchTilt and rollTilt properties starting at zero', () => {
      const robot = createRobot();
      expect(robot.pitchTilt).toBe(0);
      expect(robot.rollTilt).toBe(0);
    });

    it('should expose an applyImpactTilt method', () => {
      const robot = createRobot();
      expect(typeof robot.applyImpactTilt).toBe('function');
    });

    it('should set pitchTilt when hit from the front', () => {
      const robot = createRobot();
      robot.applyImpactTilt(0, 1, 5);
      expect(robot.pitchTilt).not.toBe(0);
    });

    it('should set rollTilt when hit from the side', () => {
      const robot = createRobot();
      robot.applyImpactTilt(-1, 0, 5);
      expect(robot.rollTilt).not.toBe(0);
    });

    it('should clamp tilt to maximum value', () => {
      const robot = createRobot();
      robot.applyImpactTilt(1, 0, 1000);
      expect(Math.abs(robot.rollTilt)).toBeLessThanOrEqual(0.3 + 0.001);
      expect(Math.abs(robot.pitchTilt)).toBeLessThanOrEqual(0.3 + 0.001);
    });

    it('should decay tilt back to zero over time', () => {
      const robot = createRobot();
      robot.applyImpactTilt(1, 1, 5);
      const pitchBefore = Math.abs(robot.pitchTilt);
      robot.update(0.1);
      expect(Math.abs(robot.pitchTilt)).toBeLessThan(pitchBefore);
    });

    it('should fully decay tilt to zero after enough time', () => {
      const robot = createRobot();
      robot.applyImpactTilt(1, 1, 5);
      for (let i = 0; i < 200; i++) robot.update(0.016);
      expect(robot.pitchTilt).toBe(0);
      expect(robot.rollTilt).toBe(0);
    });

    it('should reset pitchTilt and rollTilt on reset()', () => {
      const robot = createRobot();
      robot.applyImpactTilt(1, 1, 5);
      robot.reset();
      expect(robot.pitchTilt).toBe(0);
      expect(robot.rollTilt).toBe(0);
    });
  });
});
