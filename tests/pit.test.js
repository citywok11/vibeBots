import { describe, it, expect } from 'vitest';
import { createPit, DEFAULT_PIT_SIZE } from '../src/pit.js';

function getShaftWalls(pit) {
  return pit.group.children.filter(
    c => c.isMesh && c !== pit.cover && c !== pit.depthFloor
      && c.geometry.parameters.height !== undefined
      && c.geometry.parameters.height > 0.5
  );
}

describe('Pit', () => {
  it('should export a default pit size constant', () => {
    expect(DEFAULT_PIT_SIZE).toBe(6);
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
    expect(pit.depthFloor.material.isShaderMaterial).toBe(true);
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

  it('should expose getCoverY() returning 0 initially', () => {
    const pit = createPit(50);
    expect(pit.getCoverY()).toBe(0);
  });

  it('should return a negative getCoverY() while lowering', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(0.5);
    expect(pit.getCoverY()).toBeLessThan(0);
  });

  it('getCoverY() should match cover.position.y at all times', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(0.3);
    expect(pit.getCoverY()).toBe(pit.cover.position.y);
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

  it('should lower the cover to exactly -2 when fully open', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 200; i++) pit.update(0.1);
    expect(pit.cover.position.y).toBe(-2);
  });

  it('should not be fully open after 9 seconds', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 90; i++) pit.update(0.1);
    expect(pit.isOpen()).toBe(false);
  });

  it('should be fully open after 10 seconds', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 125; i++) pit.update(0.1);
    expect(pit.isOpen()).toBe(true);
  });

  it('should expose a reset() method', () => {
    const pit = createPit(50);
    expect(typeof pit.reset).toBe('function');
  });

  it('reset() should restore cover position to y=0', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(1);
    pit.reset();
    expect(pit.cover.position.y).toBe(0);
  });

  it('reset() should set isOpen() to false', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 200; i++) pit.update(0.1);
    expect(pit.isOpen()).toBe(true);
    pit.reset();
    expect(pit.isOpen()).toBe(false);
  });

  it('reset() should set isLowering() to false', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(0.1);
    expect(pit.isLowering()).toBe(true);
    pit.reset();
    expect(pit.isLowering()).toBe(false);
  });

  it('reset() should set getCoverY() to 0', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(1);
    pit.reset();
    expect(pit.getCoverY()).toBe(0);
  });

  it('reset() should allow the pit to be activated again', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 200; i++) pit.update(0.1);
    pit.reset();
    pit.activate();
    expect(pit.isLowering()).toBe(true);
  });

  it('cover should use a ShaderMaterial', () => {
    const pit = createPit(50);
    expect(pit.cover.material.isShaderMaterial).toBe(true);
  });

  it('cover uDepth uniform should start at 0', () => {
    const pit = createPit(50);
    expect(pit.cover.material.uniforms.uDepth.value).toBe(0);
  });

  it('cover uDepth uniform should increase as cover lowers', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(1);
    expect(pit.cover.material.uniforms.uDepth.value).toBeGreaterThan(0);
  });

  it('cover uDepth uniform should be 1 when fully open', () => {
    const pit = createPit(50);
    pit.activate();
    for (let i = 0; i < 125; i++) pit.update(0.1);
    expect(pit.cover.material.uniforms.uDepth.value).toBe(1);
  });

  it('reset() should set uDepth uniform back to 0', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(1);
    pit.reset();
    expect(pit.cover.material.uniforms.uDepth.value).toBe(0);
  });

  it('depth floor should have a uTime uniform', () => {
    const pit = createPit(50);
    expect(pit.depthFloor.material.uniforms.uTime).toBeDefined();
    expect(pit.depthFloor.material.uniforms.uTime.value).toBe(0);
  });

  it('depth floor uTime uniform should advance on update()', () => {
    const pit = createPit(50);
    pit.update(0.5);
    expect(pit.depthFloor.material.uniforms.uTime.value).toBeCloseTo(0.5);
  });

  it('should expose a warningSign mesh', () => {
    const pit = createPit(50);
    expect(pit.warningSign).toBeDefined();
    expect(pit.warningSign.isMesh).toBe(true);
  });

  it('warningSign should start just above the floor', () => {
    const pit = createPit(50);
    expect(pit.warningSign.position.y).toBeGreaterThan(0);
    expect(pit.warningSign.position.y).toBeLessThan(0.1);
  });

  it('warningSign should use a ShaderMaterial', () => {
    const pit = createPit(50);
    expect(pit.warningSign.material.isShaderMaterial).toBe(true);
  });

  it('warningSign should descend with the cover while lowering', () => {
    const pit = createPit(50);
    const initialY = pit.warningSign.position.y;
    pit.activate();
    pit.update(0.5);
    expect(pit.warningSign.position.y).toBeLessThan(initialY);
  });

  it('warningSign y should track cover y during lowering', () => {
    const pit = createPit(50);
    pit.activate();
    pit.update(1);
    expect(pit.warningSign.position.y).toBeGreaterThan(pit.cover.position.y);
    expect(pit.warningSign.position.y - pit.cover.position.y).toBeCloseTo(0.02, 4);
  });

  it('reset() should restore warningSign to starting y', () => {
    const pit = createPit(50);
    const initialY = pit.warningSign.position.y;
    pit.activate();
    pit.update(1);
    pit.reset();
    expect(pit.warningSign.position.y).toBeCloseTo(initialY, 5);
  });

  it('should add 4 pit shaft side wall meshes to the group', () => {
    const pit = createPit(50);
    expect(getShaftWalls(pit).length).toBe(4);
  });

  it('side walls should be centred vertically at half pit depth', () => {
    const pit = createPit(50);
    getShaftWalls(pit).forEach(wall => {
      expect(wall.position.y).toBeCloseTo(-1);
    });
  });
});
