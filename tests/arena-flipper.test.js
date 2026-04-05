import { describe, it, expect, beforeEach } from 'vitest';
import {
  createArenaFlipper,
  createArenaFlippers,
  FLIPPER_WIDTH,
  FLIPPER_DEPTH,
  BASE_HEIGHT,
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
      swingEase: 0,        // linear swing for state machine timing tests
      resetEaseZone: 0,    // linear reset for state machine timing tests
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

  it('applies reduced carry impulse on subsequent frames during same swing', () => {
    flipper.fire();
    flipper.update(0.05);
    flipper.applyLaunch(robot);
    const vyAfterFirst = robot.velocityY;
    flipper.update(0.02);
    flipper.applyLaunch(robot);
    // Second hit adds a carry impulse (reduced by carryFractionPerFrame),
    // so total velocity should be greater than after the first hit alone.
    expect(robot.velocityY).toBeGreaterThan(vyAfterFirst);
  });

  it('can launch the same robot again on a new swing', () => {
    flipper.fire();
    flipper.update(0.05);
    flipper.applyLaunch(robot);
    // Complete full cycle: fire (~0.1s) + reset (~0.17s) + cooldown (5.5s) ≈ 5.8s; use 7.0s for safety
    tick(flipper, 7.0);
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

// ── Swing ease ────────────────────────────────────────────────────
describe('createArenaFlipper — swing ease', () => {
  it('eased swing reaches a lower angle than linear swing after the same time', () => {
    const linear = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, swingEase: 0,
    });
    const eased = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, swingEase: 0.5,
    });

    linear.fire();
    eased.fire();
    tick(linear, 0.08);
    tick(eased, 0.08);

    expect(eased.getAngle()).toBeLessThan(linear.getAngle());
  });

  it('eased swing still reaches activeAngle and transitions to resetting', () => {
    const eased = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, swingEase: 0.5,
    });
    eased.fire();
    tick(eased, 0.5);
    expect(eased.getState()).not.toBe(STATE_FIRING);
  });

  it('swingEase of 0 produces a linear swing', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, swingEase: 0,
    });
    f.fire();
    f.update(0.05);
    expect(f.getAngle()).toBeCloseTo(0.5, 3);
  });

  it('new tuning values are accessible via getConfig', () => {
    const f = createArenaFlipper(0, 0, 0, { swingEase: 0.7 });
    const cfg = f.getConfig();
    expect(cfg.swingEase).toBe(0.7);
    expect(cfg.launchWindowEnd).toBeDefined();
    expect(cfg.contactDepthScale).toBeDefined();
    expect(cfg.resetEaseZone).toBeDefined();
    expect(cfg.directionBlend).toBeDefined();
  });
});

// ── Reset ease ────────────────────────────────────────────────────
describe('createArenaFlipper — reset ease', () => {
  it('reset speed slows down near rest angle when resetEaseZone > 0', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 100, activeAngle: 0.3, resetSpeed: 5,
      resetEaseZone: 0.2, swingEase: 0,
    });
    f.fire();
    tick(f, 0.01); // reach peak quickly at high swingSpeed

    // Advance into resetting and record rate outside ease zone
    f.update(0.01); // still well above ease zone
    const angleBefore = f.getAngle();
    f.update(0.01);
    const rateOutside = angleBefore - f.getAngle();

    // Advance until inside ease zone (angle < 0.2)
    tick(f, 0.05);
    const angleInZone = f.getAngle();
    if (angleInZone > 0.01 && angleInZone < 0.2) {
      f.update(0.01);
      const rateInside = angleInZone - f.getAngle();
      expect(rateInside).toBeLessThan(rateOutside);
    }
  });

  it('reset with ease zone still reaches rest angle', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, resetSpeed: 5,
      resetEaseZone: 0.15, swingEase: 0,
    });
    f.fire();
    tick(f, 3.0);
    expect(f.getAngle()).toBeCloseTo(0, 3);
    expect(f.getState()).not.toBe(STATE_RESETTING);
  });

  it('resetEaseZone of 0 produces a linear reset', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 100, activeAngle: 0.2, resetSpeed: 5,
      resetEaseZone: 0, swingEase: 0,
    });
    f.fire();
    tick(f, 0.01); // fire to peak quickly
    // Now in resetting at angle ≈ 0.2
    const before = f.getAngle();
    f.update(0.01);
    // Linear rate = resetSpeed * dt = 5 * 0.01 = 0.05
    expect(before - f.getAngle()).toBeCloseTo(0.05, 3);
  });
});

// ── Launch window ─────────────────────────────────────────────────
describe('createArenaFlipper — launch window', () => {
  it('late swing (beyond launchWindowEnd) produces less vertical force than mid-swing', () => {
    const rMid = createRobot({ x: 0, z: 0 });
    rMid.group.position.set(0, rMid.groundY, 0);
    const rLate = createRobot({ x: 0, z: 0 });
    rLate.group.position.set(0, rLate.groundY, 0);

    // Launch at progress 0.5 (within window)
    const fMid = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      launchWindowEnd: 0.6, contactDepthScale: 0, swingEase: 0, directionBlend: 0,
    });
    fMid.fire();
    fMid.update(0.05); // progress = 0.5
    fMid.applyLaunch(rMid);

    // Launch at progress 0.9 (beyond window, tapering)
    const fLate = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      launchWindowEnd: 0.6, contactDepthScale: 0, swingEase: 0, directionBlend: 0,
    });
    fLate.fire();
    fLate.update(0.09); // progress = 0.9
    fLate.applyLaunch(rLate);

    // Mid-swing should produce a stronger launch despite lower progress
    expect(rMid.velocityY).toBeGreaterThan(rLate.velocityY);
  });

  it('launchWindowEnd of 1.0 applies full force at any progress', () => {
    const r1 = createRobot({ x: 0, z: 0 });
    r1.group.position.set(0, r1.groundY, 0);
    const r2 = createRobot({ x: 0, z: 0 });
    r2.group.position.set(0, r2.groundY, 0);

    const f1 = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      launchWindowEnd: 1.0, contactDepthScale: 0, swingEase: 0, directionBlend: 0,
    });
    const f2 = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      launchWindowEnd: 1.0, contactDepthScale: 0, swingEase: 0, directionBlend: 0,
    });

    f1.fire(); f1.update(0.02); f1.applyLaunch(r1);
    f2.fire(); f2.update(0.08); f2.applyLaunch(r2);

    // Higher progress always gives more force when window is 1.0
    expect(r2.velocityY).toBeGreaterThan(r1.velocityY);
    // Force = launchUp * progress → 12 * 0.2 = 2.4 and 12 * 0.8 = 9.6
    expect(r1.velocityY).toBeCloseTo(12 * 0.2, 1);
    expect(r2.velocityY).toBeCloseTo(12 * 0.8, 1);
  });
});

// ── Contact depth quality ─────────────────────────────────────────
describe('createArenaFlipper — contact depth', () => {
  it('robot at paddle tip receives stronger launch than robot at hinge', () => {
    const rTip = createRobot({ x: 0, z: 0 });
    rTip.group.position.set(0, rTip.groundY, -(FLIPPER_DEPTH / 2) + 0.1);
    const rHinge = createRobot({ x: 0, z: 0 });
    rHinge.group.position.set(0, rHinge.groundY, (FLIPPER_DEPTH / 2) - 0.1);

    const fTip = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      contactDepthScale: 0.5, launchWindowEnd: 1.0, swingEase: 0, directionBlend: 0,
    });
    const fHinge = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      contactDepthScale: 0.5, launchWindowEnd: 1.0, swingEase: 0, directionBlend: 0,
    });

    fTip.fire(); fTip.update(0.05); fTip.applyLaunch(rTip);
    fHinge.fire(); fHinge.update(0.05); fHinge.applyLaunch(rHinge);

    expect(rTip.velocityY).toBeGreaterThan(rHinge.velocityY);
  });

  it('contactDepthScale of 0 gives uniform force across paddle', () => {
    const rTip = createRobot({ x: 0, z: 0 });
    rTip.group.position.set(0, rTip.groundY, -(FLIPPER_DEPTH / 2) + 0.1);
    const rHinge = createRobot({ x: 0, z: 0 });
    rHinge.group.position.set(0, rHinge.groundY, (FLIPPER_DEPTH / 2) - 0.1);

    const fTip = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      contactDepthScale: 0, launchWindowEnd: 1.0, swingEase: 0, directionBlend: 0,
    });
    const fHinge = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      contactDepthScale: 0, launchWindowEnd: 1.0, swingEase: 0, directionBlend: 0,
    });

    fTip.fire(); fTip.update(0.05); fTip.applyLaunch(rTip);
    fHinge.fire(); fHinge.update(0.05); fHinge.applyLaunch(rHinge);

    expect(rTip.velocityY).toBeCloseTo(rHinge.velocityY, 3);
  });
});

// ── Direction blend ───────────────────────────────────────────────
describe('createArenaFlipper — direction blend', () => {
  it('vertical-to-forward ratio increases with swing angle', () => {
    const rLow = createRobot({ x: 0, z: 0 });
    rLow.group.position.set(0, rLow.groundY, 0);
    const rHigh = createRobot({ x: 0, z: 0 });
    rHigh.group.position.set(0, rHigh.groundY, 0);

    const fLow = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 10, launchForward: 10,
      contactDepthScale: 0, launchWindowEnd: 1.0, swingEase: 0, directionBlend: 0.3,
      launchAssistMax: 0,
    });
    const fHigh = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 10, launchForward: 10,
      contactDepthScale: 0, launchWindowEnd: 1.0, swingEase: 0, directionBlend: 0.3,
      launchAssistMax: 0,
    });

    fLow.fire(); fLow.update(0.02); fLow.applyLaunch(rLow);   // low angle
    fHigh.fire(); fHigh.update(0.08); fHigh.applyLaunch(rHigh); // high angle

    const ratioLow = rLow.velocityY / Math.abs(rLow.velocity.z);
    const ratioHigh = rHigh.velocityY / Math.abs(rHigh.velocity.z);
    expect(ratioHigh).toBeGreaterThan(ratioLow);
  });

  it('directionBlend of 0 gives equal vertical and forward scaling', () => {
    const r = createRobot({ x: 0, z: 0 });
    r.group.position.set(0, r.groundY, 0);

    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 10, launchForward: 10,
      contactDepthScale: 0, launchWindowEnd: 1.0, swingEase: 0, directionBlend: 0,
      launchAssistMax: 0,
    });
    f.fire(); f.update(0.05); f.applyLaunch(r);

    // With directionBlend=0, upScale=1.0 and fwdScale=1.0
    // So velocityY = 10 * 0.5 * 1.0 = 5.0, velocity.z = -(10 * 0.5 * 1.0) = -5.0
    expect(r.velocityY).toBeCloseTo(5.0, 1);
    expect(r.velocity.z).toBeCloseTo(-5.0, 1);
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

// ── 3D contact detection (paddle surface height) ──────────────────
describe('createArenaFlipper — 3D contact detection', () => {
  it('contact tracks paddle surface height as angle increases', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, surfaceTolerance: 0.5,
    });
    const robot = createRobot({ x: 0, z: 0 });
    // Robot on the ground, paddle at rest — should be on paddle
    robot.group.position.set(0, robot.groundY, 0);
    expect(f.checkContact(robot).onPaddle).toBe(true);

    // Fire and advance significantly — paddle tip rises well above ground
    f.fire();
    tick(f, 0.08); // angle ≈ 0.8

    // Robot is still on the ground — paddle has swept through it, still counts
    // (negative gap = paddle surface above robot bottom)
    expect(f.checkContact(robot).onPaddle).toBe(true);
  });

  it('rejects robot that is high above the raised paddle surface', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, surfaceTolerance: 0.5,
    });
    const robot = createRobot({ x: 0, z: 0 });
    // Put robot well above paddle — beyond surfaceTolerance above surface
    robot.group.position.set(0, robot.groundY + 5, 0);
    f.fire();
    f.update(0.03);
    expect(f.checkContact(robot).onPaddle).toBe(false);
  });

  it('paddle surface height varies with local Z position (tip vs hinge)', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 100, activeAngle: 0.5, surfaceTolerance: 0.3,
    });
    f.fire();
    tick(f, 0.01); // reach peak quickly

    // Robot at paddle tip (local Z ≈ -FLIPPER_DEPTH/2) — surface is highest there
    const rTip = createRobot({ x: 0, z: 0 });
    rTip.group.position.set(0, rTip.groundY, -(FLIPPER_DEPTH / 2) + 0.1);

    // Robot at hinge (local Z ≈ +FLIPPER_DEPTH/2) — surface is near BASE_HEIGHT
    const rHinge = createRobot({ x: 0, z: 0 });
    rHinge.group.position.set(0, rHinge.groundY, (FLIPPER_DEPTH / 2) - 0.1);

    // At angle 0.5, the tip surface Y is significantly higher than the hinge.
    // Both should still be on paddle (paddle swept through from below).
    expect(f.checkContact(rTip).onPaddle).toBe(true);
    expect(f.checkContact(rHinge).onPaddle).toBe(true);
  });

  it('uses robot bottom (pos.y - groundY) not robot centre for height check', () => {
    const f = createArenaFlipper(0, 0, 0, { surfaceTolerance: 0.3 });
    const robot = createRobot({ x: 0, z: 0 });
    // At groundY, bottom = 0; paddle surface at rest ≈ BASE_HEIGHT = 0.3
    // gap = 0 - 0.3 = -0.3 → within tolerance (paddle above robot bottom)
    robot.group.position.set(0, robot.groundY, 0);
    expect(f.checkContact(robot).onPaddle).toBe(true);

    // Lift robot so its bottom is well above the paddle surface + tolerance
    robot.group.position.set(0, robot.groundY + BASE_HEIGHT + 1.0, 0);
    expect(f.checkContact(robot).onPaddle).toBe(false);
  });
});

// ── Divide-by-zero guard ──────────────────────────────────────────
describe('createArenaFlipper — config safety', () => {
  it('does not crash when activeAngle equals restAngle', () => {
    const f = createArenaFlipper(0, 0, 0, {
      activeAngle: 0, restAngle: 0,
    });
    expect(f.getState()).toBe(STATE_IDLE);
    f.fire();
    f.update(0.05);
    // Should not throw or produce NaN
    expect(Number.isFinite(f.getAngle())).toBe(true);
  });

  it('does not crash when activeAngle is less than restAngle', () => {
    const f = createArenaFlipper(0, 0, 0, {
      activeAngle: 0, restAngle: 0.5,
    });
    f.fire();
    f.update(0.05);
    expect(Number.isFinite(f.getAngle())).toBe(true);
  });

  it('clamps activeAngle above restAngle so progress never divides by zero', () => {
    const f = createArenaFlipper(0, 0, 0, {
      activeAngle: 1.0, restAngle: 1.0,
    });
    const cfg = f.getConfig();
    expect(cfg.activeAngle).toBeGreaterThan(cfg.restAngle);
  });
});

// ── Carry impulse (multi-frame launch) ────────────────────────────
describe('createArenaFlipper — carry impulse', () => {
  it('carry frame impulse is less than initial impulse for the same progress', () => {
    // Use two separate flippers with the same settings to compare
    const tuning = {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      carryFractionPerFrame: 0.35, swingEase: 0,
      contactDepthScale: 0, launchWindowEnd: 1.0, directionBlend: 0,
      launchAssistMax: 0,
    };

    // First impulse robot
    const f1 = createArenaFlipper(0, 0, 0, tuning);
    const r1 = createRobot({ x: 0, z: 0 });
    r1.group.position.set(0, r1.groundY, 0);
    f1.fire();
    f1.update(0.05); // progress = 0.5
    f1.applyLaunch(r1);
    const firstVy = r1.velocityY;

    // Carry impulse robot — hit once to mark as launched, reset velocity, hit again
    const f2 = createArenaFlipper(0, 0, 0, tuning);
    const r2 = createRobot({ x: 0, z: 0 });
    r2.group.position.set(0, r2.groundY, 0);
    f2.fire();
    f2.update(0.04);
    f2.applyLaunch(r2);      // first hit — marks robot
    const vyAfterFirst = r2.velocityY;
    r2.velocityY = 0;        // reset to isolate carry impulse
    f2.update(0.01);          // advance to progress ≈ 0.5
    f2.applyLaunch(r2);      // carry hit
    const carryVy = r2.velocityY;

    // Carry impulse should be a fraction of what a fresh first-hit would give
    expect(carryVy).toBeGreaterThan(0);
    expect(carryVy).toBeLessThan(firstVy);
  });

  it('carryFractionPerFrame of 0 gives no impulse on carry frames', () => {
    const f = createArenaFlipper(0, 0, 0, {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      carryFractionPerFrame: 0, swingEase: 0,
    });
    const robot = createRobot({ x: 0, z: 0 });
    robot.group.position.set(0, robot.groundY, 0);
    f.fire();
    f.update(0.05);
    f.applyLaunch(robot);
    const vyAfterFirst = robot.velocityY;
    f.update(0.02);
    f.applyLaunch(robot);
    // With carryFraction=0, no additional impulse on carry frames
    expect(robot.velocityY).toBe(vyAfterFirst);
  });

  it('carryFractionPerFrame of 1 gives full impulse on carry frames', () => {
    const tuning = {
      swingSpeed: 10, activeAngle: 1.0, launchUp: 12,
      carryFractionPerFrame: 1.0, swingEase: 0,
      contactDepthScale: 0, launchWindowEnd: 1.0, directionBlend: 0,
      launchAssistMax: 0,
    };
    const f = createArenaFlipper(0, 0, 0, tuning);
    const robot = createRobot({ x: 0, z: 0 });
    robot.group.position.set(0, robot.groundY, 0);
    f.fire();
    f.update(0.05);
    f.applyLaunch(robot);
    const vyFirst = robot.velocityY;
    robot.velocityY = 0;
    // Don't advance flipper — same progress, carry fraction = 1.0 → same impulse
    f.applyLaunch(robot);
    expect(robot.velocityY).toBeCloseTo(vyFirst, 3);
  });

  it('new tuning values surfaceTolerance and carryFractionPerFrame are in getConfig', () => {
    const f = createArenaFlipper(0, 0, 0, { surfaceTolerance: 0.8, carryFractionPerFrame: 0.5 });
    const cfg = f.getConfig();
    expect(cfg.surfaceTolerance).toBe(0.8);
    expect(cfg.carryFractionPerFrame).toBe(0.5);
  });
});
