class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private ambientOscs: OscillatorNode[] = [];
  private ambientGain: GainNode | null = null;
  private muted: boolean = true; // Default to muted to comply with browser autoplay policies

  constructor() {
    // Attempt to load mute preference
    const saved = localStorage.getItem('mafia_sound_muted');
    if (saved !== null) {
      this.muted = saved === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('mafia_sound_muted', String(this.muted));
    
    if (this.muted) {
      this.stopAmbient();
    } else {
      this.initCtx();
      this.startAmbient();
    }
    return this.muted;
  }

  // 1. Dynamic Ambient Noir Pad
  public startAmbient() {
    if (this.muted) return;
    this.initCtx();
    this.stopAmbient();

    if (!this.ctx) return;

    try {
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.ambientGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 3.0);

      // Low pass filter to make it dark and muddy
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, this.ctx.currentTime);

      // Oscillators (55Hz and 110.2Hz to generate a beat frequency/detuned drone)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // Low detuned A

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(110.5, this.ctx.currentTime); // Detuned octave

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientOscs = [osc1, osc2];
    } catch (e) {
      console.error('Failed to start ambient audio:', e);
    }
  }

  public stopAmbient() {
    this.ambientOscs.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.ambientOscs = [];
    if (this.ambientGain) {
      try { this.ambientGain.disconnect(); } catch (e) {}
      this.ambientGain = null;
    }
  }

  // 2. Chime for Night Phase Transitions
  public playNightChime() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    
    // Low sub hit
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, time);
    subOsc.frequency.exponentialRampToValueAtTime(30, time + 1.2);
    
    subGain.gain.setValueAtTime(0.3, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
    
    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start();
    subOsc.stop(time + 1.3);

    // High bell chime
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'triangle';
    bellOsc.frequency.setValueAtTime(880, time); // A5
    bellOsc.frequency.setValueAtTime(1318.51, time + 0.1); // E6

    bellGain.gain.setValueAtTime(0.15, time);
    bellGain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

    bellOsc.connect(bellGain);
    bellGain.connect(this.ctx.destination);
    bellOsc.start();
    bellOsc.stop(time + 2.1);
  }

  // 3. Clock Tick for voting selection
  public playTick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, time);
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700, time);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(time + 0.08);
  }

  // 4. Triumph Fanfare for Victory (Town wins)
  public playWinFanfare() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C major chord arpeggio
    
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time + index * 0.15);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + index * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + index * 0.15 + 1.2);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start(time + index * 0.15);
      osc.stop(time + index * 0.15 + 1.3);
    });
  }

  // 5. Descending rumble for Defeat (Mafia wins/You are killed)
  public playLoseRumble() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const time = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.linearRampToValueAtTime(45, time + 1.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, time);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(time + 1.9);
  }
}

export const sound = new SoundSynthesizer();
