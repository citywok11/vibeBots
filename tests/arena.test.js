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
