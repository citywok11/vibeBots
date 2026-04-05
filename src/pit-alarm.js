const ALARM_FREQ_HIGH = 880;
const ALARM_FREQ_LOW = 440;
const ALARM_INTERVAL_MS = 500;
const GAIN_VOLUME = 0.0001;

export function createPitAlarm(audioCtx = null) {
  let _audioCtx = audioCtx;
  let oscillator = null;
  let gainNode = null;
  let alarmIntervalId = null;
  let _isPlaying = false;

  function start() {
    if (_isPlaying) return;

    if (!_audioCtx) {
      try {
        _audioCtx = new AudioContext();
      } catch (_e) {
        return;
      }
    }

    gainNode = _audioCtx.createGain();
    gainNode.gain.value = GAIN_VOLUME;
    gainNode.connect(_audioCtx.destination);

    oscillator = _audioCtx.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = ALARM_FREQ_HIGH;
    oscillator.connect(gainNode);
    oscillator.start();

    _isPlaying = true;

    let high = true;
    alarmIntervalId = setInterval(() => {
      high = !high;
      oscillator.frequency.setValueAtTime(
        high ? ALARM_FREQ_HIGH : ALARM_FREQ_LOW,
        _audioCtx.currentTime,
      );
    }, ALARM_INTERVAL_MS);
  }

  function stop() {
    if (!_isPlaying) return;
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
    if (oscillator) {
      try { oscillator.stop(); } catch (_e) { /* already stopped */ }
      oscillator = null;
    }
    gainNode = null;
    _isPlaying = false;
  }

  function isPlaying() { return _isPlaying; }

  return { start, stop, isPlaying };
}
