class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Skid sound
  private skidNode: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;

  // Sonar
  private lastSonarBeepTime: number = 0;

  constructor() {
    // Lazy init on first user interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.4;
      this.engineGain.connect(this.masterGain);

      this.initEngineSynth();
    } catch {
      // AudioContext not supported or restricted
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, sfx: number, engine: number) {
    if (!this.ctx) return;
    if (this.masterGain) this.masterGain.gain.value = master;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
    if (this.engineGain) this.engineGain.gain.value = engine * 0.4;
  }

  private initEngineSynth() {
    if (!this.ctx || !this.engineGain) return;

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 45; // base rumble

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 90; // harmonic

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 350;
    this.engineFilter.Q.value = 2.0;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.isEngineRunning = true;
  }

  public updateEngineSound(rpm: number, throttle: number) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    // RPM runs from ~800 idle to 6500
    const normRpm = Math.max(800, Math.min(rpm, 7000));
    const baseFreq = 28 + (normRpm / 6000) * 110;

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);

    // Filter opens up as throttle is applied
    const cutoff = 220 + (throttle * 400) + (normRpm / 6000) * 500;
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.06);
  }

  public playShiftSound() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // ignore
    }
  }

  public playTireSkid(intensity: number) {
    if (!this.ctx || !this.sfxGain) return;
    if (intensity < 0.1) {
      if (this.skidGain) {
        this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      return;
    }

    if (!this.skidGain) {
      // Create noise buffer
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.skidNode = this.ctx.createBufferSource();
      this.skidNode.buffer = buffer;
      this.skidNode.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 3.5;

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.value = 0;

      this.skidNode.connect(filter);
      filter.connect(this.skidGain);
      this.skidGain.connect(this.sfxGain);
      this.skidNode.start();
    }

    if (this.skidGain) {
      const gainVal = Math.min(0.35, intensity * 0.35);
      this.skidGain.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.05);
    }
  }

  public playCrash(impactSpeedKmh: number) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);

      const vol = Math.min(0.6, 0.1 + (impactSpeedKmh / 50) * 0.5);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(now + 0.35);
    } catch {
      // ignore
    }
  }

  public triggerParkingSonar(distance: number) {
    if (!this.ctx || !this.sfxGain || distance > 4.5) return;
    const now = performance.now();

    // Calculate beep interval based on distance (4.5m -> 1000ms, 0.4m -> 120ms)
    const factor = Math.max(0, Math.min(1, (distance - 0.4) / 4.0));
    const interval = 100 + factor * 800; // ms

    if (now - this.lastSonarBeepTime > interval) {
      this.lastSonarBeepTime = now;
      this.playSonarBeep(distance < 0.8);
    }
  }

  private playSonarBeep(isUrgent: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = isUrgent ? 1800 : 1200;

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  }

  public playSuccessChime() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = now + idx * 0.12;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch {
      // ignore
    }
  }

  public playClick() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(now + 0.03);
    } catch {
      // ignore
    }
  }
}

export const sound = new SoundService();
