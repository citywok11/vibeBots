import { describe, it, expect } from 'vitest';
import { createPit, DEFAULT_PIT_SIZE } from '../src/pit.js';

describe('Pit', () => {
  it('should export a default pit size constant', () => {
    expect(typeof DEFAULT_PIT_SIZE).toBe('number');
    expect(DEFAULT_PIT_SIZE).toBeGreaterThan(0);
  });

  it('should create a pit with a THREE.Group', () => {
    const pit = createPit(50);
    expect(pit.group).toBeDefined();
    expect(pit.group.isGroup).toBe(true);
  });

  it('should expose the pitSize used', () => {
    const pit = createPit(50);
    expect(pit.pitSize).toBe(DEFAULT_PIT_SIZE);
  });

  it('should accept a custom pitSize', () => {
    const pit = createPit(50, { pitSize: 10 });
    expect(pit.pitSize).toBe(10);
  });

  it('should create a cover mesh that is a Mesh', () => {
    const pit = createPit(50);
    expect(pit.cover).toBeDefined();
    expect(pit.cover.isMesh).toBe(true);
  });

  it('should size the cover to pitSize × pitSize', () => {
    const pitSize = 8;
    const pit = createPit(50, { pitSize });
    const params = pit.cover.geometry.parameters;
    expect(params.width).toBe(pitSize);
    expect(params.height).toBe(pitSize);
  });

  it('should start with the cover flush with the floor (y = 0)', () => {
    const pit = createPit(50);
    expect(pit.cover.position.y).toBe(0);
  });

  it('should have cover positioned flat (rotated on X axis)', () => {
    const pit = createPit(50);
    expect(pit.cover.rotation.x).toBeCloseTo(-Math.PI / 2);
  });

  it('should expose a dark depth floor mesh', () => {
    const pit = createPit(50);
    expect(pit.depthFloor).toBeDefined();
    expect(pit.depthFloor.isMesh).toBe(true);
    const color = pit.depthFloor.material.color.getHex();
    expect(color).toBe(0x000000);
  });

  it('should start not open', () => {
    const pit = createPit(50);
    expect(pit.isOpen()).toBe(false);
  });

  it('should start not lowering', () => {
    const pit = createPit(50);
    expect(pit.isLowering()).toBe(false);
  });

  it('should set isLowering to true after activate()', () => {
    const pit = createPit(50);
    pit.activate();
    expect(pit.isLowering()).toBe(true);
  });

  it('should not change state if activate() called when already lowering', () => {
    const pit = createPit(50);
    pit.activate();
    pit.activate();
    expect(pit.isLowering()).toBe(true);
    expect(pit.isOpen()).toBe(false);
  });

  it('should lower the cover on update()', () => {
    const pit = createPit(50);
    pit.activate();
    const yBefore = pit.cover.position.y;
    pit.update(0.1);
    expect(pit.cover.position.y).toBeLessThan(yBefore);
  });

  it('should fully open after sufficient updates', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 200; i++) pit.update(0.1);
    expect(pit.isOpen()).toBe(true);
    expect(pit.isLowering()).toBe(false);
  });

  it('should not lower cover further once fully open', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 200; i++) pit.update(0.1);
    const yAfterOpen = pit.cover.position.y;
    pit.update(0.1);
    expect(pit.cover.position.y).toBe(yAfterOpen);
  });

  it('should not activate if already open', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 200; i++) pit.update(0.1);
    expect(pit.isOpen()).toBe(true);
    pit.activate();
    expect(pit.isLowering()).toBe(false);
  });

  it('containsPoint returns true for a point at the center', () => {
    const pit = createPit(50);
    expect(pit.containsPoint(0, 0)).toBe(true);
  });

  it('containsPoint returns true for points inside the pit bounds', () => {
    const pit = createPit(50, { pitSize: 6 });
    expect(pit.containsPoint(2, 2)).toBe(true);
    expect(pit.containsPoint(-2, -2)).toBe(true);
  });

  it('containsPoint returns false for points outside pit bounds', () => {
    const pit = createPit(50, { pitSize: 6 });
    expect(pit.containsPoint(5, 0)).toBe(false);
    expect(pit.containsPoint(0, -5)).toBe(false);
    expect(pit.containsPoint(10, 10)).toBe(false);
  });

  it('should add the group children (cover, frame, depth floor) to the group', () => {
    const pit = createPit(50);
    expect(pit.group.children.length).toBeGreaterThan(0);
    expect(pit.group.children).toContain(pit.cover);
    expect(pit.group.children).toContain(pit.depthFloor);
  });
});
