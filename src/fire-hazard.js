import * as THREE from 'three';

const GRATE_SIZE = 2;
const GRATE_HEIGHT = 0.06;
const GRATE_COLOR = 0x1a1a1a;

export const FIRE_PERIOD = 4.0;           // seconds per full cycle
export const FIRE_ACTIVE_DURATION = 1.5;  // seconds of active fire per cycle
export const N_FIRE_PARTICLES = 12;

const PARTICLE_LIFETIME = 0.7;
const PARTICLE_SPEED = 5;
const PARTICLE_SPREAD = 0.6;   // max X/Z offset on spawn
const PARTICLE_DRIFT = 0.8;    // max X/Z drift velocity

export function createFireHazard(x, z, phaseOffset = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Flat grate sitting on the arena floor
  const grateGeo = new THREE.BoxGeometry(GRATE_SIZE, GRATE_HEIGHT, GRATE_SIZE);
  const grateMat = new THREE.MeshStandardMaterial({ color: GRATE_COLOR });
  const grate = new THREE.Mesh(grateGeo, grateMat);
  grate.position.y = GRATE_HEIGHT / 2;
  grate.receiveShadow = true;
  group.add(grate);

  // Fire particles — orange/red spheres that rise upward while the hazard is active
  const particleGeo = new THREE.SphereGeometry(0.12, 5, 5);
  const particles = [];
  for (let i = 0; i < N_FIRE_PARTICLES; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff2200,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0,
    });
    const mesh = new THREE.Mesh(particleGeo, mat);
    mesh.visible = false;
    group.add(mesh);
    // Stagger initial ages so particles don't all spawn simultaneously on first activation
    particles.push({
      mesh,
      age: (i / N_FIRE_PARTICLES) * PARTICLE_LIFETIME,
      vx: 0,
      vz: 0,
    });
  }

  let cycleTimer = phaseOffset % FIRE_PERIOD;
  let active = false;

  function isActive() {
    return active;
  }

  function update(dt) {
    cycleTimer += dt;
    if (cycleTimer >= FIRE_PERIOD) cycleTimer -= FIRE_PERIOD;
    active = cycleTimer < FIRE_ACTIVE_DURATION;

    for (const p of particles) {
      p.age += dt;

      if (p.age >= PARTICLE_LIFETIME) {
        if (active) {
          // Respawn at a random position on the grate surface
          p.age -= PARTICLE_LIFETIME;
          p.mesh.position.set(
            (Math.random() - 0.5) * PARTICLE_SPREAD,
            GRATE_HEIGHT,
            (Math.random() - 0.5) * PARTICLE_SPREAD,
          );
          p.vx = (Math.random() - 0.5) * PARTICLE_DRIFT;
          p.vz = (Math.random() - 0.5) * PARTICLE_DRIFT;
          p.mesh.visible = true;
        } else {
          // Particle timed out while inactive — hide and wait
          p.mesh.visible = false;
          p.mesh.material.opacity = 0;
          continue;
        }
      }

      if (!p.mesh.visible) continue;

      // Advance position upward with slight lateral drift
      p.mesh.position.y += PARTICLE_SPEED * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;

      // Scale up over lifetime to simulate expanding flame
      const t = p.age / PARTICLE_LIFETIME;
      p.mesh.scale.setScalar(0.4 + t * 1.2);

      // Fade in quickly, then fade out over the rest of the lifetime
      const opacity = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
      p.mesh.material.opacity = Math.max(0, opacity);
    }
  }

  function reset() {
    cycleTimer = phaseOffset % FIRE_PERIOD;
    active = false;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.mesh.visible = false;
      p.mesh.material.opacity = 0;
      p.mesh.scale.setScalar(1);
      p.age = (i / N_FIRE_PARTICLES) * PARTICLE_LIFETIME;
    }
  }

  return { group, grate, particles, update, reset, isActive };
}

// Predefined hazard positions for the standard arena size.
// Offsets are expressed as fractions of half the arena so they scale correctly.
const HAZARD_POSITIONS = [
  { rx: -0.48, rz: -0.48, phase: 0 },
  { rx:  0.48, rz: -0.48, phase: FIRE_PERIOD * 0.25 },
  { rx: -0.48, rz:  0.48, phase: FIRE_PERIOD * 0.5 },
  { rx:  0.48, rz:  0.48, phase: FIRE_PERIOD * 0.75 },
];

export function createFireHazards(arenaSize) {
  const half = arenaSize / 2;
  const hazards = HAZARD_POSITIONS.map(({ rx, rz, phase }) =>
    createFireHazard(rx * half, rz * half, phase),
  );

  function update(dt) {
    for (const h of hazards) h.update(dt);
  }

  function reset() {
    for (const h of hazards) h.reset();
  }

  return { hazards, update, reset };
}
