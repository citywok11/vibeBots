# 023 — Arena flipper contact detection and physics fixes

## Overview

Fixes five logic and physics issues in the arena flipper hazard that
caused incorrect contact detection, potential divide-by-zero errors,
inconsistent launch feel, and a too-rough grounded check.

## What changed

### Modified module: `src/arena-flipper.js`

#### 1. 3D contact detection (biggest fix)

**Before:** `checkContact()` tested whether a robot's centre was inside
the paddle's static 2D footprint (a flat rectangle), ignoring the
paddle's current rotation and surface height.  Once the flipper started
lifting, a robot could count as "on the paddle" simply because its
centre was within the base footprint, even if the paddle had rotated
well above or below the robot.

**After:** `checkContact()` computes the paddle surface height at the
robot's local-Z position from the current swing angle:

```
surfaceY = BASE_HEIGHT + distFromHinge × sin(angle)
```

The robot bottom is derived from `group.position.y - groundY` (wheel
contact patch), not the robot centre.  Contact is accepted when:

- The robot is within the paddle's X and Z footprint.
- The robot bottom is not more than `surfaceTolerance` above the paddle
  surface.  A negative gap (paddle surface above robot bottom) always
  counts — the paddle is sweeping through the robot from below, which is
  the normal lifting interaction.

`BASE_HEIGHT` is now exported for test use.

#### 2. Divide-by-zero guard

**Before:** `applyLaunch()` computed swing progress as
`(angle - restAngle) / (activeAngle - restAngle)`.  If
`activeAngle === restAngle`, this divided by zero, producing `NaN`
values that propagated into all force calculations.

**After:** At construction time, if `activeAngle <= restAngle` the
config is clamped so `activeAngle = restAngle + 1e-6`.  A pre-computed
`angleRange` constant is used for all progress calculations, eliminating
repeated subtraction and the zero-division risk.

#### 3. Multi-frame carry impulse

**Before:** `applyLaunch()` applied a single impulse per robot per swing
via a `launchedRobotsThisSwing` set.  The robot was tagged on the first
contact frame and received no further force, regardless of how long it
remained on the moving paddle.  This made launches feel weak or
inconsistent — the robot got one pop at an arbitrary early frame instead
of being carried by the paddle.

**After:** The first contact frame still applies the full impulse.
Subsequent frames while the robot is still on the paddle during the same
swing apply a reduced "carry" impulse scaled by the new
`carryFractionPerFrame` tuning parameter (default 0.35).  This makes
the robot ride the paddle more naturally.

| `carryFractionPerFrame` | Behaviour                               |
|-------------------------|-----------------------------------------|
| 0                       | Original single-impulse mode            |
| 0.35 (default)          | Moderate carry — paddle feels connected |
| 1.0                     | Full impulse every frame                |

#### 4. Robot bottom height check

**Before:** The grounded check used
`robot.group.position.y > robot.groundY + 0.2`, comparing the robot
centre position against an arbitrary offset.  Tall robots could be
partly on the paddle and still fail this check, or pass it when they
should not.

**After:** The contact check uses `robotBottomY = pos.y - groundY` to
compute the actual wheel contact patch height, then compares against the
paddle surface height.  The `surfaceTolerance` parameter (default 0.5)
controls how close the robot bottom must be to the surface.

#### 5. Auto-fire comment clarification

The comment on the auto-fire behaviour in `createArenaFlippers` was
updated to explicitly state that the continuous cycling
(fire → reset → cooldown → fire) is intentional — arena flippers are
persistent environmental hazards, not player-triggered ones.

### New tuning parameters

| Parameter              | Default | Description                                          |
|------------------------|---------|------------------------------------------------------|
| `surfaceTolerance`     | 0.5     | Max Y distance (above surface) for contact to count  |
| `carryFractionPerFrame`| 0.35    | Impulse fraction applied on carry frames (0–1)       |

Both values can be overridden via the `tuning` parameter and are
accessible through `getConfig()`.

### Modified tests: `tests/arena-flipper.test.js`

- The "only launches a robot once per swing" test was replaced with
  "applies reduced carry impulse on subsequent frames during same swing"
  to match the new multi-frame carry behaviour.
- **11 new tests** added across three new describe blocks:
  - *3D contact detection* (4 tests) — verifies surface height tracking,
    rejection of high-airborne robots, tip-vs-hinge surface variation,
    and robot-bottom-based height check.
  - *config safety* (3 tests) — verifies no crash with equal or inverted
    angles, and that `activeAngle` is clamped above `restAngle`.
  - *carry impulse* (4 tests) — verifies carry fraction scaling,
    `carryFractionPerFrame: 0` (original mode), `carryFractionPerFrame: 1`
    (full carry), and new config accessibility.
- `BASE_HEIGHT` added to imports.

## Design decisions

1. **Asymmetric gap tolerance** — A negative gap (paddle surface above
   robot bottom) always counts as contact because it represents the
   paddle sweeping upward through the robot, which is the expected
   physical interaction.  Only a positive gap exceeding
   `surfaceTolerance` rejects contact (robot is floating above the
   paddle).

2. **Carry fraction rather than removing deduplication** — Rather than
   removing the per-robot tracking entirely (which would apply full
   impulse every frame and launch robots to the moon), the carry
   fraction gives a tunable middle ground.  Setting it to 0 preserves
   the original single-impulse behaviour for anyone who prefers it.

3. **Pre-computed `angleRange`** — Computing
   `cfg.activeAngle - cfg.restAngle` once at construction time
   eliminates repeated subtraction and guarantees the denominator is
   always positive after the clamp.

4. **`BASE_HEIGHT` exported** — Needed by tests that verify the
   surface-height contact logic against known values.
