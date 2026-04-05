import { describe, it, expect, beforeEach } from 'vitest';
import {
  createArenaFlipper,
  createArenaFlippers,
  FLIPPER_WIDTH,
  FLIPPER_DEPTH,
  STATE_IDLE,
  STATE_FIRING,
  STATE_RESETTING,
  STATE_COOLDOWN,
} from '../src/arena-flipper.js';
import { createRobot } from '../src/robot.js';

// ── Helper: advance flipper by N small steps ──────────────────────
function tick(flipper, totalTime, steps = 100) {
  const dt = totalTime / steps;
  for (let i = 0; i < steps; i++) flipper.update(dt);
}

// ── createArenaFlipper: construction ──────────────────────────────
describe('createArenaFlipper — construction', () => {
  it('creates a Three.js group at the given position', () => {
    const f = createArenaFlipper(5, -8);
    expect(f.group.isGroup).toBe(true);
    expect(f.group.position.x).toBe(5);
    expect(f.group.position.z).toBe(-8);
  });

  it('contains a base mesh and paddle mesh', () => {
    const f = createArenaFlipper(0, 0);
    expect(f.base.isMesh).toBe(true);
    expect(f.paddle.isMesh).toBe(true);
    expect(f.group.children).toContain(f.base);
    expect(f.group.children).toContain(f.paddle);
  });

  it('starts in idle state with angle at rest', () => {
    const f = createArenaFlipper(0, 0);
    expect(f.getState()).toBe(STATE_IDLE);
    expect(f.getAngle()).toBe(0);
  });

  it('accepts a custom facing angle', () => {
    const f = createArenaFlipper(0, 0, Math.PI / 2);
    expect(f.group.rotation.y).toBeCloseTo(Math.PI / 2);
  });

  it('accepts custom tuning overrides', () => {
    const f = createArenaFlipper(0, 0, 0, { cooldown: 5, launchUp: 20 });
    const cfg = f.getConfig();
    expect(cfg.cooldown).toBe(5);
    expect(cfg.launchUp).toBe(20);
  });
});

// ── State machine ─────────────────────────────────────────────────
describe('createArenaFlipper — state machine', () => {
  let flipper;

  beforeEach(() => {
    flipper = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10,
      activeAngle: 1.0,   // ~57°
      resetSpeed: 5,
      cooldown: 1.0,
      restAngle: 0,
    });
  });

  it('transitions from idle to firing on fire()', () => {
    expect(flipper.fire()).toBe(true);
    expect(flipper.getState()).toBe(STATE_FIRING);
  });

  it('fire() returns false if not idle', () => {
    flipper.fire();
    expect(flipper.fire()).toBe(false); // already firing
  });

  it('angle increases during firing state', () => {
    flipper.fire();
    flipper.update(0.05);
    expect(flipper.getAngle()).toBeGreaterThan(0);
  });

  it('transitions to resetting when angle reaches activeAngle', () => {
    flipper.fire();
    // swingSpeed=10, activeAngle=1.0 → takes 0.1s; use exactly 0.1s
    tick(flipper, 0.1);
    expect(flipper.getState()).toBe(STATE_RESETTING);
    expect(flipper.getAngle()).toBeCloseTo(1.0);
  });

  it('angle decreases during resetting state', () => {
    flipper.fire();
    tick(flipper, 0.15); // reach active angle
    const peakAngle = flipper.getAngle();
    flipper.update(0.05);
    expect(flipper.getAngle()).toBeLessThan(peakAngle);
  });

  it('transitions to cooldown when angle returns to rest', () => {
    flipper.fire();
    // Fire to peak: 0.1s, reset to 0: 0.2s (resetSpeed=5, angle=1.0) → total 0.3s
    tick(flipper, 0.5);
    expect(flipper.getState()).toBe(STATE_COOLDOWN);
    expect(flipper.getAngle()).toBeCloseTo(0);
  });

  it('cooldown timer decreases over time', () => {
    flipper.fire();
    tick(flipper, 0.35); // reach cooldown
    const timerBefore = flipper.getCooldownTimer();
    flipper.update(0.1);
    expect(flipper.getCooldownTimer()).toBeLessThan(timerBefore);
  });

  it('transitions back to idle after cooldown expires', () => {
    flipper.fire();
    // Fire: 0.1s, reset: 0.2s, cooldown: 1.0s → total ≈ 1.3s
    tick(flipper, 2.0);
    expect(flipper.getState()).toBe(STATE_IDLE);
    expect(flipper.getCooldownTimer()).toBe(0);
  });

  it('can fire again after full cycle completes', () => {
    flipper.fire();
    // Fire: 0.1s, reset: 0.2s, cooldown: 1.0s → total ≈ 1.3s
    tick(flipper, 2.0);
    expect(flipper.fire()).toBe(true);
    expect(flipper.getState()).toBe(STATE_FIRING);
  });

  it('angle never exceeds activeAngle', () => {
    flipper.fire();
    tick(flipper, 0.5);
    expect(flipper.getAngle()).toBeLessThanOrEqual(1.0 + 1e-9);
  });

  it('angle never goes below restAngle', () => {
    flipper.fire();
    tick(flipper, 2.0);
    expect(flipper.getAngle()).toBeGreaterThanOrEqual(0 - 1e-9);
  });

  it('update is a no-op while idle', () => {
    flipper.update(1.0);
    expect(flipper.getState()).toBe(STATE_IDLE);
    expect(flipper.getAngle()).toBe(0);
  });
});

// ── Paddle visual rotation ────────────────────────────────────────
describe('createArenaFlipper — paddle rotation', () => {
  it('paddle rotation.x reflects the current angle (negated)', () => {
    const f = createArenaFlipper(0, 0, 0, { swingSpeed: 10, activeAngle: 1.0 });
    f.fire();
    f.update(0.05);
    expect(f.paddle.rotation.x).toBeCloseTo(-f.getAngle());
  });
});

// ── Contact detection ─────────────────────────────────────────────
describe('createArenaFlipper — checkContact', () => {
  let flipper, robot;

  beforeEach(() => {
    flipper = createArenaFlipper(0, 0);
    robot = createRobot({ x: 0, z: 0 });
  });

  it('detects contact when robot is directly over the flipper', () => {
    robot.group.position.set(0, robot.groundY, 0);
    expect(flipper.checkContact(robot).onPaddle).toBe(true);
  });

  it('no contact when robot is far away in X', () => {
    robot.group.position.set(20, robot.groundY, 0);
    expect(flipper.checkContact(robot).onPaddle).toBe(false);
  });

  it('no contact when robot is far away in Z', () => {
    robot.group.position.set(0, robot.groundY, 20);
    expect(flipper.checkContact(robot).onPaddle).toBe(false);
  });

  it('no contact when robot is airborne', () => {
    robot.group.position.set(0, robot.groundY + 3, 0);
    expect(flipper.checkContact(robot).onPaddle).toBe(false);
  });

  it('reports correct localX and localZ for centred robot', () => {
    robot.group.position.set(0, robot.groundY, 0);
    const contact = flipper.checkContact(robot);
    expect(contact.localX).toBeCloseTo(0);
    expect(contact.localZ).toBeCloseTo(0);
  });

  it('respects flipper facing angle when checking contact', () => {
    // Flipper facing east (rotation = PI/2), so paddle extends along -X in world space
    const rotated = createArenaFlipper(0, 0, Math.PI / 2);
    // Robot directly in front of the rotated flipper
    robot.group.position.set(-1, robot.groundY, 0);
    expect(rotated.checkContact(robot).onPaddle).toBe(true);
  });

  it('no contact at edge+1 in X', () => {
    robot.group.position.set(FLIPPER_WIDTH / 2 + 1, robot.groundY, 0);
    expect(flipper.checkContact(robot).onPaddle).toBe(false);
  });

  it('no contact at edge+1 in Z', () => {
    robot.group.position.set(0, robot.groundY, FLIPPER_DEPTH / 2 + 1);
    expect(flipper.checkContact(robot).onPaddle).toBe(false);
  });
});

// ── Launch physics ────────────────────────────────────────────────
describe('createArenaFlipper — applyLaunch', () => {
  let flipper, robot;

  beforeEach(() => {
    flipper = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10,
      activeAngle: 1.0,
      launchUp: 12,
      launchForward: 6,
      launchAssistMax: 0.3,
    });
    robot = createRobot({ x: 0, z: 0 });
    robot.group.position.set(0, robot.groundY, 0);
  });

  it('returns false when flipper is idle', () => {
    expect(flipper.applyLaunch(robot)).toBe(false);
  });

  it('returns false when angle is still at rest', () => {
    flipper.fire();
    // Don't update — angle stays at 0
    expect(flipper.applyLaunch(robot)).toBe(false);
  });

  it('returns true and applies upward velocity during firing', () => {
    flipper.fire();
    flipper.update(0.05);
    expect(flipper.applyLaunch(robot)).toBe(true);
    expect(robot.velocityY).toBeGreaterThan(0);
  });

  it('applies forward impulse in the flipper facing direction', () => {
    flipper.fire();
    flipper.update(0.05);
    flipper.applyLaunch(robot);
    // Facing angle = 0, forward = (0, -1), so robot should get negative Z velocity
    expect(robot.velocity.z).toBeLessThan(0);
  });

  it('scales impulse with swing progress', () => {
    const r1 = createRobot({ x: 0, z: 0 });
    r1.group.position.set(0, r1.groundY, 0);
    const r2 = createRobot({ x: 0, z: 0 });
    r2.group.position.set(0, r2.groundY, 0);

    const f1 = createArenaFlipper(0, 0, 0, { swingSpeed: 10, activeAngle: 1.0, launchUp: 12 });
    const f2 = createArenaFlipper(0, 0, 0, { swingSpeed: 10, activeAngle: 1.0, launchUp: 12 });

    f1.fire();
    f1.update(0.02); // small progress
    f1.applyLaunch(r1);

    f2.fire();
    f2.update(0.08); // larger progress
    f2.applyLaunch(r2);

    expect(r2.velocityY).toBeGreaterThan(r1.velocityY);
  });

  it('only launches a robot once per swing', () => {
    flipper.fire();
    flipper.update(0.05);
    flipper.applyLaunch(robot);
    const vyAfterFirst = robot.velocityY;
    flipper.update(0.02);
    flipper.applyLaunch(robot);
    expect(robot.velocityY).toBe(vyAfterFirst); // no additional impulse
  });

  it('can launch the same robot again on a new swing', () => {
    flipper.fire();
    flipper.update(0.05);
    flipper.applyLaunch(robot);
    // Complete full cycle: fire (~0.1s) + reset (~0.17s) + cooldown (2.5s) ≈ 2.8s; use 4.0s for safety
    tick(flipper, 4.0);
    expect(flipper.getState()).toBe(STATE_IDLE);
    robot.velocityY = 0;
    robot.velocity.x = 0;
    robot.velocity.z = 0;
    robot.group.position.set(0, robot.groundY, 0);

    flipper.fire();
    flipper.update(0.05);
    expect(flipper.applyLaunch(robot)).toBe(true);
    expect(robot.velocityY).toBeGreaterThan(0);
  });

  it('returns false when robot is not on the paddle', () => {
    robot.group.position.set(50, robot.groundY, 50);
    flipper.fire();
    flipper.update(0.05);
    expect(flipper.applyLaunch(robot)).toBe(false);
  });

  it('returns false during resetting state', () => {
    flipper.fire();
    tick(flipper, 0.15); // reach resetting
    expect(flipper.getState()).toBe(STATE_RESETTING);
    expect(flipper.applyLaunch(robot)).toBe(false);
  });

  it('returns false during cooldown state', () => {
    flipper.fire();
    tick(flipper, 0.5); // reach cooldown (fire: 0.1s, reset: 0.2s → total 0.3s)
    expect(flipper.getState()).toBe(STATE_COOLDOWN);
    expect(flipper.applyLaunch(robot)).toBe(false);
  });

  it('applies lateral assist when robot is off-centre', () => {
    robot.group.position.set(1, robot.groundY, 0); // right of centre
    flipper.fire();
    flipper.update(0.05);
    flipper.applyLaunch(robot);
    // Facing 0 → lateral direction is (cos(0), -sin(0)) = (1, 0) in world
    // Positive offset → positive X velocity
    expect(robot.velocity.x).toBeGreaterThan(0);
  });

  it('applies negative lateral assist when robot is left of centre', () => {
    robot.group.position.set(-1, robot.groundY, 0); // left of centre
    flipper.fire();
    flipper.update(0.05);
    flipper.applyLaunch(robot);
    expect(robot.velocity.x).toBeLessThan(0);
  });

  it('does not launch an airborne robot', () => {
    robot.group.position.set(0, robot.groundY + 3, 0);
    flipper.fire();
    flipper.update(0.05);
    expect(flipper.applyLaunch(robot)).toBe(false);
    expect(robot.velocityY).toBe(0);
  });
});

// ── Reset ─────────────────────────────────────────────────────────
describe('createArenaFlipper — reset', () => {
  it('returns to idle state and rest angle', () => {
    const f = createArenaFlipper(0, 0, 0, { swingSpeed: 10, activeAngle: 1.0 });
    f.fire();
    tick(f, 0.05);
    f.reset();
    expect(f.getState()).toBe(STATE_IDLE);
    expect(f.getAngle()).toBe(0);
    expect(f.getCooldownTimer()).toBe(0);
  });

  it('allows firing immediately after reset', () => {
    const f = createArenaFlipper(0, 0);
    f.fire();
    tick(f, 0.05);
    f.reset();
    expect(f.fire()).toBe(true);
  });

  it('resets paddle visual rotation', () => {
    const f = createArenaFlipper(0, 0, 0, { swingSpeed: 10, activeAngle: 1.0 });
    f.fire();
    tick(f, 0.05);
    f.reset();
    expect(f.paddle.rotation.x).toBeCloseTo(0);
  });
});

// ── Rotated flipper launch direction ──────────────────────────────
describe('createArenaFlipper — rotated launch direction', () => {
  it('launch pushes robot in correct world direction when flipper faces east', () => {
    // Facing angle = PI/2 → forward direction is (-sin(PI/2), -cos(PI/2)) = (-1, 0)
    const f = createArenaFlipper(0, 0, Math.PI / 2, {
      swingSpeed: 10, activeAngle: 1.0, launchForward: 6,
    });
    const robot = createRobot({ x: 0, z: 0 });
    robot.group.position.set(-1, robot.groundY, 0);
    f.fire();
    f.update(0.05);
    f.applyLaunch(robot);
    expect(robot.velocity.x).toBeLessThan(0); // pushed toward -X
  });

  it('launch pushes robot in correct world direction when flipper faces south', () => {
    // Facing angle = PI → forward direction is (-sin(PI), -cos(PI)) = (0, 1)
    const f = createArenaFlipper(0, 0, Math.PI, {
      swingSpeed: 10, activeAngle: 1.0, launchForward: 6,
    });
    const robot = createRobot({ x: 0, z: 0 });
    robot.group.position.set(0, robot.groundY, 1);
    f.fire();
    f.update(0.05);
    f.applyLaunch(robot);
    expect(robot.velocity.z).toBeGreaterThan(0); // pushed toward +Z
  });
});

// ── createArenaFlippers (factory) ─────────────────────────────────
describe('createArenaFlippers', () => {
  it('creates at least one flipper', () => {
    const af = createArenaFlippers(70);
    expect(af.flippers.length).toBeGreaterThan(0);
  });

  it('places flippers inside the arena bounds', () => {
    const arenaSize = 70;
    const half = arenaSize / 2;
    const af = createArenaFlippers(arenaSize);
    for (const f of af.flippers) {
      expect(Math.abs(f.group.position.x)).toBeLessThan(half);
      expect(Math.abs(f.group.position.z)).toBeLessThan(half);
    }
  });

  it('update ticks all flippers', () => {
    const af = createArenaFlippers(70);
    af.flippers[0].fire();
    af.update(0.05);
    expect(af.flippers[0].getAngle()).toBeGreaterThan(0);
  });

  it('reset resets all flippers', () => {
    const af = createArenaFlippers(70);
    af.flippers[0].fire();
    af.update(0.05);
    af.reset();
    for (const f of af.flippers) {
      expect(f.getState()).toBe(STATE_IDLE);
      expect(f.getAngle()).toBe(0);
    }
  });

  it('fire triggers all idle flippers', () => {
    const af = createArenaFlippers(70);
    af.fire();
    for (const f of af.flippers) {
      expect(f.getState()).toBe(STATE_FIRING);
    }
  });
});
