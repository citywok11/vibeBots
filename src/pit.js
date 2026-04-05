import * as THREE from 'three';

export const DEFAULT_PIT_SIZE = 6;
const PIT_DEPTH = 2;
const LOWER_SPEED = 0.2; // units per second (takes 10 seconds to lower fully)
const FRAME_THICKNESS = 0.3;
const FRAME_HEIGHT = 0.1;
const FRAME_COLOR = 0xffaa00;
const WALL_THICKNESS = 0.15;

// Cover shader: darkens edges progressively as the cover descends,
// simulating shadows cast by the pit shaft walls.
const coverVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const COVER_BASE_GRAY = 0.2;
const coverFragmentShader = `
  uniform float uDepth;
  varying vec2 vUv;
  void main() {
    vec2 centered = abs(vUv - 0.5) * 2.0;
    float edgeFactor = max(centered.x, centered.y);
    float shadow = uDepth * edgeFactor * 0.85;
    vec3 color = vec3(${COVER_BASE_GRAY}, ${COVER_BASE_GRAY}, ${COVER_BASE_GRAY}) * (1.0 - shadow);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Depth floor shader: animated pulsing rings to make the pit bottom look dangerous.
const floorVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
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
    vertexShader: floorVertexShader,
    fragmentShader: floorFragmentShader,
  });
  const depthFloor = new THREE.Mesh(depthGeometry, depthMaterial);
  depthFloor.rotation.x = -Math.PI / 2;
  depthFloor.position.y = -PIT_DEPTH;
  group.add(depthFloor);

  // Pit shaft side walls — exposed from above as the cover descends,
  // making the depth visually obvious.
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
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

  // Cover: shader darkens edges as it descends to show it is going into a shaft
  const coverGeometry = new THREE.PlaneGeometry(pitSize, pitSize);
  const coverMaterial = new THREE.ShaderMaterial({
    uniforms: { uDepth: { value: 0 } },
    vertexShader: coverVertexShader,
    fragmentShader: coverFragmentShader,
  });
  const cover = new THREE.Mesh(coverGeometry, coverMaterial);
  cover.rotation.x = -Math.PI / 2;
  cover.position.y = 0;
  group.add(cover);

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
      coverMaterial.uniforms.uDepth.value = (-coverY) / PIT_DEPTH;
      if (coverY <= -PIT_DEPTH) {
        coverY = -PIT_DEPTH;
        cover.position.y = coverY;
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

  return { group, cover, depthFloor, activate, reset, update, containsPoint, isOpen, isLowering, getCoverY, pitSize };
}
