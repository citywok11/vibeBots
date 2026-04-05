import * as THREE from 'three';

export const DEFAULT_PIT_SIZE = 6;
const PIT_DEPTH = 2;
const LOWER_SPEED = 0.2; // units per second (takes 10 seconds to lower fully)
const FRAME_THICKNESS = 0.3;
const FRAME_HEIGHT = 0.1;
const FRAME_COLOR = 0xffaa00;
const WALL_THICKNESS = 0.15;
const WARN_SIZE = 2.0;
const WARN_THICKNESS = 0.02;

// Shader tuning constants
const COVER_EDGE_FALLOFF = 1.2;    // steepness of the edge-to-black vignette
const COVER_OVERALL_DARK = 0.75;   // fraction by which the whole cover dims at full depth
const WALL_STRIPE_COUNT = '8.0';    // number of hazard stripes per wall face
const WARN_STRIPE_FREQ = '5.0';     // diagonal stripe frequency on the warning sign
const WARN_BORDER_THRESHOLD = 0.88; // UV distance from centre at which the black border starts

// Shared vertex shader used by cover, walls, and warning sign.
const uvVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Cover shader: heavy darkness gradient — edges go black immediately and
// the whole cover dims uniformly so it is clearly descending into a shaft.
const COVER_BASE_GRAY = 0.38;
const coverFragmentShader = `
  uniform float uDepth;
  varying vec2 vUv;
  void main() {
    vec2 centered = abs(vUv - 0.5) * 2.0;
    float edgeFactor = max(centered.x, centered.y);
    float edgeShadow = uDepth * pow(edgeFactor, ${COVER_EDGE_FALLOFF});
    float overallDark = uDepth * ${COVER_OVERALL_DARK};
    float totalShadow = min(1.0, edgeShadow + overallDark);
    vec3 base = vec3(${COVER_BASE_GRAY}, ${COVER_BASE_GRAY}, ${COVER_BASE_GRAY});
    vec3 color = base * (1.0 - totalShadow);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Wall shader: horizontal hazard stripes (yellow / near-black) so the shaft
// depth is immediately visible as the cover descends.
const wallFragmentShader = `
  varying vec2 vUv;
  void main() {
    float stripe = mod(vUv.y * ${WALL_STRIPE_COUNT}, 1.0);
    vec3 color = stripe < 0.5 ? vec3(0.85, 0.65, 0.0) : vec3(0.08, 0.08, 0.08);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Warning sign shader: diagonal hazard stripes with a black border.
const warnFragmentShader = `
  varying vec2 vUv;
  void main() {
    float stripe = mod((vUv.x - vUv.y) * ${WARN_STRIPE_FREQ}, 1.0);
    vec2 b = abs(vUv - 0.5) * 2.0;
    float border = max(b.x, b.y);
    vec3 color;
    if (border > ${WARN_BORDER_THRESHOLD}) {
      color = vec3(0.0, 0.0, 0.0);
    } else if (stripe < 0.5) {
      color = vec3(1.0, 0.85, 0.0);
    } else {
      color = vec3(0.05, 0.05, 0.05);
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Depth floor shader: animated pulsing rings to make the pit bottom look dangerous.
const floorFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float rings = sin(dist * 15.0 - uTime * 2.5) * 0.5 + 0.5;
    vec3 glowColor = vec3(0.4, 0.1, 0.0);
    vec3 darkColor = vec3(0.0, 0.0, 0.0);
    float fade = max(0.0, 1.0 - dist * 1.8);
    vec3 color = mix(darkColor, glowColor, rings * fade);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createPit(arenaSize, { pitSize = DEFAULT_PIT_SIZE } = {}) {
  const group = new THREE.Group();
  const half = pitSize / 2;

  // Animated depth floor visible when cover is lowered
  const depthGeometry = new THREE.PlaneGeometry(pitSize, pitSize);
  const depthMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: uvVertexShader,
    fragmentShader: floorFragmentShader,
  });
  const depthFloor = new THREE.Mesh(depthGeometry, depthMaterial);
  depthFloor.rotation.x = -Math.PI / 2;
  depthFloor.position.y = -PIT_DEPTH;
  group.add(depthFloor);

  // Pit shaft side walls with hazard stripes — exposed as the cover descends,
  // making the depth visually obvious.
  const wallMaterial = new THREE.ShaderMaterial({
    vertexShader: uvVertexShader,
    fragmentShader: wallFragmentShader,
  });
  const wallConfigs = [
    { w: pitSize,          h: PIT_DEPTH, d: WALL_THICKNESS, x: 0,     y: -PIT_DEPTH / 2, z: -half },
    { w: pitSize,          h: PIT_DEPTH, d: WALL_THICKNESS, x: 0,     y: -PIT_DEPTH / 2, z:  half },
    { w: WALL_THICKNESS,   h: PIT_DEPTH, d: pitSize,        x: -half, y: -PIT_DEPTH / 2, z: 0     },
    { w: WALL_THICKNESS,   h: PIT_DEPTH, d: pitSize,        x:  half, y: -PIT_DEPTH / 2, z: 0     },
  ];
  wallConfigs.forEach(({ w, h, d, x, y, z }) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMaterial);
    mesh.position.set(x, y, z);
    group.add(mesh);
  });

  // Visible frame/border around the pit edge (always shown)
  const frameMaterial = new THREE.MeshStandardMaterial({ color: FRAME_COLOR });
  const frameConfigs = [
    { w: pitSize + FRAME_THICKNESS * 2, d: FRAME_THICKNESS, x: 0,     z: -half },
    { w: pitSize + FRAME_THICKNESS * 2, d: FRAME_THICKNESS, x: 0,     z:  half },
    { w: FRAME_THICKNESS,               d: pitSize,         x: -half,  z: 0    },
    { w: FRAME_THICKNESS,               d: pitSize,         x:  half,  z: 0    },
  ];
  frameConfigs.forEach(({ w, d, x, z }) => {
    const geo = new THREE.BoxGeometry(w, FRAME_HEIGHT, d);
    const mesh = new THREE.Mesh(geo, frameMaterial);
    mesh.position.set(x, FRAME_HEIGHT / 2, z);
    group.add(mesh);
  });

  // Cover: heavy darkness gradient — edges blacken and the whole surface dims
  // dramatically as it descends, clearly signalling it is entering the shaft.
  const coverGeometry = new THREE.PlaneGeometry(pitSize, pitSize);
  const coverMaterial = new THREE.ShaderMaterial({
    uniforms: { uDepth: { value: 0 } },
    vertexShader: uvVertexShader,
    fragmentShader: coverFragmentShader,
  });
  const cover = new THREE.Mesh(coverGeometry, coverMaterial);
  cover.rotation.x = -Math.PI / 2;
  cover.position.y = 0;
  group.add(cover);

  // Warning sign: diagonal hazard stripes on a thin flat plate that sits just
  // above the cover and descends with it, making the lowering unmissable.
  const warnGeometry = new THREE.BoxGeometry(WARN_SIZE, WARN_THICKNESS, WARN_SIZE);
  const warnMaterial = new THREE.ShaderMaterial({
    vertexShader: uvVertexShader,
    fragmentShader: warnFragmentShader,
  });
  const warningSign = new THREE.Mesh(warnGeometry, warnMaterial);
  warningSign.position.y = WARN_THICKNESS;
  group.add(warningSign);

  let _isOpen = false;
  let _isLowering = false;
  let coverY = 0;
  let elapsedTime = 0;

  function reset() {
    _isOpen = false;
    _isLowering = false;
    coverY = 0;
    cover.position.y = 0;
    coverMaterial.uniforms.uDepth.value = 0;
    warningSign.position.y = WARN_THICKNESS;
  }

  function activate() {
    if (!_isOpen && !_isLowering) {
      _isLowering = true;
    }
  }

  function update(dt) {
    elapsedTime += dt;
    depthMaterial.uniforms.uTime.value = elapsedTime;
    if (_isLowering && !_isOpen) {
      coverY -= LOWER_SPEED * dt;
      cover.position.y = coverY;
      warningSign.position.y = coverY + WARN_THICKNESS;
      coverMaterial.uniforms.uDepth.value = (-coverY) / PIT_DEPTH;
      if (coverY <= -PIT_DEPTH) {
        coverY = -PIT_DEPTH;
        cover.position.y = coverY;
        warningSign.position.y = coverY + WARN_THICKNESS;
        coverMaterial.uniforms.uDepth.value = 1;
        _isLowering = false;
        _isOpen = true;
      }
    }
  }

  function containsPoint(x, z) {
    return Math.abs(x) < half && Math.abs(z) < half;
  }

  function isOpen() { return _isOpen; }
  function isLowering() { return _isLowering; }
  function getCoverY() { return coverY; }

  return { group, cover, depthFloor, warningSign, activate, reset, update, containsPoint, isOpen, isLowering, getCoverY, pitSize };
}
