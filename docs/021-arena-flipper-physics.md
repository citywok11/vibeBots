# 021 — Arena flipper physics improvements

## Overview

Improves the physics and consistency of the arena flipper hazard so that
flipper interactions are more readable, more reliable, and closer to the
intended Robot Wars style behaviour.

## What changed

### Modified module: `src/arena-flipper.js`

#### New tuning parameters

Five new configurable values have been added to the flipper's `DEFAULTS`
object and are available through `getConfig()`:

| Parameter          | Default | Description                                                       |
|--------------------|---------|-------------------------------------------------------------------|
| `swingEase`        | 0.5     | Ease-out factor for the upward swing (0 = linear, higher = more front-loaded) |
| `launchWindowEnd`  | 0.85    | Swing progress above which launch force begins to taper off       |
| `contactDepthScale`| 0.3     | How much the robot's Z-position on the paddle affects launch quality (0–1) |
| `resetEaseZone`    | 0.15    | Angle (radians) near rest where the reset speed smoothly eases in |
| `directionBlend`   | 0.3     | How much swing angle shifts the vertical/forward force ratio (0–1)|

All values can be overridden via the `tuning` parameter of
`createArenaFlipper()`.

#### Swing ease

The flipper swing now uses an ease-out curve controlled by `swingEase`.
When `swingEase > 0`, the swing starts fast and decelerates as it
approaches the active angle.  This makes the initial contact feel more
punchy while the paddle arrives at peak more smoothly.

`swingEase: 0` preserves the original linear swing behaviour.

#### Reset ease

When `resetEaseZone > 0`, the flipper's return-to-rest speed smoothly
reduces as the paddle angle enters the ease zone near the rest position.
A minimum speed factor of 0.25× ensures the paddle always reaches rest.
This eliminates the abrupt stop at the end of the reset.

`resetEaseZone: 0` preserves the original linear reset behaviour.

#### Launch window

The `launchWindowEnd` parameter defines the normalised swing progress
above which launch force begins to taper.  Beyond this threshold the
effectiveness ramps linearly down to zero at progress 1.0.  This
prevents late or stale contacts from receiving unrealistic force.

`launchWindowEnd: 1.0` disables the taper (original behaviour).

#### Contact depth quality

The `contactDepthScale` parameter makes the flipper's lever arm matter:
robots hit at the paddle tip (far from the hinge) receive full force,
while robots near the hinge receive reduced force.  The scaling follows:

```
depthQuality = (1 - contactDepthScale) + contactDepthScale × leverRatio
```

where `leverRatio` is 0 at the hinge and 1 at the tip.

`contactDepthScale: 0` gives uniform force across the paddle (original
behaviour).

#### Direction blend

The `directionBlend` parameter links the vertical/forward force split to
the flipper's swing angle.  At low angles (early in the swing) more
force goes forward; at high angles (late in the swing) more force goes
vertical.  This makes launches feel tied to the flipper motion rather
than an unnatural vertical pop.

```
upScale  = 1.0 - directionBlend × (1 - progress)
fwdScale = 1.0 + directionBlend × (1 - progress)
```

`directionBlend: 0` applies equal scaling in both directions (original
behaviour).

### Modified tests: `tests/arena-flipper.test.js`

- Existing state machine tests now explicitly pass `swingEase: 0` and
  `resetEaseZone: 0` to preserve timing-based assertions.
- **13 new tests** added across five new describe blocks:
  - *swing ease* — verifies eased swing is slower, still reaches peak,
    and linear mode is exact.
  - *reset ease* — verifies speed reduction near rest, convergence, and
    linear mode.
  - *launch window* — verifies late-swing force taper and full-window
    mode.
  - *contact depth* — verifies tip-vs-hinge force difference and uniform
    mode.
  - *direction blend* — verifies vertical/forward ratio shift and neutral
    mode.

## Design decisions

1. **Backward-compatible tuning** — Every new parameter has a neutral
   value (0 or 1.0) that reproduces the original behaviour.  Existing
   code that passes no tuning override gets the improved defaults; tests
   that need deterministic timing can opt out per-parameter.

2. **Multiplicative force model** — The launch force is now
   `progress × effectiveness × depthQuality` multiplied by directional
   scale factors.  This keeps each factor independent and composable
   without coupling them to each other.

3. **Minimum speed floor in reset ease** — The reset ease uses
   `Math.max(0.25, remaining / resetEaseZone)` so the paddle always
   converges to rest even with very small remaining angles.

4. **No changes to contact detection** — The bounding-box contact check
   (`checkContact`) is unchanged.  The improvements are all in how force
   is calculated once contact is confirmed.
