import { describe, it, expect, vi } from 'vitest';
import { createPitButton } from '../src/pit-button.js';

describe('PitButton', () => {
  it('should create a pit button with a THREE.Group', () => {
    const btn = createPitButton(50);
    expect(btn.group).toBeDefined();
    expect(btn.group.isGroup).toBe(true);
  });

  it('should have a mesh child', () => {
    const btn = createPitButton(50);
    expect(btn.mesh).toBeDefined();
    expect(btn.mesh.isMesh).toBe(true);
  });

  it('should place the button on the east side of the arena', () => {
    const arenaSize = 50;
    const btn = createPitButton(arenaSize);
    expect(btn.mesh.position.x).toBeGreaterThan(0);
    expect(btn.mesh.position.x).toBeLessThanOrEqual(arenaSize / 2);
  });

  it('should center the button on the east wall (z ≈ 0)', () => {
    const btn = createPitButton(50);
    expect(btn.mesh.position.z).toBeCloseTo(0);
  });

  it('should start not pressed', () => {
    const btn = createPitButton(50);
    expect(btn.isPressed()).toBe(false);
  });

  it('should return false from checkHit when object is far away', () => {
    const btn = createPitButton(50);
    const hit = btn.checkHit(0, 0, 2);
    expect(hit).toBe(false);
  });

  it('should return true from checkHit when object is close to the button', () => {
    const btn = createPitButton(50);
    // drive right up to east wall at center
    const bx = btn.mesh.position.x;
    const bz = btn.mesh.position.z;
    const hit = btn.checkHit(bx - 1, bz, 2);
    expect(hit).toBe(true);
  });

  it('should set isPressed to true after a hit', () => {
    const btn = createPitButton(50);
    const bx = btn.mesh.position.x;
    const bz = btn.mesh.position.z;
    btn.checkHit(bx - 1, bz, 2);
    expect(btn.isPressed()).toBe(true);
  });

  it('should call onActivate callbacks when hit', () => {
    const btn = createPitButton(50);
    const callback = vi.fn();
    btn.onActivate(callback);
    const bx = btn.mesh.position.x;
    const bz = btn.mesh.position.z;
    btn.checkHit(bx - 1, bz, 2);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should not trigger callbacks again if already pressed', () => {
    const btn = createPitButton(50);
    const callback = vi.fn();
    btn.onActivate(callback);
    const bx = btn.mesh.position.x;
    const bz = btn.mesh.position.z;
    btn.checkHit(bx - 1, bz, 2);
    btn.checkHit(bx - 1, bz, 2);
    expect(callback).toHaveBeenCalledOnce();
  });

  it('should support multiple onActivate callbacks', () => {
    const btn = createPitButton(50);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    btn.onActivate(cb1);
    btn.onActivate(cb2);
    const bx = btn.mesh.position.x;
    const bz = btn.mesh.position.z;
    btn.checkHit(bx - 1, bz, 2);
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('should reset pressed state with reset()', () => {
    const btn = createPitButton(50);
    const bx = btn.mesh.position.x;
    const bz = btn.mesh.position.z;
    btn.checkHit(bx - 1, bz, 2);
    btn.reset();
    expect(btn.isPressed()).toBe(false);
  });

  it('should return false from checkHit when not close enough', () => {
    const btn = createPitButton(50);
    // put object at center of arena, far from east wall
    const hit = btn.checkHit(0, 10, 2);
    expect(hit).toBe(false);
  });

  it('should scale button position with arena size', () => {
    const small = createPitButton(30);
    const large = createPitButton(80);
    expect(large.mesh.position.x).toBeGreaterThan(small.mesh.position.x);
  });
});
