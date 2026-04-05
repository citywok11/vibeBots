import { describe, it, expect } from 'vitest';
import {
  createFireHazard,
  createFireHazards,
  FIRE_PERIOD,
  FIRE_ACTIVE_DURATION,
  N_FIRE_PARTICLES,
} from '../src/fire-hazard.js';

describe('FireHazard', () => {
  it('should create a group containing a grate mesh', () => {
    const hazard = createFireHazard(0, 0);
    expect(hazard.group.isGroup).toBe(true);
    expect(hazard.grate).toBeDefined();
    expect(hazard.grate.isMesh).toBe(true);
    expect(hazard.group.children).toContain(hazard.grate);
  });

  it('should position the group at the given XZ coordinates', () => {
    const hazard = createFireHazard(5, -8);
    expect(hazard.group.position.x).toBe(5);
    expect(hazard.group.position.z).toBe(-8);
    expect(hazard.group.position.y).toBe(0);
  });

  it('should have a flat grate mesh sitting on the floor', () => {
    const hazard = createFireHazard(0, 0);
    const params = hazard.grate.geometry.parameters;
    // Width and depth should match grate size; height should be much smaller than footprint
    expect(params.width).toBeGreaterThan(0);
    expect(params.depth).toBeGreaterThan(0);
    expect(params.height).toBeLessThan(params.width);
    // Grate Y position should be very close to floor level (above y=0 by half its own height)
    expect(hazard.grate.position.y).toBeGreaterThan(0);
    expect(hazard.grate.position.y).toBeLessThan(0.5);
  });

  it('should create the correct number of fire particles', () => {
    const hazard = createFireHazard(0, 0);
    expect(hazard.particles).toHaveLength(N_FIRE_PARTICLES);
    hazard.particles.forEach(p => {
      expect(p.mesh.isMesh).toBe(true);
    });
  });

  it('should initialise all particles hidden', () => {
    const hazard = createFireHazard(0, 0);
    hazard.particles.forEach(p => {
      expect(p.mesh.visible).toBe(false);
    });
  });

  it('should start inactive', () => {
    const hazard = createFireHazard(0, 0);
    expect(hazard.isActive()).toBe(false);
  });

  it('should become active after updating into the active phase', () => {
    // Phase offset 0 → hazard is active at t < FIRE_ACTIVE_DURATION
    const hazard = createFireHazard(0, 0, 0);
    hazard.update(FIRE_ACTIVE_DURATION * 0.5);
    expect(hazard.isActive()).toBe(true);
  });

  it('should become inactive after the active phase ends', () => {
    const hazard = createFireHazard(0, 0, 0);
    hazard.update(FIRE_ACTIVE_DURATION + 0.1);
    expect(hazard.isActive()).toBe(false);
  });

  it('should cycle back to active after one full period', () => {
    const hazard = createFireHazard(0, 0, 0);
    hazard.update(FIRE_PERIOD + FIRE_ACTIVE_DURATION * 0.5);
    expect(hazard.isActive()).toBe(true);
  });

  it('should make particles visible when active and updated', () => {
    const hazard = createFireHazard(0, 0, 0);
    // Step through the active window with many small frames so particles spawn normally
    for (let i = 0; i < 90; i++) hazard.update(0.01);
    const visibleCount = hazard.particles.filter(p => p.mesh.visible).length;
    expect(visibleCount).toBeGreaterThan(0);
  });

  it('should hide all particles after transitioning to inactive phase', () => {
    const hazard = createFireHazard(0, 0, 0);
    // Activate and let particles spawn
    hazard.update(FIRE_ACTIVE_DURATION);
    // Now advance past the active window and let particles expire
    hazard.update(FIRE_PERIOD - FIRE_ACTIVE_DURATION + 2.0);
    const visibleCount = hazard.particles.filter(p => p.mesh.visible).length;
    expect(visibleCount).toBe(0);
  });

  it('should respect the phase offset so hazards start at different points in the cycle', () => {
    const h0 = createFireHazard(0, 0, 0);
    const h1 = createFireHazard(0, 0, FIRE_PERIOD * 0.5);
    // After a tiny update, h0 is in its active window; h1 is halfway through the cycle (inactive)
    h0.update(FIRE_ACTIVE_DURATION * 0.1);
    h1.update(FIRE_ACTIVE_DURATION * 0.1);
    expect(h0.isActive()).toBe(true);
    expect(h1.isActive()).toBe(false);
  });

  it('should hide all particles and reset the cycle on reset()', () => {
    const hazard = createFireHazard(0, 0, 0);
    hazard.update(FIRE_ACTIVE_DURATION);
    hazard.reset();
    expect(hazard.isActive()).toBe(false);
    hazard.particles.forEach(p => {
      expect(p.mesh.visible).toBe(false);
    });
  });

  it('should add all particle meshes to the group', () => {
    const hazard = createFireHazard(0, 0);
    hazard.particles.forEach(p => {
      expect(hazard.group.children).toContain(p.mesh);
    });
  });
});

describe('createFireHazards', () => {
  it('should create multiple hazards', () => {
    const fireHazards = createFireHazards(50);
    expect(fireHazards.hazards.length).toBeGreaterThan(0);
  });

  it('should place all hazards on the floor (group y = 0)', () => {
    const fireHazards = createFireHazards(50);
    fireHazards.hazards.forEach(h => {
      expect(h.group.position.y).toBe(0);
    });
  });

  it('should place hazards inside the arena boundaries', () => {
    const arenaSize = 50;
    const half = arenaSize / 2;
    const fireHazards = createFireHazards(arenaSize);
    fireHazards.hazards.forEach(h => {
      expect(Math.abs(h.group.position.x)).toBeLessThan(half);
      expect(Math.abs(h.group.position.z)).toBeLessThan(half);
    });
  });

  it('should not place hazards at the exact centre where the pit is', () => {
    const fireHazards = createFireHazards(50);
    fireHazards.hazards.forEach(h => {
      const distFromCentre = Math.sqrt(
        h.group.position.x ** 2 + h.group.position.z ** 2,
      );
      expect(distFromCentre).toBeGreaterThan(3);
    });
  });

  it('should have hazards with staggered phases (not all fire simultaneously)', () => {
    const fireHazards = createFireHazards(50);
    // After a small update, only the first hazard (phase=0) should be active
    fireHazards.update(FIRE_ACTIVE_DURATION * 0.1);
    const activeCount = fireHazards.hazards.filter(h => h.isActive()).length;
    expect(activeCount).toBeGreaterThan(0);
    expect(activeCount).toBeLessThan(fireHazards.hazards.length);
  });

  it('should expose an update function that updates all hazards', () => {
    const fireHazards = createFireHazards(50);
    expect(() => fireHazards.update(0.016)).not.toThrow();
  });

  it('should expose a reset function that resets all hazards', () => {
    const fireHazards = createFireHazards(50);
    fireHazards.update(FIRE_ACTIVE_DURATION);
    expect(() => fireHazards.reset()).not.toThrow();
    fireHazards.hazards.forEach(h => {
      expect(h.isActive()).toBe(false);
    });
  });
});
