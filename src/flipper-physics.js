import { CAR_BODY_DEPTH, CAR_BODY_WIDTH } from './car.js';
import { ROBOT_BODY_WIDTH, ROBOT_BODY_DEPTH } from './robot.js';

const ROBOT_HALF_WIDTH = ROBOT_BODY_WIDTH / 2;
const ROBOT_HALF_DEPTH = ROBOT_BODY_DEPTH / 2;

const FLIPPER_STRENGTH = 15;
const LATERAL_FACTOR = 0.5;

/**
 * Checks whether the robot's body overlaps the flipper zone in the car's local frame,
 * accounting for the flipper's current rotation angle around its hinge pivot.
 *
 * The flipper swings in an arc: at angle θ the tip position (relative to the hinge)
 * is at local Z = -flipperDepth × cos(θ) and local Y = flipperDepth × sin(θ).
 * The contact zone follows this arc so the collider matches the visible flipper.
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

  // The flipper hinge sits at the front face of the car body.
  // At flipperAngle θ, the projected Z-reach of the flipper shrinks by cos(θ)
  // and the tip rises by flipperDepth × sin(θ).
  const angle = car.flipperAngle || 0;
  const flipperHingeZ = -(CAR_BODY_DEPTH / 2);
  const projectedDepth = car.flipperDepth * Math.cos(angle);
  const flipperTipZ = flipperHingeZ - projectedDepth;
  const flipperHalfWidth = CAR_BODY_WIDTH / 2;

  // Robot center must be ahead of the car body front face and not past the flipper tip
  const zMin = flipperTipZ - ROBOT_HALF_DEPTH;
  const zMax = flipperHingeZ;
  if (localZ > zMax || localZ < zMin) return { inContact: false, xOffset: 0 };

  // Robot must overlap the flipper's width
  if (Math.abs(localX) > flipperHalfWidth + ROBOT_HALF_WIDTH) {
    return { inContact: false, xOffset: 0 };
  }

  // Height check: the flipper tip rises as it swings.  A grounded robot is only
  // in contact if its body is within reach of the elevated flipper surface.
  // Tip Y (relative to car group origin) = -bodyHeight/2 + flipperDepth × sin(θ)
  // We allow contact when the robot is within 0.1 + tipRise of the ground.
  const tipRise = car.flipperDepth * Math.sin(angle);
  const maxContactY = robot.groundY + tipRise + 0.1;
  if (robot.group.position.y > maxContactY) {
    return { inContact: false, xOffset: 0 };
  }

  // xOffset: normalised position along flipper width; clamped to [-1, 1]
  const xOffset = Math.max(-1, Math.min(1, localX / flipperHalfWidth));
  return { inContact: true, xOffset };
}

/**
 * Applies a one-shot flip impulse to the robot when the flipper is actively swinging
 * upward and the robot is within the flipper zone.
 *
 * The impulse direction is perpendicular to the flipper surface at its current angle,
 * matching the arc of a real hinged flipper.  At angle θ, the flipper surface normal
 * in the car's local frame is (0, cos θ, -sin θ).  This means:
 *   - At θ ≈ 0 the impulse is mostly vertical (straight up)
 *   - As θ increases the impulse tilts forward (pushing the robot away)
 *
 * The total force scales linearly with the normalised angle and the flipper's power.
 * Lateral impulse scales with how far off-centre the contact is, then is rotated
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

  const angle = car.flipperAngle;
  const normalizedAngle = angle / car.flipperMaxAngle;
  const force = FLIPPER_STRENGTH * normalizedAngle * car.flipperPower;

  // Surface-normal components in car-local space (perpendicular to the tilted flipper)
  const normalUp = Math.cos(angle);       // vertical component
  const normalFwd = Math.sin(angle);      // forward component (toward -Z in car space)

  // Vertical component — sends the robot into the air
  robot.velocityY += force * normalUp;

  // Forward component — pushes the robot in the car's facing direction
  const forwardForce = force * normalFwd;
  const carAngle = car.rotation;
  robot.velocity.x += -forwardForce * Math.sin(carAngle);
  robot.velocity.z += -forwardForce * Math.cos(carAngle);

  // Lateral component — pushes the robot sideways based on contact offset
  const lateralLocalX = contact.xOffset * force * LATERAL_FACTOR;

  // Rotate local X force back into world XZ
  robot.velocity.x += lateralLocalX * Math.cos(carAngle);
  robot.velocity.z += -lateralLocalX * Math.sin(carAngle);

  return true;
}
