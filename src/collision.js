const COLLISION_RESTITUTION = 0.6;

/**
 * Resolves a collision between two physical objects on the XZ plane.
 *
 * Each object must have:
 *   position: { x, z }   — mutable world position
 *   velocity: { x, z }   — mutable velocity
 *   mass: number          — positive mass value
 *   collisionRadius: number — bounding radius for overlap detection
 *
 * @param {object} a - First object
 * @param {object} b - Second object
 * @param {number} [restitution] - Coefficient of restitution (0=perfectly inelastic, 1=elastic)
 * @returns {boolean} true if a collision was resolved, false otherwise
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

  return true;
}
