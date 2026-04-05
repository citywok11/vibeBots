const COLLISION_RESTITUTION = 0.6;
const ANGULAR_IMPULSE_SCALE = 0.5;

/**
 * Resolves a collision between two physical objects on the XZ plane.
 *
 * Each object must have:
 *   position: { x, z }   — mutable world position
 *   velocity: { x, z }   — mutable velocity
 *   mass: number          — positive mass value
 *   collisionRadius: number — bounding radius for overlap detection
 *
 * Objects may optionally have:
 *   rotation: number      — yaw angle in radians (used for torque calculation)
 *   bodyWidth: number     — width of the body (for contact offset calculation)
 *   bodyDepth: number     — depth of the body (for contact offset calculation)
 *
 * @param {object} a - First object
 * @param {object} b - Second object
 * @param {number} [restitution] - Coefficient of restitution (0=perfectly inelastic, 1=elastic)
 * @returns {boolean|object} false if no collision, or { angularImpulseA, angularImpulseB, impactNormal, impactSpeed, contactPoint } if resolved
 */
export function resolveCollision(a, b, restitution = COLLISION_RESTITUTION) {
  const dx = b.position.x - a.position.x;
  const dz = b.position.z - a.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const minDist = a.collisionRadius + b.collisionRadius;

  if (dist >= minDist || dist === 0) return false;

  // Collision normal pointing from a to b
  const nx = dx / dist;
  const nz = dz / dist;

  // Relative velocity of a with respect to b along the normal
  const relVelNormal = (a.velocity.x - b.velocity.x) * nx + (a.velocity.z - b.velocity.z) * nz;

  // Only resolve if objects are moving toward each other
  if (relVelNormal <= 0) return false;

  // Impulse scalar using the 1D collision impulse formula
  const impulse = (1 + restitution) * relVelNormal / (1 / a.mass + 1 / b.mass);

  // Apply impulse to velocities
  a.velocity.x -= (impulse / a.mass) * nx;
  a.velocity.z -= (impulse / a.mass) * nz;
  b.velocity.x += (impulse / b.mass) * nx;
  b.velocity.z += (impulse / b.mass) * nz;

  // Separate objects to eliminate overlap, weighted by inverse mass
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;
  a.position.x -= nx * overlap * (b.mass / totalMass);
  a.position.z -= nz * overlap * (b.mass / totalMass);
  b.position.x += nx * overlap * (a.mass / totalMass);
  b.position.z += nz * overlap * (a.mass / totalMass);

  // Contact point — midpoint of the overlap region along the collision normal
  const contactX = a.position.x + nx * (a.collisionRadius - overlap / 2);
  const contactZ = a.position.z + nz * (a.collisionRadius - overlap / 2);

  // Compute angular impulse (yaw torque) for each object.
  // For oriented rectangular bodies the contact point on the body surface differs
  // from the circle-based contact point. We project the collision normal onto the
  // body's surface to find the true contact offset, producing realistic torque
  // (e.g. a glancing blow spins the target).
  const angularImpulseA = computeAngularImpulse(
    a, contactX, contactZ, -impulse * nx, -impulse * nz
  );
  const angularImpulseB = computeAngularImpulse(
    b, contactX, contactZ, impulse * nx, impulse * nz
  );

  return {
    angularImpulseA,
    angularImpulseB,
    impactNormal: { x: nx, z: nz },
    impactSpeed: relVelNormal,
    contactPoint: { x: contactX, z: contactZ },
  };
}

/**
 * Computes the angular impulse (yaw torque) on an object from a collision.
 *
 * The contact point is projected onto the oriented rectangle surface of the
 * body so that off-centre hits produce spin. For objects without body
 * dimensions the circle-based contact point is used as-is.
 *
 * @param {object} obj - The object ({ position, mass, rotation?, bodyWidth?, bodyDepth? })
 * @param {number} contactX - World-space contact point X
 * @param {number} contactZ - World-space contact point Z
 * @param {number} fx - Impulse force X component
 * @param {number} fz - Impulse force Z component
 * @returns {number} Angular impulse in radians/s (positive = CCW from above)
 */
function computeAngularImpulse(obj, contactX, contactZ, fx, fz) {
  const cx = obj.position.x;
  const cz = obj.position.z;

  let rx, rz;

  if (obj.bodyWidth && obj.bodyDepth && obj.rotation !== undefined) {
    // Transform the contact point into the object's local frame
    const cosR = Math.cos(-obj.rotation);
    const sinR = Math.sin(-obj.rotation);
    const dxLocal = (contactX - cx) * cosR - (contactZ - cz) * sinR;
    const dzLocal = (contactX - cx) * sinR + (contactZ - cz) * cosR;

    // Clamp to the body rectangle surface to find the nearest surface point
    const halfW = obj.bodyWidth / 2;
    const halfD = obj.bodyDepth / 2;
    const clampedX = Math.max(-halfW, Math.min(halfW, dxLocal));
    const clampedZ = Math.max(-halfD, Math.min(halfD, dzLocal));

    // Project to the nearest edge of the rectangle (the actual surface contact)
    let surfX = clampedX;
    let surfZ = clampedZ;
    const distToEdgeX = halfW - Math.abs(clampedX);
    const distToEdgeZ = halfD - Math.abs(clampedZ);
    if (distToEdgeX < distToEdgeZ) {
      surfX = clampedX > 0 ? halfW : -halfW;
    } else {
      surfZ = clampedZ > 0 ? halfD : -halfD;
    }

    // Transform surface point back to world space and compute the lever arm
    const cosR2 = Math.cos(obj.rotation);
    const sinR2 = Math.sin(obj.rotation);
    rx = surfX * cosR2 - surfZ * sinR2;
    rz = surfX * sinR2 + surfZ * cosR2;
  } else {
    // Fallback: use the circle-based contact point
    rx = contactX - cx;
    rz = contactZ - cz;
  }

  // 2D cross product: r × F = rx * fz - rz * fx
  const torque = rx * fz - rz * fx;

  // Moment of inertia for a uniform rectangle: I = m * (w² + d²) / 12
  // For objects without body dims, use collisionRadius as a proxy
  const w = obj.bodyWidth || obj.collisionRadius || 1;
  const d = obj.bodyDepth || obj.collisionRadius || 1;
  const momentOfInertia = obj.mass * (w * w + d * d) / 12;

  return ANGULAR_IMPULSE_SCALE * torque / momentOfInertia;
}
