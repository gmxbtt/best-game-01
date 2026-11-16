// EMBERFALL — all sound is synthesised with WebAudio: no audio files, no network.
// The engine is lazy (created on the first user gesture) and every method is a
// no-op until then, so headless runs and muted play never throw.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Call from the first user gesture. Safe to call repeatedly.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
  }

  _tone({ type = 'sine', freq = 440, freqEnd = null, dur = 0.15, vol = 0.3, when = 0, dest = null }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(dest ?? this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.2, vol = 0.3, freq = 1200, when = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() {
    this._tone({ type: 'square', freq: 880, freqEnd: 220, dur: 0.08, vol: 0.12 });
  }

  enemyShoot() {
    this._tone({ type: 'sawtooth', freq: 320, freqEnd: 140, dur: 0.16, vol: 0.1 });
  }

  explosion(big = false) {
    this._noise({ dur: big ? 0.5 : 0.25, vol: big ? 0.5 : 0.28, freq: big ? 700 : 1400 });
    this._tone({ type: 'sine', freq: big ? 120 : 180, freqEnd: 40, dur: big ? 0.45 : 0.25, vol: 0.35 });
  }

  pickup() {
    this._tone({ type: 'sine', freq: 660, dur: 0.07, vol: 0.18 });
    this._tone({ type: 'sine', freq: 990, dur: 0.1, vol: 0.18, when: 0.06 });
  }

  heart() {
    this._tone({ type: 'sine', freq: 523, dur: 0.12, vol: 0.22 });
    this._tone({ type: 'sine', freq: 784, dur: 0.18, vol: 0.22, when: 0.1 });
  }

  hurt() {
    this._tone({ type: 'sawtooth', freq: 200, freqEnd: 60, dur: 0.3, vol: 0.3 });
    this._noise({ dur: 0.15, vol: 0.2, freq: 900 });
  }

  dash() {
    this._noise({ dur: 0.18, vol: 0.16, freq: 2400 });
  }

  upgrade() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this._tone({ type: 'triangle', freq: f, dur: 0.16, vol: 0.2, when: i * 0.07 });
    });
  }

  waveClear() {
    // Rising arpeggio at the end of a wave.
    [392, 494, 587, 784].forEach((f, i) => {
      this._tone({ type: 'triangle', freq: f, dur: 0.22, vol: 0.22, when: i * 0.09 });
    });
  }

  bossAlarm() {
    [220, 220, 330, 220].forEach((f, i) => {
      this._tone({ type: 'sawtooth', freq: f, dur: 0.22, vol: 0.2, when: i * 0.24 });
    });
  }

  // A low bell at the opening of each night.
  nightSting() {
    this._tone({ type: 'sine', freq: 196, dur: 0.7, vol: 0.22 });
    this._tone({ type: 'sine', freq: 294, dur: 0.7, vol: 0.14, when: 0.08 });
  }

  // The Heart's slow thump when it runs low: two low beats, dread you hear.
  heartbeat() {
    this._tone({ type: 'sine', freq: 65, freqEnd: 40, dur: 0.16, vol: 0.4 });
    this._tone({ type: 'sine', freq: 55, freqEnd: 35, dur: 0.18, vol: 0.3, when: 0.18 });
  }

  // The Heart takes a bite: a wet, low crack.
  heartHurt() {
    this._tone({ type: 'sawtooth', freq: 140, freqEnd: 50, dur: 0.28, vol: 0.3 });
    this._noise({ dur: 0.12, vol: 0.18, freq: 700 });
  }

  // The Heartpulse nova going off: a bright rising ring of sound.
  nova() {
    this._tone({ type: 'triangle', freq: 330, freqEnd: 990, dur: 0.3, vol: 0.22 });
    this._noise({ dur: 0.25, vol: 0.15, freq: 2800 });
  }

  // The Warden raising its shield: a cold shimmer.
  shield() {
    this._tone({ type: 'sine', freq: 1175, dur: 0.18, vol: 0.12 });
    this._tone({ type: 'sine', freq: 1568, dur: 0.22, vol: 0.1, when: 0.08 });
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => {
      this._tone({ type: 'triangle', freq: f, dur: 0.3, vol: 0.22, when: i * 0.16 });
    });
  }

  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this._tone({ type: 'triangle', freq: f, dur: 0.3, vol: 0.22, when: i * 0.11 });
    });
  }

  // Simple bass loop: a two-bar minor groove, one step every 150 ms.
  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    const bass = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 58.27, 0, 73.42, 0];
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx) return;
      const f = bass[this.musicStep % bass.length];
      this.musicStep += 1;
      if (f > 0) {
        this._tone({ type: 'triangle', freq: f, dur: 0.22, vol: 0.5, dest: this.musicGain });
      }
      // Sparse sparkle on the off-beats.
      if (this.musicStep % 8 === 4) {
        this._tone({ type: 'sine', freq: 880, dur: 0.4, vol: 0.08, dest: this.musicGain });
      }
    }, 150);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
