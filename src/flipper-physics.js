import { CAR_BODY_DEPTH, CAR_BODY_WIDTH, FLIPPER_BODY_DEPTH, FLIPPER_MAX_ANGLE } from './car.js';
import { ROBOT_BODY_WIDTH, ROBOT_BODY_DEPTH } from './robot.js';

const FLIPPER_HALF_WIDTH = CAR_BODY_WIDTH / 2;   // half of flipper width (= car body width)
const ROBOT_HALF_WIDTH = ROBOT_BODY_WIDTH / 2;
const ROBOT_HALF_DEPTH = ROBOT_BODY_DEPTH / 2;

// The flipper hinge sits at the front face of the car body (-CAR_BODY_DEPTH/2 in local Z).
// The flipper tip (when flat) reaches a further -FLIPPER_BODY_DEPTH beyond the hinge.
const FLIPPER_HINGE_Z = -(CAR_BODY_DEPTH / 2);
const FLIPPER_TIP_Z = -(CAR_BODY_DEPTH / 2 + FLIPPER_BODY_DEPTH);
const FLIPPER_STRENGTH = 15;
const LATERAL_FACTOR = 0.5;

/**
 * Checks whether the robot's body overlaps the flipper zone in the car's local frame.
 *
 * @param {object} car   - createCar() instance (needs group.position, rotation, groundY)
 * @param {object} robot - createRobot() instance (needs group.position, collisionRadius, groundY)
 * @returns {{ inContact: boolean, xOffset: number }}
 *   inContact — true when the robot is within the flipper's reach
 *   xOffset   — normalised lateral offset [-1, 1]; negative = car's left, positive = car's right
 */
export function checkFlipperContact(car, robot) {
  const dx = robot.group.position.x - car.group.position.x;
  const dz = robot.group.position.z - car.group.position.z;
  const r = car.rotation;

  // Transform world offset into car-local coordinates (inverse of car's Y-rotation)
  const localX = dx * Math.cos(r) - dz * Math.sin(r);
  const localZ = dx * Math.sin(r) + dz * Math.cos(r);

  // Robot center must be ahead of the car body front face and not past the flipper tip
  const zMin = FLIPPER_TIP_Z - ROBOT_HALF_DEPTH;
  const zMax = FLIPPER_HINGE_Z;
  if (localZ > zMax || localZ < zMin) return { inContact: false, xOffset: 0 };

  // Robot must overlap the flipper's width
  if (Math.abs(localX) > FLIPPER_HALF_WIDTH + ROBOT_HALF_WIDTH) {
    return { inContact: false, xOffset: 0 };
  }

  // Only flip a grounded robot — an airborne robot is already in the air
  if (robot.group.position.y > robot.groundY + 0.1) {
    return { inContact: false, xOffset: 0 };
  }

  // xOffset: normalised position along flipper width; clamped to [-1, 1]
  const xOffset = Math.max(-1, Math.min(1, localX / FLIPPER_HALF_WIDTH));
  return { inContact: true, xOffset };
}

/**
 * Applies a one-shot flip impulse to the robot when the flipper is actively swinging
 * upward and the robot is within the flipper zone.
 *
 * Vertical impulse magnitude scales with the current flipper angle relative to its max.
 * Lateral impulse scales with how far off-centre the contact point is, then is rotated
 * back into world space based on the car's heading.
 *
 * @param {object} car   - createCar() instance
 * @param {object} robot - createRobot() instance (velocityY must be settable)
 * @returns {boolean} true if an impulse was applied
 */
export function applyFlipperImpulse(car, robot) {
  if (!car.flipperActive || car.flipperAngle <= 0) return false;

  const contact = checkFlipperContact(car, robot);
  if (!contact.inContact) return false;

  const normalizedAngle = car.flipperAngle / FLIPPER_MAX_ANGLE;
  const force = FLIPPER_STRENGTH * normalizedAngle;

  // Vertical component — sends the robot into the air
  robot.velocityY += force;

  // Lateral component — pushes the robot sideways based on contact offset
  const lateralLocalX = contact.xOffset * force * LATERAL_FACTOR;

  // Rotate local X force back into world XZ
  robot.velocity.x += lateralLocalX * Math.cos(car.rotation);
  robot.velocity.z += -lateralLocalX * Math.sin(car.rotation);

  return true;
}
