import { describe, it, expect } from 'vitest';
import {
  computeWheelWorldXZ,
  surfaceYOffsetAtPit,
  computePitGroundingFromWheels,
  createPitWheelHysteresis,
  PIT_TIPPING_SPREAD_DEADBAND_M,
} from '../src/pit-support.js';

describe('pit-support', () => {
  describe('computeWheelWorldXZ', () => {
    it('places wheels symmetrically at yaw 0', () => {
      const w = computeWheelWorldXZ(10, 20, 0, 2, 3, 0.15);
      const ox = 1.15;
      const oz = 3 / 2 - 0.4; // matches car wheel offsetZ = depth/2 - 0.4
      expect(w[0]).toEqual({ x: 10 - ox, z: 20 - oz });
      expect(w[1]).toEqual({ x: 10 + ox, z: 20 - oz });
      expect(w[2]).toEqual({ x: 10 - ox, z: 20 + oz });
      expect(w[3]).toEqual({ x: 10 + ox, z: 20 + oz });
    });
  });

  describe('surfaceYOffsetAtPit', () => {
    const pit = {
      pitSize: 6,
      getCoverY: () => -0.5,
    };

    it('returns 0 outside pit footprint', () => {
      expect(surfaceYOffsetAtPit(5, 0, pit)).toBe(0);
    });

    it('returns cover Y inside footprint', () => {
      expect(surfaceYOffsetAtPit(0, 0, pit)).toBe(-0.5);
    });
  });

  describe('computePitGroundingFromWheels', () => {
    function mockPit(coverY) {
      return { pitSize: 6, getCoverY: () => coverY };
    }

    it('is level when all wheels share the same surface height', () => {
      const wheels = [
        { x: 0, z: 0 }, { x: 0.5, z: 0 }, { x: 0, z: 0.5 }, { x: 0.5, z: 0.5 },
      ];
      const g = computePitGroundingFromWheels(wheels, mockPit(-0.4), 2, 3, 0.15);
      expect(g.supportYOffset).toBe(-0.4);
      expect(g.minWheelOffset).toBe(-0.4);
      expect(g.heightSpread).toBe(0);
      expect(g.tippingSpread).toBe(0);
      expect(g.pitch).toBeCloseTo(0, 5);
      expect(g.roll).toBeCloseTo(0, 5);
    });

    it('leans when left wheels are on the cover and right wheels on the rim', () => {
      const pit = mockPit(-0.8);
      const wheels = [
        { x: -1, z: 0 }, { x: 4, z: 0 },
        { x: -1, z: 0.5 }, { x: 4, z: 0.5 },
      ];
      const g = computePitGroundingFromWheels(wheels, pit, 2, 3, 0.15);
      expect(g.supportYOffset).toBe(0);
      expect(g.minWheelOffset).toBe(-0.8);
      expect(g.heightSpread).toBe(0.8);
      expect(g.tippingSpread).toBeCloseTo(0.8 - PIT_TIPPING_SPREAD_DEADBAND_M, 5);
      expect(Math.abs(g.roll)).toBeGreaterThan(0.05);
      expect(g.pitch).toBeCloseTo(0, 5);
    });

    it('scales lean down when only shallowly over the pit (same spread, less inward depth)', () => {
      const pit = mockPit(-0.8);
      const deep = [
        { x: -1, z: 0 }, { x: 4, z: 0 },
        { x: -1, z: 0.5 }, { x: 4, z: 0.5 },
      ];
      const shallow = [
        { x: 2.97, z: 0 }, { x: 5, z: 0 },
        { x: 2.97, z: 0.5 }, { x: 5, z: 0.5 },
      ];
      const gDeep = computePitGroundingFromWheels(deep, pit, 2, 3, 0.15);
      const gShallow = computePitGroundingFromWheels(shallow, pit, 2, 3, 0.15);
      expect(gShallow.tippingSpread).toBeCloseTo(gDeep.tippingSpread, 5);
      expect(Math.abs(gShallow.roll)).toBeLessThan(Math.abs(gDeep.roll));
      expect(Math.abs(gShallow.roll)).toBeLessThan(0.04);
    });

    it('tippingSpread damps tiny rim spreads (no false tipping from mm-scale straddle)', () => {
      const pit = mockPit(-0.01);
      const wheels = [
        { x: 0, z: 0 }, { x: 0.5, z: 0 }, { x: 0, z: 0.5 },
        { x: 5, z: 0 },
      ];
      const g = computePitGroundingFromWheels(wheels, pit, 2, 3, 0.15);
      expect(g.heightSpread).toBeCloseTo(0.01, 5);
      expect(g.tippingSpread).toBe(0);
    });
  });

  describe('createPitWheelHysteresis', () => {
    it('keeps pit surface under a wheel that has crossed the strict edge slightly', () => {
      const pit = { pitSize: 6, getCoverY: () => -0.3 };
      const h = createPitWheelHysteresis();
      const inside = [
        { x: 1, z: 0 }, { x: 1, z: 0 },
        { x: 1, z: 0.5 }, { x: 1, z: 0.5 },
      ];
      computePitGroundingFromWheels(inside, pit, 2, 3, 0.15, { hysteresis: h });
      const pastStrictEdge = [
        { x: 3.04, z: 0 }, { x: 3.04, z: 0 },
        { x: 3.04, z: 0.5 }, { x: 3.04, z: 0.5 },
      ];
      const g = computePitGroundingFromWheels(pastStrictEdge, pit, 2, 3, 0.15, { hysteresis: h });
      expect(surfaceYOffsetAtPit(3.04, 0, pit)).toBe(0);
      expect(g.supportYOffset).toBe(-0.3);
      expect(g.minWheelOffset).toBe(-0.3);
    });

    it('reset() clears latch so strict bounds apply again', () => {
      const pit = { pitSize: 6, getCoverY: () => -0.5 };
      const h = createPitWheelHysteresis();
      computePitGroundingFromWheels(
        [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }],
        pit, 2, 3, 0.15, { hysteresis: h },
      );
      h.reset();
      const edge = [
        { x: 3.04, z: 0 }, { x: 3.04, z: 0 },
        { x: 3.04, z: 0 }, { x: 3.04, z: 0 },
      ];
      const g = computePitGroundingFromWheels(edge, pit, 2, 3, 0.15, { hysteresis: h });
      expect(g.supportYOffset).toBe(0);
    });
  });
});
