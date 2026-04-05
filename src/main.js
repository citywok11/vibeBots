import * as THREE from 'three';
import { createArena } from './arena.js';
import { createCar, CAR_BODY_WIDTH, CAR_BODY_DEPTH } from './car.js';
import { createRobot, ROBOT_BODY_WIDTH, ROBOT_BODY_DEPTH } from './robot.js';
import {
  computeWheelWorldXZ,
  computePitGroundingFromWheels,
  createPitWheelHysteresis,
} from './pit-support.js';
import { createInputManager } from './input.js';
import { createMenu } from './menu.js';
import { createRoguelikeMenu } from './roguelike-menu.js';
import { createKeyBindingsScreen } from './keybindings-screen.js';
import { createHomeScreen } from './home-screen.js';
import { createOptionsScreen } from './options-screen.js';
import { createExitScreen } from './exit-screen.js';
import { createGameController } from './game.js';
import { createCustomiseScreen } from './customise-screen.js';
import { resolveCollision } from './collision.js';
import { applyFlipperImpulse } from './flipper-physics.js';
import { createPit, DEFAULT_PIT_SIZE, PIT_DEPTH } from './pit.js';
import { createPitButton } from './pit-button.js';
import { createPitAlarm } from './pit-alarm.js';
import { createFireHazards } from './fire-hazard.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.domElement.style.display = 'none';
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Arena
const ARENA_SIZE = 70;
const arena = createArena(ARENA_SIZE, { pitCutout: DEFAULT_PIT_SIZE });
scene.add(arena.group);

// Pit (centred in arena)
const pit = createPit(ARENA_SIZE);
scene.add(pit.group);

// Pit button (on the east arena wall)
const pitButton = createPitButton(ARENA_SIZE);
scene.add(pitButton.group);

// Pit alarm
const pitAlarm = createPitAlarm();

// Fire hazards — flat grates on the floor that periodically emit fire
const fireHazards = createFireHazards(ARENA_SIZE);
fireHazards.hazards.forEach(h => scene.add(h.group));

// Wire button → pit + alarm
pitButton.onActivate(() => {
  pit.activate();
  pitAlarm.start();
});

// Car
const car = createCar();
scene.add(car.group);

// Dummy robot opponent
const robot = createRobot({ x: 10, z: -10 });
scene.add(robot.group);

// Input handling
const input = createInputManager();
window.addEventListener('keydown', (e) => input.handleKeyDown(e.code));
window.addEventListener('keyup', (e) => input.handleKeyUp(e.code));

// Menu & Key Bindings
const homeScreen = createHomeScreen(document.body);
const optionsScreen = createOptionsScreen(document.body);
const exitScreen = createExitScreen(document.body);
const menu = createMenu(document.body);
const roguelikeMenu = createRoguelikeMenu(document.body);
const customiseScreen = createCustomiseScreen(document.body);
const keyBindingsScreen = createKeyBindingsScreen(document.body, input);

// Game loop
const ACCEL = 24;
const TURN_SPEED = 3.6;
let lastTime = performance.now();
let rafId = null;
let flipImpulseApplied = false;
let carTrapped = false;
let robotTrapped = false;

// Pit / edge — straddle fall: hysteresis (pit-support) delays pit contact; these tune slide speed vs rim.
const PIT_TIP_GRAVITY = 10;
const PIT_TIP_MAX_DOWN_SPEED = 18;
const PIT_TIP_RECOVER_SPEED = 28;
/** fallAccum at this value (m) → rim-allowed height reaches pit surface (full slide range) */
const PIT_STRADDLE_FALL_RANGE = 1.05;
/** Seconds to chase moving pit deck / arena height (critical-damping-style follow). */
const RL_SURFACE_FOLLOW_TAU = 0.042;

/** While straddling, arena rim still supports the car — do not sink Y through y=0 floor; slide toward pit instead. */
const PIT_REDIRECT_SUPPORT_EPS = 1e-4;
/** Horizontal pull (m) per (m/s pit fall speed × s) while redirecting. */
const PIT_REDIRECT_PULL_PER_FALL = 0.62;
/** Extra nose-down pitch (rad) per m of dragAccum while redirecting (dragAccum grows during slide). */
const PIT_REDIRECT_PITCH_PER_DRAG_M = 0.34;
/** Absolute cap on total pitch (rad) including redirect (pit-support caps ~0.42 base lean). */
const PIT_REDIRECT_TOTAL_PITCH_CAP = 0.55;
function pitTipStrength(spread) {
  const lo = 0.002;
  const hi = 0.055;
  if (spread <= lo) return 0;
  const t = (spread - lo) / (hi - lo);
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

const pitTipFall = {
  car: { velocity: 0, fallAccum: 0, dragAccum: 0, followY: null },
  robot: { velocity: 0, fallAccum: 0, dragAccum: 0, followY: null },
};

const carPitWheelHyst = createPitWheelHysteresis();
const robotPitWheelHyst = createPitWheelHysteresis();

function gameLoop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (menu.isOpen() || customiseScreen.isOpen() || roguelikeMenu.isOpen()) {
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(gameLoop);
    return;
  }

  // Pit button hit detection (car and robot can press it)
  pitButton.checkHit(car.group.position.x, car.group.position.z, car.collisionRadius);
  pitButton.checkHit(robot.group.position.x, robot.group.position.z, robot.collisionRadius);

  // Update pit lowering animation; stop alarm when pit is fully open
  pit.update(dt);
  if (!pit.isLowering() && pitAlarm.isPlaying()) {
    pitAlarm.stop();
  }

  // Update fire hazards
  fireHazards.update(dt);

  if (input.isPressed('forward')) car.accelerate(ACCEL * dt);
  if (input.isPressed('backward')) car.accelerate(-ACCEL * dt);
  if (input.isPressed('turnLeft')) car.turnLeft(TURN_SPEED * dt);
  if (input.isPressed('turnRight')) car.turnRight(TURN_SPEED * dt);
  if (input.wasJustPressed('flipper')) {
    car.activateFlipper();
    flipImpulseApplied = false;
  }
  if (input.isPressed('flamethrower')) {
    car.activateFlamethrower();
  } else {
    car.deactivateFlamethrower();
  }

  car.update(dt);
  car.bounceOffWalls(ARENA_SIZE);

  robot.update(dt);
  robot.bounceOffWalls(ARENA_SIZE);

  // Pit Y + lean: per-wheel support heights; pitch/roll when straddling the pit edge
  [
    {
      entity: car,
      trapped: carTrapped,
      setTrapped: v => { carTrapped = v; },
      width: CAR_BODY_WIDTH,
      depth: CAR_BODY_DEPTH,
      wheelHyst: carPitWheelHyst,
    },
    {
      entity: robot,
      trapped: robotTrapped,
      setTrapped: v => { robotTrapped = v; },
      width: ROBOT_BODY_WIDTH,
      depth: ROBOT_BODY_DEPTH,
      wheelHyst: robotPitWheelHyst,
    },
  ].forEach(({ entity, trapped, setTrapped, width, depth, wheelHyst }) => {
    const cx = entity.group.position.x;
    const cz = entity.group.position.z;
    const yaw = entity.group.rotation.y;
    const tipKey = entity === car ? 'car' : 'robot';
    const tip = pitTipFall[tipKey];

    if (trapped) {
      tip.velocity = 0;
      tip.fallAccum = 0;
      tip.dragAccum = 0;
      tip.followY = null;
      entity.group.position.y = entity.groundY - PIT_DEPTH;
      entity.applyFrameRotation(0, 0);
      if (entity.velocityY !== undefined) entity.velocityY = 0;
    } else if (pit.containsPoint(cx, cz) && pit.isOpen()) {
      tip.velocity = 0;
      tip.fallAccum = 0;
      tip.dragAccum = 0;
      tip.followY = null;
      setTrapped(true);
      entity.group.position.y = entity.groundY - PIT_DEPTH;
      entity.applyFrameRotation(0, 0);
      if (entity.velocityY !== undefined) entity.velocityY = 0;
    } else {
      const wheels = computeWheelWorldXZ(cx, cz, yaw, width, depth, entity.wheelThicknessHalf);
      const { supportYOffset, pitch, roll, tippingSpread } = computePitGroundingFromWheels(
        wheels, pit, width, depth, entity.wheelThicknessHalf,
        { hysteresis: wheelHyst },
      );
      const refY = entity.groundY + supportYOffset;
      const pitSurfaceY = entity.groundY + pit.getCoverY();

      const ts = pitTipStrength(tippingSpread);
      if (ts > 0.001) {
        tip.velocity += PIT_TIP_GRAVITY * dt * ts;
        tip.velocity = Math.min(tip.velocity, PIT_TIP_MAX_DOWN_SPEED);
      } else {
        tip.velocity = 0;
        tip.fallAccum = Math.max(0, tip.fallAccum - PIT_TIP_RECOVER_SPEED * dt);
        tip.dragAccum = Math.max(0, tip.dragAccum - PIT_TIP_RECOVER_SPEED * dt);
      }

      const inc = ts > 0.001 ? tip.velocity * dt : 0;
      if (inc > 0) {
        tip.dragAccum += inc;
      }

      const straddleProgress = Math.min(1, tip.dragAccum / PIT_STRADDLE_FALL_RANGE);
      let yLowerBound = pitSurfaceY;
      if (supportYOffset >= -1e-5) {
        yLowerBound = Math.max(
          pitSurfaceY,
          entity.groundY + (pitSurfaceY - entity.groundY) * straddleProgress,
        );
      }

      const rimStillAtArena = supportYOffset >= -PIT_REDIRECT_SUPPORT_EPS;
      const rawFallY = refY - tip.fallAccum;
      const projectedRawFallY = refY - (tip.fallAccum + inc);
      const projectedTargetY = Math.max(projectedRawFallY, yLowerBound);
      const fallBinding = rawFallY >= yLowerBound - 1e-5;
      const projectedFallBinding = projectedRawFallY >= yLowerBound - 1e-5;

      const wouldSinkIfFallAccumIncrements =
        ts > 0.001
        && rimStillAtArena
        && projectedFallBinding
        && projectedTargetY < entity.groundY - PIT_REDIRECT_SUPPORT_EPS;

      if (inc > 0 && !wouldSinkIfFallAccumIncrements) {
        tip.fallAccum += inc;
      }

      const targetY = Math.max(refY - tip.fallAccum, yLowerBound);
      const wouldSinkThroughFloor =
        ts > 0.001
        && rimStillAtArena
        && fallBinding
        && targetY < entity.groundY - PIT_REDIRECT_SUPPORT_EPS;

      let appliedY = targetY;
      let appliedPitch = pitch;
      if (wouldSinkThroughFloor) {
        appliedY = entity.groundY;
        const pitchSign = Math.abs(pitch) > 0.02 ? Math.sign(pitch) : 1;
        const extraPitch = Math.min(
          PIT_REDIRECT_TOTAL_PITCH_CAP - Math.abs(pitch),
          tip.dragAccum * PIT_REDIRECT_PITCH_PER_DRAG_M,
        );
        appliedPitch = pitch + pitchSign * Math.max(0, extraPitch);
        appliedPitch = Math.max(
          -PIT_REDIRECT_TOTAL_PITCH_CAP,
          Math.min(PIT_REDIRECT_TOTAL_PITCH_CAP, appliedPitch),
        );

        const pull = tip.velocity * dt * PIT_REDIRECT_PULL_PER_FALL * (0.35 + 0.65 * ts);
        if (pull > 0) {
          const len = Math.hypot(cx, cz);
          if (len > 0.25) {
            entity.group.position.x += (-cx / len) * pull;
            entity.group.position.z += (-cz / len) * pull;
          } else {
            const fx = -Math.sin(yaw);
            const fz = -Math.cos(yaw);
            entity.group.position.x += fx * pull;
            entity.group.position.z += fz * pull;
          }
        }
      }

      if (ts > 0.001) {
        tip.followY = appliedY;
        entity.group.position.y = appliedY;
        if (entity.velocityY !== undefined) entity.velocityY = wouldSinkThroughFloor ? 0 : -tip.velocity;
      } else {
        if (tip.followY === null) tip.followY = appliedY;
        const alpha = 1 - Math.exp(-dt / RL_SURFACE_FOLLOW_TAU);
        tip.followY += (appliedY - tip.followY) * alpha;
        entity.group.position.y = tip.followY;
        if (entity.velocityY !== undefined) entity.velocityY = 0;
      }
      entity.applyFrameRotation(appliedPitch, roll);
    }
  });

  // Pit wall collision: trapped entities stay inside
  if (carTrapped) pit.constrainEntity(car, true);
  if (robotTrapped) pit.constrainEntity(robot, true);

  // Apply flipper impulse once per flip activation when robot is in range
  if (car.flipperActive && !flipImpulseApplied) {
    if (applyFlipperImpulse(car, robot)) {
      flipImpulseApplied = true;
    }
  }

  // Resolve collision between player car and dummy robot
  {
    const collisionResult = resolveCollision(
      {
        position: car.group.position, velocity: car.velocity, mass: car.mass,
        collisionRadius: car.collisionRadius, rotation: car.rotation,
        bodyWidth: 2, bodyDepth: 3,
      },
      {
        position: robot.group.position, velocity: robot.velocity, mass: robot.mass,
        collisionRadius: robot.collisionRadius, rotation: robot.group.rotation.y,
        bodyWidth: 2, bodyDepth: 3,
      }
    );

    if (collisionResult) {
      const { angularImpulseA, angularImpulseB, impactNormal, impactSpeed } = collisionResult;

      // Apply yaw spin to both vehicles
      car.applyAngularImpulse(angularImpulseA);
      robot.applyAngularImpulse(angularImpulseB);

      // Apply pitch/roll tilt based on impact direction and speed
      car.applyImpactTilt(-impactNormal.x, -impactNormal.z, impactSpeed);
      robot.applyImpactTilt(impactNormal.x, impactNormal.z, impactSpeed);

      // Existing lateral friction on the robot
      robot.applyCollisionFriction(impactNormal.x, impactNormal.z);
    }
  }

  // Camera follows car
  const carPos = car.group.position;
  camera.position.set(carPos.x, 30, carPos.z + 25);
  camera.lookAt(carPos.x, 0, carPos.z);

  renderer.render(scene, camera);
  rafId = requestAnimationFrame(gameLoop);
}

function startLoop() {
  car.reset();
  robot.reset();
  pit.reset();
  pitButton.reset();
  carTrapped = false;
  robotTrapped = false;
  pitTipFall.car.velocity = 0;
  pitTipFall.car.fallAccum = 0;
  pitTipFall.car.dragAccum = 0;
  pitTipFall.car.followY = null;
  pitTipFall.robot.velocity = 0;
  pitTipFall.robot.fallAccum = 0;
  pitTipFall.robot.dragAccum = 0;
  pitTipFall.robot.followY = null;
  carPitWheelHyst.reset();
  robotPitWheelHyst.reset();
  fireHazards.reset();
  renderer.domElement.style.display = 'block';
  lastTime = performance.now();
  if (!rafId) rafId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  renderer.domElement.style.display = 'none';
}

const game = createGameController({ homeScreen, menu, onStart: startLoop, onStop: stopLoop });

// Roguelike mode state
let roguelikeRunning = false;

// Show home screen on startup
homeScreen.open();

// Screen navigation callbacks
let keyBindingsReturnTo = null;

homeScreen.onOptions(() => {
  homeScreen.close();
  optionsScreen.open();
});

homeScreen.onExit(() => {
  homeScreen.close();
  exitScreen.open();
});

homeScreen.onRogueLike(() => {
  homeScreen.close();
  roguelikeRunning = true;
  startLoop();
});

// Exit screen callbacks
exitScreen.onSandboxMode(() => {
  exitScreen.close();
  game.startGame();
});

exitScreen.onOptions(() => {
  exitScreen.close();
  keyBindingsReturnTo = () => exitScreen.open();
  optionsScreen.open();
});

exitScreen.onExitGame(() => {
  window.close();
});

keyBindingsScreen.onClose(() => {
  if (keyBindingsReturnTo) keyBindingsReturnTo();
});

optionsScreen.onKeyBindings(() => {
  optionsScreen.close();
  keyBindingsReturnTo = () => optionsScreen.open();
  keyBindingsScreen.open();
});

optionsScreen.onBack(() => {
  homeScreen.open();
});

window.addEventListener('keydown', (e) => {
  if (keyBindingsScreen.isOpen()) {
    keyBindingsScreen.handleKeyPress(e.code);
    return;
  }
  if (e.code === 'Escape') {
    if (game.isRunning()) {
      game.handleEscape();
    } else if (roguelikeRunning) {
      roguelikeMenu.toggle();
    }
  }
});

menu.onCustomise(() => {
  menu.close();
  customiseScreen.open();
});

// onClose fires when Back is clicked; apply selections to the car, close the screen then return to the pause menu
customiseScreen.onClose(() => {
  car.applyCustomisation(customiseScreen.getSelections());
  customiseScreen.close();
  menu.open();
});

menu.onOptions(() => {
  menu.close();
  keyBindingsReturnTo = () => menu.open();
  optionsScreen.open();
});

roguelikeMenu.onBackToMainMenu(() => {
  roguelikeRunning = false;
  roguelikeMenu.close();
  stopLoop();
  homeScreen.open();
});

roguelikeMenu.onOptions(() => {
  roguelikeMenu.close();
  keyBindingsReturnTo = () => roguelikeMenu.open();
  optionsScreen.open();
});

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
