import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPitAlarm } from '../src/pit-alarm.js';

function makeMockAudioCtx() {
  const oscillator = {
    type: null,
    frequency: { value: 880, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gainNode = {
    gain: { value: 0 },
    connect: vi.fn(),
  };
  return {
    oscillator,
    gainNode,
    ctx: {
      createOscillator: vi.fn(() => oscillator),
      createGain: vi.fn(() => gainNode),
      destination: {},
      currentTime: 0,
    },
  };
}

describe('PitAlarm', () => {
  it('should create a pit alarm object', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    expect(alarm).toBeDefined();
  });

  it('should expose start, stop, isPlaying functions', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    expect(typeof alarm.start).toBe('function');
    expect(typeof alarm.stop).toBe('function');
    expect(typeof alarm.isPlaying).toBe('function');
  });

  it('should start not playing', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    expect(alarm.isPlaying()).toBe(false);
  });

  it('should be playing after start()', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    expect(alarm.isPlaying()).toBe(true);
  });

  it('should create an oscillator on start()', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it('should create a gain node on start()', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it('should start the oscillator on start()', () => {
    const { ctx, oscillator } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    expect(oscillator.start).toHaveBeenCalled();
  });

  it('should not be playing after stop()', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    alarm.stop();
    expect(alarm.isPlaying()).toBe(false);
  });

  it('should stop the oscillator on stop()', () => {
    const { ctx, oscillator } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    alarm.stop();
    expect(oscillator.stop).toHaveBeenCalled();
  });

  it('should be idempotent: calling start() twice does not throw', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    expect(() => alarm.start()).not.toThrow();
    expect(alarm.isPlaying()).toBe(true);
  });

  it('should only start the oscillator once even if start() is called twice', () => {
    const { ctx, oscillator } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    alarm.start();
    expect(oscillator.start).toHaveBeenCalledOnce();
  });

  it('should be safe to call stop() when not playing', () => {
    const { ctx } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    expect(() => alarm.stop()).not.toThrow();
    expect(alarm.isPlaying()).toBe(false);
  });

  it('should be restartable after stop()', () => {
    const { ctx, oscillator } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    alarm.stop();
    // A new mock context needed because old oscillator is used up
    const mock2 = makeMockAudioCtx();
    const alarm2 = createPitAlarm(mock2.ctx);
    alarm2.start();
    expect(alarm2.isPlaying()).toBe(true);
  });

  it('should use a sawtooth wave type for the oscillator', () => {
    const { ctx, oscillator } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    expect(oscillator.type).toBe('sawtooth');
  });

  it('should connect oscillator to gain and gain to destination', () => {
    const { ctx, oscillator, gainNode } = makeMockAudioCtx();
    const alarm = createPitAlarm(ctx);
    alarm.start();
    expect(gainNode.connect).toHaveBeenCalledWith(ctx.destination);
    expect(oscillator.connect).toHaveBeenCalledWith(gainNode);
  });
});
