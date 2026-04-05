/**
 * Wheel contact points in world XZ (matches car/robot wheel layout: ±offsetX, ±offsetZ in local space).
 */
export function computeWheelWorldXZ(px, pz, yaw, width, depth, wheelThicknessHalf) {
  const ox = width / 2 + wheelThicknessHalf;
  const oz = depth / 2 - 0.4;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const locals = [
    [-ox, -oz], [ox, -oz],
    [-ox, oz], [ox, oz],
  ];
  return locals.map(([lx, lz]) => ({
    x: px + lx * cos + lz * sin,
    z: pz - lx * sin + lz * cos,
  }));
}

/**
 * Arena floor is y=0; pit cover surface is at pit.getCoverY() inside the pit footprint.
 */
export function surfaceYOffsetAtPit(wx, wz, pit) {
  const half = pit.pitSize / 2;
  const inside = Math.abs(wx) < half && Math.abs(wz) < half;
  if (!inside) return 0;
  return pit.getCoverY();
}

const PIT_LEAN_MAX = 0.42;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Highest wheel contact among the four corners (arena floor = 0, pit cover = getCoverY()),
 * plus pitch/roll lean when corners sit at different elevations.
 * Using the max avoids lowering the body through the floor when straddling the pit lip.
 * Order of wheelsXZ must match computeWheelWorldXZ: FL, FR, BL, BR.
 */
export function computePitGroundingFromWheels(wheelsXZ, pit, width, depth, wheelThicknessHalf) {
  const heights = wheelsXZ.map(({ x, z }) => surfaceYOffsetAtPit(x, z, pit));
  const minWheelOffset = Math.min(heights[0], heights[1], heights[2], heights[3]);
  const supportYOffset = Math.max(heights[0], heights[1], heights[2], heights[3]);
  const heightSpread = supportYOffset - minWheelOffset;

  const [hFl, hFr, hBl, hBr] = heights;
  const hFront = (hFl + hFr) / 2;
  const hRear = (hBl + hBr) / 2;
  const hLeft = (hFl + hBl) / 2;
  const hRight = (hFr + hBr) / 2;

  const wheelbase = (depth / 2 - 0.4) * 2;
  const track = (width / 2 + wheelThicknessHalf) * 2;

  // Negative sign: lower wheels (pit side) must tilt down into the pit, not up
  const pitch = clamp(-Math.atan2(hRear - hFront, wheelbase), -PIT_LEAN_MAX, PIT_LEAN_MAX);
  const roll = clamp(-Math.atan2(hRight - hLeft, track), -PIT_LEAN_MAX, PIT_LEAN_MAX);

  return { supportYOffset, minWheelOffset, heightSpread, pitch, roll };
}
