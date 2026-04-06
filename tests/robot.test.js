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

  describe('rotation-aware wall collision', () => {
    // Robot body: width=2, depth=3 → halfW=1, halfD=1.5
    // At rotation=0 the AABB matches the body extents.
    // At rotation=π/4 (45°) the AABB expands:
    //   each corner: lx ∈ {-1,1}, lz ∈ {-1.5,1.5}
    //   wx = cos(π/4)*lx + sin(π/4)*lz ≈ 0.707*1 + 0.707*1.5 ≈ 1.768
    //   maxX ≈ 1.768 (bigger than the axis-aligned 1.5)
    // With arenaSize=50, half=25: axis-aligned limitX = 25 - 1 = 24,
    // but at 45° the rotated AABB maxX ≈ 1.768, so the limit is ≈ 25 - 1.768 ≈ 23.232

    it('should bounce off the east wall when rotated 45° and a corner extends into it', () => {
      const arenaSize = 50;
      // At rotation=0 the body's halfW=1, so limitX=24 → x=23.5 is fine.
      // At rotation=π/4 the AABB maxX ≈ 1.768, so limitX ≈ 23.232 → x=23.5 exceeds it.
      const robot = createRobot({ x: 23.5, z: 0 });
      robot.group.rotation.y = Math.PI / 4;
      robot.velocity.x = 5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.x).toBeLessThan(0);
    });

    it('should bounce off the west wall when rotated 45° and a corner extends into it', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: -23.5, z: 0 });
      robot.group.rotation.y = Math.PI / 4;
      robot.velocity.x = -5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.x).toBeGreaterThan(0);
    });

    it('should bounce off the north wall when rotated 45° and a corner extends into it', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 0, z: -23.5 });
      robot.group.rotation.y = Math.PI / 4;
      robot.velocity.z = -5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.z).toBeGreaterThan(0);
    });

    it('should bounce off the south wall when rotated 45° and a corner extends into it', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 0, z: 23.5 });
      robot.group.rotation.y = Math.PI / 4;
      robot.velocity.z = 5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.z).toBeLessThan(0);
    });

    it('should not bounce when rotated 45° and the AABB is safely inside', () => {
      const arenaSize = 50;
      // At 45° the AABB maxX ≈ 1.768, so limitX ≈ 23.232 → x=22 is well inside
      const robot = createRobot({ x: 22, z: 0 });
      robot.group.rotation.y = Math.PI / 4;
      robot.velocity.x = 5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(false);
    });

    it('should clamp position so no corner extends beyond the wall when rotated', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      const robot = createRobot({ x: 24, z: 0 }); // just past the east wall inner face
      robot.group.rotation.y = Math.PI / 4;
      robot.velocity.x = 5;
      robot.bounceOffWalls(arenaSize);

      // After clamping, the rotated AABB maxX extent must sit inside the arena
      const cosR = Math.cos(Math.PI / 4);
      const sinR = Math.sin(Math.PI / 4);
      const halfW = 1.6;
      const halfD = 1.7;
      let maxX = -Infinity;
      for (const lz of [-halfD, halfD]) {
        for (const lx of [-halfW, halfW]) {
          const wx = cosR * lx + sinR * lz;
          if (wx > maxX) maxX = wx;
        }
      }
      expect(robot.group.position.x + maxX).toBeLessThanOrEqual(half + 0.001);
    });

    it('should handle 90° rotation correctly (width and depth swap in AABB)', () => {
      const arenaSize = 50;
      // At rotation=π/2 the body depth (3) aligns with the X axis and width (2) with Z.
      // AABB halfX = depth/2 = 1.5, limitX = 25 - 1.5 = 23.5
      // At x=24: old axis-aligned code used halfW=1 → limitX=24 → barely no bounce.
      // Rotation-aware code: halfX=1.5 → limitX=23.5 → 24 > 23.5 → bounce.
      const robot = createRobot({ x: 24, z: 0 });
      robot.group.rotation.y = Math.PI / 2;
      robot.velocity.x = 5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });
  });

  describe('wheel collision with walls', () => {
    // Robot geometry (default wheelRadius=0.6):
    //   width=2, depth=3, wheelWidth = wheelRadius * 0.5 = 0.3
    //   AXLE_GAP = 0.3
    //   wheelOffsetX = width/2 + AXLE_GAP + wheelWidth/2 = 1 + 0.3 + 0.15 = 1.45
    //   Wheel outer edge X = wheelOffsetX + wheelWidth/2 = 1.45 + 0.15 = 1.6
    //   → effective halfW = 1.6  (body-only halfW = 1.0)
    //
    //   wheelOffsetZ = depth/2 - 0.4 = 1.1
    //   Wheel outer Z = wheelOffsetZ + wheelRadius = 1.1 + 0.6 = 1.7
    //   → effective halfD = max(1.5, 1.7) = 1.7  (body-only halfD = 1.5)
    //
    // With arenaSize=50 (half=25) at rotation=0:
    //   body-only limitX = 25 - 1.0 = 24.0
    //   wheel     limitX = 25 - 1.6 = 23.4
    //   body-only limitZ = 25 - 1.5 = 23.5
    //   wheel     limitZ = 25 - 1.7 = 23.3

    it('should bounce off the east wall when the wheel extends into it even though the body centre is clear', () => {
      // At x=23.5: body-only → no bounce (23.5 < 24.0), wheel-inclusive → bounce (23.5 > 23.4)
      const arenaSize = 50;
      const robot = createRobot({ x: 23.5, z: 0 });
      robot.velocity.x = 5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.x).toBeLessThan(0);
    });

    it('should bounce off the west wall when the wheel extends into it even though the body centre is clear', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: -23.5, z: 0 });
      robot.velocity.x = -5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.x).toBeGreaterThan(0);
    });

    it('should not bounce when all wheels are inside the arena', () => {
      // wheel outer edge at x = 23 + 1.6 = 24.6, inside half=25
      const arenaSize = 50;
      const robot = createRobot({ x: 23, z: 0 });
      robot.velocity.x = 5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(false);
    });

    it('should clamp position so no wheel extends beyond the arena wall', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      // effectiveHalfWidth = width/2 + AXLE_GAP + wheelWidth = 1 + 0.3 + 0.3 = 1.6
      const effectiveHalfWidth = 1.6;
      const robot = createRobot({ x: 24, z: 0 }); // just past the east wall inner face
      robot.velocity.x = 5;
      robot.bounceOffWalls(arenaSize);
      expect(robot.group.position.x + effectiveHalfWidth).toBeLessThanOrEqual(half + 0.001);
    });

    it('should bounce off the south wall when the wheel radius extends past it', () => {
      // At z=23.4: body-only limitZ=23.5 → no bounce; wheel limitZ=23.3 → bounce
      const arenaSize = 50;
      const robot = createRobot({ x: 0, z: 23.4 });
      robot.velocity.z = 5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.z).toBeLessThan(0);
    });

    it('should bounce off the north wall when the wheel radius extends past it', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 0, z: -23.4 });
      robot.velocity.z = -5;
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.z).toBeGreaterThan(0);
    });

    it('should clamp position so no wheel extends beyond the north/south wall', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      // effectiveHalfDepth = max(depth/2, wheelOffsetZ + wheelRadius) = max(1.5, 1.7) = 1.7
      const effectiveHalfDepth = 1.7;
      const robot = createRobot({ x: 0, z: 24 }); // just past the south wall inner face
      robot.velocity.z = 5;
      robot.bounceOffWalls(arenaSize);
      expect(robot.group.position.z + effectiveHalfDepth).toBeLessThanOrEqual(half + 0.001);
    });
  });

  describe('height-aware wall collision (flipping out of arena)', () => {
    // Arena wall height = 2.  Robot groupY = wheelRadius + height/2 = 0.6 + 0.5 = 1.1
    // The robot's lowest point is at group.position.y - groupY.
    // When on the ground: bottomY = 1.1 - 1.1 = 0 (below wall top of 2).
    // When flipped high: e.g. group.position.y = 5 → bottomY = 5 - 1.1 = 3.9 (above wall top).
    const WALL_HEIGHT = 2;

    it('should bounce off the wall when below wall height (grounded)', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 24, z: 0 });
      robot.velocity.x = 10;
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.x).toBeLessThan(0);
    });

    it('should NOT bounce when airborne and lowest point is above wall height', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 24, z: 0 });
      // Lift the robot so bottomY = group.position.y - groupY >= WALL_HEIGHT
      // groupY = 1.1, so need position.y >= 1.1 + 2 = 3.1
      robot.group.position.y = 4;
      robot.velocity.x = 10;
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT);
      expect(result.bounced).toBe(false);
      // Velocity should be unchanged — robot sailed over the wall
      expect(robot.velocity.x).toBe(10);
    });

    it('should still bounce when airborne but lowest point is below wall top', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 24, z: 0 });
      // Lift slightly — bottomY = 2.5 - 1.1 = 1.4, still below wall height of 2
      robot.group.position.y = 2.5;
      robot.velocity.x = 10;
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT);
      expect(result.bounced).toBe(true);
    });

    it('should NOT bounce when exactly at wall height threshold', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 24, z: 0 });
      // Set position so bottomY = exactly WALL_HEIGHT
      // bottomY = group.position.y - groupY = WALL_HEIGHT → position.y = groupY + WALL_HEIGHT
      robot.group.position.y = robot.groundY + WALL_HEIGHT;
      robot.velocity.x = 10;
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT);
      expect(result.bounced).toBe(false);
    });

    it('should allow the robot to fly past all four walls when high enough', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;

      // Test east wall
      const r1 = createRobot({ x: half + 5, z: 0 });
      r1.group.position.y = 4;
      r1.velocity.x = 10;
      expect(r1.bounceOffWalls(arenaSize, WALL_HEIGHT).bounced).toBe(false);

      // Test west wall
      const r2 = createRobot({ x: -(half + 5), z: 0 });
      r2.group.position.y = 4;
      r2.velocity.x = -10;
      expect(r2.bounceOffWalls(arenaSize, WALL_HEIGHT).bounced).toBe(false);

      // Test north wall
      const r3 = createRobot({ x: 0, z: -(half + 5) });
      r3.group.position.y = 4;
      r3.velocity.z = -10;
      expect(r3.bounceOffWalls(arenaSize, WALL_HEIGHT).bounced).toBe(false);

      // Test south wall
      const r4 = createRobot({ x: 0, z: half + 5 });
      r4.group.position.y = 4;
      r4.velocity.z = 10;
      expect(r4.bounceOffWalls(arenaSize, WALL_HEIGHT).bounced).toBe(false);
    });

    it('should still bounce when no wallHeight is passed (backwards compatible)', () => {
      const arenaSize = 50;
      const robot = createRobot({ x: 24, z: 0 });
      robot.group.position.y = 100; // very high
      robot.velocity.x = 10;
      // No wallHeight param → defaults to Infinity → always collides
      const result = robot.bounceOffWalls(arenaSize);
      expect(result.bounced).toBe(true);
    });

    it('should bounce off the outer face of the wall when outside the arena', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      const WALL_HEIGHT = 2;
      const WALL_THICKNESS = 0.5;
      const outerFace = half + WALL_THICKNESS / 2;
      // Robot just outside the east wall, moving inward
      const robot = createRobot({ x: outerFace + 0.5, z: 0 });
      robot.velocity.x = -10;
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT, WALL_THICKNESS);
      expect(result.bounced).toBe(true);
      expect(robot.velocity.x).toBeGreaterThan(0); // reversed away from wall
    });

    it('should not bounce when outside the arena and far from wall', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      const WALL_HEIGHT = 2;
      const WALL_THICKNESS = 0.5;
      // Robot far outside the east wall
      const robot = createRobot({ x: half + 5, z: 0 });
      robot.velocity.x = 10; // moving away
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT, WALL_THICKNESS);
      expect(result.bounced).toBe(false);
    });

    it('should land on the wall top when above wall height and over the wall footprint', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      const WALL_HEIGHT = 2;
      const WALL_THICKNESS = 0.5;
      const robot = createRobot({ x: half, z: 0 }); // on the east wall's X centre
      robot.group.position.y = WALL_HEIGHT + robot.groundY + 0.5; // above the wall
      robot.velocityY = -2; // descending
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT, WALL_THICKNESS);
      expect(result.bounced).toBe(false);
      // Should land on wall top
      expect(robot.group.position.y).toBeCloseTo(WALL_HEIGHT + robot.groundY, 5);
      expect(robot.velocityY).toBe(0);
    });

    it('should not land on wall top when not over wall footprint', () => {
      const arenaSize = 50;
      const half = arenaSize / 2;
      const WALL_HEIGHT = 2;
      const WALL_THICKNESS = 0.5;
      const robot = createRobot({ x: 10, z: 0 }); // far from any wall
      robot.group.position.y = WALL_HEIGHT + robot.groundY + 0.5;
      robot.velocityY = -2;
      const originalY = robot.group.position.y;
      const result = robot.bounceOffWalls(arenaSize, WALL_HEIGHT, WALL_THICKNESS);
      expect(result.bounced).toBe(false);
      // Should NOT land — Y unchanged
      expect(robot.group.position.y).toBe(originalY);
    });
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
    // Forward velocity (vz at rotation=0) should decay due to friction (0.98)
    expect(robot.velocity.z).toBeCloseTo(3 * 0.98, 5);
    // Lateral velocity (vx at rotation=0) should decay more aggressively due to
    // both normal friction and lateral grip
    expect(robot.velocity.x).toBeLessThan(5 * 0.98);
    expect(robot.velocity.x).toBeGreaterThan(0);
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

  describe('updateAI', () => {
    it('should expose an updateAI method', () => {
      const robot = createRobot();
      expect(typeof robot.updateAI).toBe('function');
    });

    it('should give the robot non-zero velocity after calling updateAI toward a distant target', () => {
      const robot = createRobot({ x: 0, z: 0 });
      robot.updateAI(0.1, { x: 10, z: 0 });
      const speed = Math.sqrt(robot.velocity.x ** 2 + robot.velocity.z ** 2);
      expect(speed).toBeGreaterThan(0);
    });

    it('should rotate the robot to face the target over time', () => {
      const robot = createRobot({ x: 0, z: 0 });
      // Target is to the right (+x). After enough AI ticks it should be facing roughly +x.
      for (let i = 0; i < 100; i++) robot.updateAI(0.016, { x: 20, z: 0 });
      // Facing +x means rotation.y ≈ PI/2
      expect(robot.group.rotation.y).toBeCloseTo(Math.PI / 2, 1);
    });

    it('should move toward the target over time', () => {
      const robot = createRobot({ x: 0, z: 0 });
      const target = { x: 20, z: 0 };
      const startDist = Math.abs(target.x - robot.group.position.x);
      for (let i = 0; i < 60; i++) {
        robot.updateAI(0.016, target);
        robot.update(0.016);
      }
      const endDist = Math.abs(target.x - robot.group.position.x);
      expect(endDist).toBeLessThan(startDist);
    });

    it('should not accelerate beyond AI_SPEED', () => {
      const robot = createRobot({ x: 0, z: 0 });
      // Many ticks pointing at target far away
      for (let i = 0; i < 200; i++) {
        robot.updateAI(0.016, { x: 1000, z: 0 });
        robot.update(0.016);
      }
      const speed = Math.sqrt(robot.velocity.x ** 2 + robot.velocity.z ** 2);
      expect(speed).toBeLessThanOrEqual(8 + 0.5); // AI_SPEED = 8, small tolerance for friction
    });

    it('should do nothing when already on top of the target', () => {
      const robot = createRobot({ x: 0, z: 0 });
      robot.updateAI(0.1, { x: 0, z: 0 });
      expect(robot.velocity.x).toBe(0);
      expect(robot.velocity.z).toBe(0);
    });
  });

  describe('lateral grip (anti-slide)', () => {
    it('should damp sideways velocity relative to heading each frame', () => {
      const robot = createRobot({ x: 0, z: 0 });
      // Heading is default (rotation.y = 0) → forward is (0, -1) in XZ
      // Give the robot pure lateral velocity (along +x)
      robot.velocity.x = 10;
      robot.velocity.z = 0;
      robot.update(1 / 60);
      // After one frame, lateral component should be significantly reduced
      // compared to what plain FRICTION (0.98) alone would give
      const plainFrictionResult = 10 * 0.98;
      expect(Math.abs(robot.velocity.x)).toBeLessThan(plainFrictionResult);
    });

    it('should not damp forward velocity (along the heading)', () => {
      const robot = createRobot({ x: 0, z: 0 });
      // Heading default → forward is (0, -1). Give pure forward velocity.
      robot.velocity.x = 0;
      robot.velocity.z = -10;
      robot.update(1 / 60);
      // Forward velocity should only be affected by normal FRICTION, not lateral grip
      const expected = -10 * 0.98;
      expect(robot.velocity.z).toBeCloseTo(expected, 2);
    });

    it('should make the robot track its heading when turning toward a new target', () => {
      // Robot starts heading along -Z, we give it velocity along -Z, then
      // steer it 90° to face +X. The robot should curve toward the new heading
      // rather than keep sliding along -Z.
      const robot = createRobot({ x: 0, z: 0 });
      // Push it forward along its initial heading
      robot.velocity.z = -8;
      // Now steer toward +X and simulate for a bit
      for (let i = 0; i < 120; i++) {
        robot.updateAI(1 / 60, { x: 50, z: 0 });
        robot.update(1 / 60);
      }
      // After turning toward +X and gripping, most velocity should be along +X
      const speed = Math.sqrt(robot.velocity.x ** 2 + robot.velocity.z ** 2);
      if (speed > 0.1) {
        const forwardFraction = robot.velocity.x / speed; // should be large and positive
        expect(forwardFraction).toBeGreaterThan(0.7);
      }
    });

    it('should not apply lateral grip while airborne', () => {
      const robot = createRobot({ x: 0, z: 0 });
      // Launch the robot into the air
      robot.velocityY = 10;
      robot.update(1 / 60); // now airborne
      // Give pure lateral velocity
      robot.velocity.x = 10;
      robot.velocity.z = 0;
      const before = robot.velocity.x;
      robot.update(1 / 60);
      // Should only lose normal friction, not lateral grip
      const expected = before * 0.98;
      expect(robot.velocity.x).toBeCloseTo(expected, 2);
    });
  });
});
