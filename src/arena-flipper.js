import * as THREE from 'three';

// ── Flipper dimensions ─────────────────────────────────────────────
export const FLIPPER_WIDTH = 4;
export const FLIPPER_DEPTH = 3;
const FLIPPER_THICKNESS = 0.15;
export const BASE_HEIGHT = 0.3;
const BASE_COLOR = 0x333333;
const PADDLE_COLOR = 0xcc4400;

// ── Physics floors ───────────────────────────────────────────────
/** Prevents the swing from becoming infinitely slow at high ease values. */
const MIN_SWING_EASE_FACTOR = 0.1;
/** Ensures the paddle always converges to rest even at tiny remaining angles. */
const MIN_RESET_SPEED_FACTOR = 0.25;

// ── Default tuning ────────────────────────────────────────────────
const DEFAULTS = {
  restAngle: 0,                    // radians — paddle resting position
  activeAngle: Math.PI / 3,       // radians — maximum firing angle (~60°)
  swingSpeed: 14,                  // radians/s — how fast the paddle fires upward
  resetSpeed: 4,                   // radians/s — how fast the paddle returns to rest
  cooldown: 5.5,                   // seconds — wait after reset before next fire
  launchUp: 40,                    // vertical impulse applied to robots on contact
  launchForward: 12,                // forward impulse (away from hinge)
  launchAssistMax: 0.3,            // max lateral assist factor
  swingEase: 0.5,                  // ease-out factor for swing (0 = linear, higher = more front-loaded)
  launchWindowEnd: 0.85,           // swing progress above this → launch force tapers off
  contactDepthScale: 0.3,          // how much paddle Z-position affects launch quality (0–1)
  resetEaseZone: 0.15,             // angle (radians) near rest where reset speed eases in
  directionBlend: 0.3,             // how much swing angle shifts vertical/forward ratio (0–1)
  surfaceTolerance: 0.1,           // how close (Y) a robot must be to the paddle surface to count as contact
  carryFractionPerFrame: 0.35,     // fraction of full impulse applied per subsequent carry frame (0–1)
};

// ── State constants ───────────────────────────────────────────────
export const STATE_IDLE = 'idle';
export const STATE_FIRING = 'firing';
export const STATE_RESETTING = 'resetting';
export const STATE_COOLDOWN = 'cooldown';

/**
 * Creates an arena flipper hazard — a motor-driven paddle that rotates from
 * a resting angle to a firing angle, launching any robot positioned over it.
 *
 * @param {number} x          — world X position of the flipper base centre
 * @param {number} z          — world Z position of the flipper base centre
 * @param {number} [facingAngle=0] — Y rotation in radians (0 = paddle extends toward -Z)
 * @param {object} [tuning]   — override any DEFAULTS key
 * @returns {object} arena flipper instance
 */
export function createArenaFlipper(x, z, facingAngle = 0, tuning = {}) {
  const cfg = { ...DEFAULTS, ...tuning };

  // Guard: if activeAngle === restAngle the flipper has zero travel and cannot fire.
  // Clamp to a tiny positive range so progress calculations never divide by zero.
  if (cfg.activeAngle <= cfg.restAngle) {
    cfg.activeAngle = cfg.restAngle + 1e-6;
  }

  const angleRange = cfg.activeAngle - cfg.restAngle;

  // ── Three.js group ────────────────────────────────────────────
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = facingAngle;

  // Base plate (static, sits on the floor)
  const baseGeo = new THREE.BoxGeometry(FLIPPER_WIDTH, BASE_HEIGHT, FLIPPER_DEPTH);
  const baseMat = new THREE.MeshStandardMaterial({ color: BASE_COLOR });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = BASE_HEIGHT / 2;
  base.receiveShadow = true;
  group.add(base);

  // Paddle — geometry is translated so the pivot (rotation origin) sits at
  // the back edge (hinge), matching how real arena flippers work.
  const paddleGeo = new THREE.BoxGeometry(FLIPPER_WIDTH, FLIPPER_THICKNESS, FLIPPER_DEPTH);
  paddleGeo.translate(0, 0, -FLIPPER_DEPTH / 2); // pivot at z=0 local, paddle extends -Z
  const paddleMat = new THREE.MeshStandardMaterial({ color: PADDLE_COLOR });
  const paddle = new THREE.Mesh(paddleGeo, paddleMat);
  paddle.position.set(0, BASE_HEIGHT, FLIPPER_DEPTH / 2); // hinge at back edge of base
  paddle.castShadow = true;
  group.add(paddle);

  // ── State machine ─────────────────────────────────────────────
  let state = STATE_IDLE;
  let angle = cfg.restAngle;
  let cooldownTimer = 0;

  // Track which robots have already been launched during the current swing
  // so we don't apply impulse more than once per fire.
  let launchedRobotsThisSwing = new Set();

  function getState() { return state; }
  function getAngle() { return angle; }
  function getCooldownTimer() { return cooldownTimer; }
  function getConfig() { return { ...cfg }; }

  /**
   * Trigger the flipper to fire. Only works from idle state.
   * @returns {boolean} true if firing was initiated
   */
  function fire() {
    if (state !== STATE_IDLE) return false;
    state = STATE_FIRING;
    launchedRobotsThisSwing = new Set();
    return true;
  }

  /**
   * Advance the flipper state machine by dt seconds.
   * @param {number} dt — delta time in seconds
   */
  function update(dt) {
    switch (state) {
      case STATE_FIRING: {
        const progress = (angle - cfg.restAngle) / angleRange;
        const easeFactor = Math.max(MIN_SWING_EASE_FACTOR, 1 - progress * cfg.swingEase);
        angle += cfg.swingSpeed * easeFactor * dt;
        if (angle >= cfg.activeAngle) {
          angle = cfg.activeAngle;
          state = STATE_RESETTING;
        }
        break;
      }

      case STATE_RESETTING: {
        const remaining = angle - cfg.restAngle;
        let speed = cfg.resetSpeed;
        if (cfg.resetEaseZone > 0 && remaining < cfg.resetEaseZone) {
          speed = cfg.resetSpeed * Math.max(MIN_RESET_SPEED_FACTOR, remaining / cfg.resetEaseZone);
        }
        angle -= speed * dt;
        if (angle <= cfg.restAngle) {
          angle = cfg.restAngle;
          state = STATE_COOLDOWN;
          cooldownTimer = cfg.cooldown;
        }
        break;
      }

      case STATE_COOLDOWN:
        cooldownTimer -= dt;
        if (cooldownTimer <= 0) {
          cooldownTimer = 0;
          state = STATE_IDLE;
        }
        break;

      default: // STATE_IDLE — nothing to do
        break;
    }

    // Update paddle visual rotation (rotates around local X axis)
    paddle.rotation.x = -angle;
  }

  /**
   * Tests whether a robot is in contact with the flipper paddle, accounting
   * for the paddle's current rotation angle.
   *
   * The paddle rotates around its hinge (back edge of the base).  At a given
   * angle, the surface height at a local-Z position is:
   *
   *     surfaceY = BASE_HEIGHT + distFromHinge × sin(angle)
   *
   * where distFromHinge is measured from the hinge toward the paddle tip.
   *
   * A robot counts as "on the paddle" when:
   *   1. Its centre is within the paddle's X and Z footprint.
   *   2. The bottom of the robot is within `surfaceTolerance` of the paddle surface Y.
   *
   * @param {object} robot — needs `group.position`, `groundY`
   * @returns {{ onPaddle: boolean, localX: number, localZ: number }}
   */
  function checkContact(robot) {
    const rx = robot.group.position.x;
    const rz = robot.group.position.z;

    // Transform robot position into flipper-local coordinates
    const dx = rx - x;
    const dz = rz - z;
    const cosA = Math.cos(-facingAngle);
    const sinA = Math.sin(-facingAngle);
    const localX = dx * cosA - dz * sinA;
    const localZ = dx * sinA + dz * cosA;

    // Paddle occupies: X ∈ [-FLIPPER_WIDTH/2, FLIPPER_WIDTH/2]
    //                  Z ∈ [-FLIPPER_DEPTH/2, FLIPPER_DEPTH/2]
    const halfW = FLIPPER_WIDTH / 2;
    const halfD = FLIPPER_DEPTH / 2;

    if (Math.abs(localX) > halfW) return { onPaddle: false, localX, localZ };
    if (Math.abs(localZ) > halfD) return { onPaddle: false, localX, localZ };

    // ── Paddle surface height at this local-Z position ──────────
    // The hinge sits at local Z = +FLIPPER_DEPTH/2 (back edge of base).
    // distFromHinge grows toward the tip (local Z = -FLIPPER_DEPTH/2).
    const distFromHinge = halfD - localZ;                    // 0 at hinge, FLIPPER_DEPTH at tip
    const surfaceY = BASE_HEIGHT + distFromHinge * Math.sin(angle);

    // Robot bottom Y: groundY is the resting Y of group.position when on the
    // floor (wheelRadius + bodyHeight/2), so robotBottom = pos.y - groundY
    // gives the wheel contact patch height.
    const robotBottomY = robot.group.position.y - robot.groundY;

    const gap = robotBottomY - surfaceY;

    // Contact means the robot bottom is near the paddle surface.
    //   gap > 0  → robot is above the surface (already launched / not touching)
    //   gap < 0  → paddle surface is above the robot bottom (paddle sweeping
    //              through the robot, which counts as the paddle lifting it)
    //   gap ≈ 0  → robot is resting right on the surface
    //
    // We allow any negative gap (paddle sweeping through the robot from below
    // always counts — the paddle is physically pushing through the robot) and
    // a configurable positive tolerance (robot sitting on top / just above).
    if (gap > cfg.surfaceTolerance) {
      return { onPaddle: false, localX, localZ };
    }

    return { onPaddle: true, localX, localZ };
  }

  /**
   * During the firing window, apply a launch impulse to any robot sitting on the paddle.
   *
   * The first contact in a swing applies the full impulse.  Subsequent frames
   * while the robot is still on the moving paddle apply a reduced "carry"
   * impulse (scaled by `carryFractionPerFrame`) so the robot rides the paddle
   * rather than getting a single pop.
   *
   * @param {object} robot — needs `group.position`, `velocity`, `velocityY`, `groundY`
   * @returns {boolean} true if a launch impulse was applied this call
   */
  function applyLaunch(robot) {
    if (state !== STATE_FIRING) return false;
    if (angle <= cfg.restAngle) return false;

    const contact = checkContact(robot);
    if (!contact.onPaddle) return false;

    // Determine if this is the initial hit or a carry frame
    const isCarry = launchedRobotsThisSwing.has(robot);
    const impulseFraction = isCarry ? cfg.carryFractionPerFrame : 1.0;

    // Normalised swing progress [0, 1]
    const progress = (angle - cfg.restAngle) / angleRange;

    // Launch window: full effectiveness during main swing, tapers near end
    let effectiveness = 1.0;
    if (cfg.launchWindowEnd < 1.0 && progress > cfg.launchWindowEnd) {
      effectiveness = Math.max(0, 1.0 - (progress - cfg.launchWindowEnd) / (1.0 - cfg.launchWindowEnd));
    }

    // Contact depth: tip of paddle (further from hinge) provides better leverage
    let depthQuality = 1.0;
    if (cfg.contactDepthScale > 0) {
      const distFromHinge = (FLIPPER_DEPTH / 2) - contact.localZ;
      const leverRatio = Math.max(0, Math.min(1, distFromHinge / FLIPPER_DEPTH));
      depthQuality = (1.0 - cfg.contactDepthScale) + cfg.contactDepthScale * leverRatio;
    }

    const force = progress * effectiveness * depthQuality * impulseFraction;

    // Direction blend: more vertical at higher angles, more forward at lower angles
    const upScale = 1.0 - cfg.directionBlend * (1 - progress);
    const fwdScale = 1.0 + cfg.directionBlend * (1 - progress);

    // Vertical impulse — scales with force, direction blend, and tuning
    robot.velocityY += cfg.launchUp * force * upScale;

    // Forward impulse — pushes the robot away from the hinge in world space.
    // The flipper's forward direction in world space is (-sin(facingAngle), -cos(facingAngle)).
    const fwdX = -Math.sin(facingAngle);
    const fwdZ = -Math.cos(facingAngle);
    robot.velocity.x += fwdX * cfg.launchForward * force * fwdScale;
    robot.velocity.z += fwdZ * cfg.launchForward * force * fwdScale;

    // Lateral assist — based on how far off-centre the robot is on the paddle
    const normalizedOffset = contact.localX / (FLIPPER_WIDTH / 2);
    const lateralAssist = normalizedOffset * cfg.launchAssistMax * cfg.launchUp * force;
    // Lateral direction in world space (perpendicular to forward)
    const latX = Math.cos(facingAngle);
    const latZ = -Math.sin(facingAngle);
    robot.velocity.x += latX * lateralAssist;
    robot.velocity.z += latZ * lateralAssist;

    launchedRobotsThisSwing.add(robot);
    return true;
  }

  /**
   * Reset the flipper to its initial idle state.
   */
  function reset() {
    state = STATE_IDLE;
    angle = cfg.restAngle;
    cooldownTimer = 0;
    launchedRobotsThisSwing = new Set();
    paddle.rotation.x = -cfg.restAngle;
  }

  return {
    group,
    base,
    paddle,
    fire,
    update,
    checkContact,
    applyLaunch,
    reset,
    getState,
    getAngle,
    getCooldownTimer,
    getConfig,
  };
}

/**
 * Creates the standard set of arena flippers for a given arena size.
 * Places one flipper near the south-west quadrant, facing north.
 * Flippers auto-fire whenever they return to idle.
 *
 * @param {number} arenaSize — full width/depth of the arena
 * @returns {{ flippers: object[], update: Function, reset: Function, fire: Function }}
 */
export function createArenaFlippers(arenaSize) {
  const half = arenaSize / 2;

  // Single flipper in the south-west quadrant pointing north (-Z)
  const flippers = [
    createArenaFlipper(-half * 0.35, half * 0.35, 0),
  ];

  function update(dt) {
    for (const f of flippers) {
      f.update(dt);
      // Auto-fire: arena flippers continuously cycle (fire → reset → cooldown → fire)
      // to act as a persistent environmental hazard, not a player-triggered one.
      if (f.getState() === STATE_IDLE) f.fire();
    }
  }

  function reset() {
    for (const f of flippers) f.reset();
  }

  /** Fire all idle flippers. */
  function fire() {
    for (const f of flippers) f.fire();
  }

  return { flippers, update, reset, fire };
}
