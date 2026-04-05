# 015 – Pit Depth Shaders

## Problem

The pit cover was previously rendered with a plain `MeshStandardMaterial`.
When the cover descended it was visually ambiguous — from above it looked more
like the panel was fading away rather than travelling into a real shaft, because
there were no depth cues.

## Solution

Three layered visual changes make the depth unmistakably obvious:

### 1. Pit shaft side walls

Four `BoxGeometry` meshes are added inside the pit opening, forming the interior
walls of the shaft.  Their tops sit at floor level (y = 0) and their bottoms at
y = −2 (the full pit depth).

As the cover descends the walls are progressively revealed from above, giving an
immediate 3-D sense of the shaft opening up beneath the cover.

### 2. Cover `ShaderMaterial` — edge shadow (`uDepth`)

The flat cover panel uses a custom `ShaderMaterial` instead of
`MeshStandardMaterial`.  A `uDepth` uniform (0 → 1) is driven by
`(-coverY) / PIT_DEPTH` every frame.

The fragment shader darkens the edges of the panel in proportion to depth:

```glsl
float edgeFactor = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
float shadow = uDepth * edgeFactor * 0.85;
vec3 color = vec3(0.2, 0.2, 0.2) * (1.0 - shadow);
```

At the surface the cover looks like a plain grey panel.  As it lowers, the
edges darken strongly (simulating the shadow cast by the shaft walls around it),
leaving only the centre bright, which reads clearly as "this panel is deep
inside a hole".

### 3. Pit floor `ShaderMaterial` — animated danger rings (`uTime`)

The black floor at the bottom of the shaft uses an animated `ShaderMaterial`
driven by a `uTime` uniform that increments every `update(dt)` call.

The fragment shader produces pulsing concentric rings with a dark-red/orange
glow:

```glsl
float rings = sin(dist * 15.0 - uTime * 2.5) * 0.5 + 0.5;
vec3 color = mix(vec3(0), vec3(0.4, 0.1, 0.0), rings * fade);
```

The animation makes the pit floor look threatening and clearly distinct from the
static arena floor.

## Files changed

| File | Change |
|------|--------|
| `src/pit.js` | Shaders, side walls, uniform updates in `update()` / `reset()` |
| `tests/pit.test.js` | Updated colour assertion, 8 new tests for shaders and walls |
