import { describe, it, expect } from 'vitest';
import { createArena } from '../src/arena.js';

describe('Arena', () => {
  it('should create an arena with a floor mesh', () => {
    const arena = createArena(50);
    expect(arena.floor).toBeDefined();
    expect(arena.floor.isMesh).toBe(true);
  });

  it('should create a square floor with the given size', () => {
    const size = 50;
    const arena = createArena(size);
    const geometry = arena.floor.geometry;
    expect(geometry.parameters.width).toBe(size);
    expect(geometry.parameters.height).toBe(size);
  });

  it('should position the floor flat (rotated on X axis)', () => {
    const arena = createArena(50);
    expect(arena.floor.rotation.x).toBeCloseTo(-Math.PI / 2);
  });

  it('should create 4 wall meshes around the arena', () => {
    const arena = createArena(50);
    expect(arena.walls).toHaveLength(4);
    arena.walls.forEach(wall => {
      expect(wall.isMesh).toBe(true);
    });
  });

  it('should expose the arena size', () => {
    const arena = createArena(60);
    expect(arena.size).toBe(60);
  });

  it('should return a group containing floor and walls', () => {
    const arena = createArena(50);
    expect(arena.group.isGroup).toBe(true);
    expect(arena.group.children).toContain(arena.floor);
    arena.walls.forEach(wall => {
      expect(arena.group.children).toContain(wall);
    });
  });
});

describe('Audience and Stands', () => {
  it('should create 4 stand groups, one per arena side', () => {
    const arena = createArena(50);
    expect(arena.stands).toBeDefined();
    expect(arena.stands).toHaveLength(4);
    arena.stands.forEach(stand => {
      expect(stand.isGroup).toBe(true);
    });
  });

  it('should position all stands outside the arena boundary', () => {
    const size = 50;
    const arena = createArena(size);
    const half = size / 2;
    arena.stands.forEach(stand => {
      const { x, z } = stand.position;
      expect(Math.abs(x) > half || Math.abs(z) > half).toBe(true);
    });
  });

  it('should give each stand multiple tier meshes', () => {
    const arena = createArena(50);
    arena.stands.forEach(stand => {
      const tiers = stand.children.filter(c => c.isMesh);
      expect(tiers.length).toBeGreaterThan(1);
    });
  });

  it('should create audience figures on the stands', () => {
    const arena = createArena(50);
    expect(arena.audienceFigures).toBeDefined();
    expect(arena.audienceFigures.length).toBeGreaterThan(0);
    arena.audienceFigures.forEach(fig => {
      expect(fig.isMesh).toBe(true);
    });
  });

  it('should add all stand groups to the arena group', () => {
    const arena = createArena(50);
    arena.stands.forEach(stand => {
      expect(arena.group.children).toContain(stand);
    });
  });

  it('should scale stands proportionally with arena size', () => {
    const small = createArena(30);
    const large = createArena(80);
    const smallStandWidth = small.stands[0].children[0].geometry.parameters.width;
    const largeStandWidth = large.stands[0].children[0].geometry.parameters.width;
    expect(largeStandWidth).toBeGreaterThan(smallStandWidth);
  });
});
