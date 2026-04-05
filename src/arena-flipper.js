import * as THREE from 'three';

// ── Flipper dimensions ─────────────────────────────────────────────
export const FLIPPER_WIDTH = 4;
export const FLIPPER_DEPTH = 3;
const FLIPPER_THICKNESS = 0.15;
const BASE_HEIGHT = 0.3;
const BASE_COLOR = 0x333333;
const PADDLE_COLOR = 0xcc4400;

// ── Default tuning ────────────────────────────────────────────────
const DEFAULTS = {
  restAngle: 0,                    // radians — paddle resting position
  activeAngle: Math.PI / 3,       // radians — maximum firing angle (~60°)
  swingSpeed: 14,                  // radians/s — how fast the paddle fires upward
  resetSpeed: 4,                   // radians/s — how fast the paddle returns to rest
  cooldown: 2.5,                   // seconds — wait after reset before next fire
  launchUp: 12,                    // vertical impulse applied to robots on contact
  launchForward: 6,                // forward impulse (away from hinge)
  launchAssistMax: 0.3,            // max lateral assist factor
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
  let launchedSet = new Set();

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
    launchedSet = new Set();
    return true;
  }

  /**
   * Advance the flipper state machine by dt seconds.
   * @param {number} dt — delta time in seconds
   */
  function update(dt) {
    switch (state) {
      case STATE_FIRING:
        angle += cfg.swingSpeed * dt;
        if (angle >= cfg.activeAngle) {
          angle = cfg.activeAngle;
          state = STATE_RESETTING;
        }
        break;

      case STATE_RESETTING:
        angle -= cfg.resetSpeed * dt;
        if (angle <= cfg.restAngle) {
          angle = cfg.restAngle;
          state = STATE_COOLDOWN;
          cooldownTimer = cfg.cooldown;
        }
        break;

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
   * Tests whether a robot's centre is over the flipper paddle in world space.
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

    // Only affect grounded robots
    if (robot.group.position.y > robot.groundY + 0.2) {
      return { onPaddle: false, localX, localZ };
    }

    return { onPaddle: true, localX, localZ };
  }

  /**
   * During the firing window, apply a launch impulse to any robot sitting on the paddle.
   * Each robot is only launched once per swing (tracked via launchedSet).
   *
   * @param {object} robot — needs `group.position`, `velocity`, `velocityY`, `groundY`
   * @returns {boolean} true if a launch impulse was applied this call
   */
  function applyLaunch(robot) {
    if (state !== STATE_FIRING) return false;
    if (angle <= cfg.restAngle) return false;

    // Deduplicate: one impulse per robot per swing
    if (launchedSet.has(robot)) return false;

    const contact = checkContact(robot);
    if (!contact.onPaddle) return false;

    // Normalised swing progress [0, 1]
    const progress = (angle - cfg.restAngle) / (cfg.activeAngle - cfg.restAngle);

    // Vertical impulse — scales with swing progress and tuning
    robot.velocityY += cfg.launchUp * progress;

    // Forward impulse — pushes the robot away from the hinge in world space.
    // The flipper's forward direction in world space is (-sin(facingAngle), -cos(facingAngle)).
    const fwdX = -Math.sin(facingAngle);
    const fwdZ = -Math.cos(facingAngle);
    robot.velocity.x += fwdX * cfg.launchForward * progress;
    robot.velocity.z += fwdZ * cfg.launchForward * progress;

    // Lateral assist — based on how far off-centre the robot is on the paddle
    const normalizedOffset = contact.localX / (FLIPPER_WIDTH / 2);
    const lateralAssist = normalizedOffset * cfg.launchAssistMax * cfg.launchUp * progress;
    // Lateral direction in world space (perpendicular to forward)
    const latX = Math.cos(facingAngle);
    const latZ = -Math.sin(facingAngle);
    robot.velocity.x += latX * lateralAssist;
    robot.velocity.z += latZ * lateralAssist;

    launchedSet.add(robot);
    return true;
  }

  /**
   * Reset the flipper to its initial idle state.
   */
  function reset() {
    state = STATE_IDLE;
    angle = cfg.restAngle;
    cooldownTimer = 0;
    launchedSet = new Set();
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
      // Auto-fire: arena flippers trigger as soon as they become idle
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
