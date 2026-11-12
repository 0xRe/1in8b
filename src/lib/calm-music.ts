/**
 * Procedural ambient calm music engine using pure Web Audio API.
 * Generates tranquil, slow-evolving chord progressions and soft pentatonic bell/chime notes.
 * Responsive to life stages (childhood, youth, adulthood, elder).
 * Lightweight, zero-asset, works offline, pauses when tab is hidden.
 */

export type LifeCue = 'wedding' | 'birth' | 'milestone' | 'loss';

/** The cue a recorded event earns, if any: the moments a life is remembered by. */
export function lifeCueFor(key: string): LifeCue | null {
  if (key === 'event.familyDeath') return 'loss';
  if (key === 'event.marriage' || key === 'event.descendantWedding') return 'wedding';
  if (key === 'event.child' || key === 'event.descendantBirth' || key === 'event.greatGrandchildrenFirst') return 'birth';
  if (key === 'event.graduate' || key === 'event.newJob' || key === 'event.retirement' || key === 'event.firstSteps') return 'milestone';
  return null;
}

class CalmMusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer: any = null;
  private on = false;
  private step = 0;
  private stage: 'child' | 'youth' | 'adult' | 'elder' = 'adult';
  private volume = 0.35;
  private listeners = new Set<(playing: boolean) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.on) {
          this.pause();
        }
      });
    }
  }

  private init(): boolean {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      const a = new AudioCtx();
      const master = a.createGain();
      master.gain.value = 0;

      const filter = a.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1500;

      // 3-second decaying noise impulse response for rich ambient reverb
      const length = Math.floor(a.sampleRate * 3.2);
      const impulse = a.createBuffer(2, length, a.sampleRate);
      for (let c = 0; c < 2; c++) {
        const channel = impulse.getChannelData(c);
        for (let i = 0; i < length; i++) {
          channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.2);
        }
      }
      const convolver = a.createConvolver();
      convolver.buffer = impulse;

      const dryGain = a.createGain();
      dryGain.gain.value = 0.55;
      const wetGain = a.createGain();
      wetGain.gain.value = 0.45;

      const comp = a.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 10;
      comp.ratio.value = 3;
      comp.attack.value = 0.02;
      comp.release.value = 0.5;

      filter.connect(dryGain);
      filter.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(master);
      wetGain.connect(master);
      master.connect(comp);
      comp.connect(a.destination);

      const bus = a.createGain();
      bus.connect(filter);

      this.ctx = a;
      this.master = master;
      this.bus = bus;
      return true;
    } catch {
      return false;
    }
  }

  private note(midi: number, time: number, duration: number, gain: number, type: OscillatorType = 'sine', attack = 1.8, harmonic = 0) {
    if (!this.ctx || !this.bus) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      osc.detune.value = (Math.random() - 0.5) * 6;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(gain, time + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(g);
      g.connect(this.bus);
      osc.start(time);
      osc.stop(time + duration + 0.1);

      if (harmonic > 0) {
        const hOsc = this.ctx.createOscillator();
        const hG = this.ctx.createGain();
        hOsc.type = 'sine';
        hOsc.frequency.value = 440 * Math.pow(2, (midi + (midi < 52 ? 24 : 12) - 69) / 12);
        hOsc.detune.value = osc.detune.value;
        hG.gain.value = harmonic;
        hOsc.connect(hG);
        hG.connect(g);
        hOsc.start(time);
        hOsc.stop(time + duration + 0.1);
      }
    } catch {}
  }

  private tick = () => {
    if (!this.on || !this.ctx) return;
    const now = this.ctx.currentTime + 0.05;
    const step = this.step++;
    const stage = this.stage;

    // Ambient chords (Cmaj9, Am9, Fmaj7, G6)
    const CHORDS = [
      [48, 55, 59, 62, 64],
      [45, 52, 55, 60, 64],
      [41, 48, 52, 57, 60],
      [43, 50, 55, 59, 62],
    ];
    const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79];

    // Every 2 beats (8s): chord root and harmony
    if (step % 2 === 0) {
      const chord = CHORDS[(step / 2) % CHORDS.length];
      chord.forEach((note, idx) => {
        const offset = idx * (stage === 'elder' ? 0.14 : 0.08);
        const dur = stage === 'elder' ? 11 : 9;
        const vol = idx === 0 ? 0.045 : 0.025;
        this.note(note - 12 + (idx === 0 ? 0 : 12), now + offset, dur, vol, 'sine', 2.0, idx === 0 ? 0.5 : 0.35);
      });
    }

    // Melodic sprinkle notes
    const noteCount = stage === 'child' ? 2 : stage === 'elder' ? 1 : 2;
    for (let r = 0; r < noteCount; r++) {
      const noteOffset = stage === 'child' ? 12 : stage === 'elder' ? -12 : 0;
      const noteIdx = Math.floor(Math.random() * PENTA.length);
      const midi = PENTA[noteIdx] + noteOffset;
      const time = now + 0.4 + Math.random() * 3.0;
      const dur = stage === 'child' ? 1.8 : stage === 'elder' ? 4.5 : 3.0;
      const vol = stage === 'child' ? 0.03 : 0.04;
      const type = stage === 'elder' ? 'sine' : 'triangle';
      this.note(midi, time, dur, vol, type, 0.03);
    }
  };

  /**
   * A short motif over the ambient music at a life's turning points. Only while the player has music on;
   * it never starts audio by itself. Notes sit in the music's C major so they blend into the chords.
   */
  public cue(kind: LifeCue) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + 0.08;
    const line = (notes: [midi: number, at: number, dur: number][], gain: number, type: OscillatorType, harmonic = 0) =>
      notes.forEach(([midi, at, dur]) => this.note(midi, t + at, dur, gain, type, 0.02, harmonic));
    if (kind === 'wedding') {
      line([[72, 0, 2.4], [76, 0.22, 2.4], [79, 0.44, 2.6], [84, 0.7, 3.4]], 0.09, 'triangle', 0.25);
      line([[60, 0.7, 5], [64, 0.7, 5], [67, 0.7, 5]], 0.045, 'sine');
    } else if (kind === 'birth') {
      line([[79, 0, 1.6], [76, 0.45, 1.6], [84, 0.9, 1.8], [79, 1.5, 2.2], [81, 2.1, 2.6]], 0.09, 'sine', 0.4);
    } else if (kind === 'milestone') {
      line([[67, 0, 2.2], [72, 0.3, 2.6], [76, 0.55, 3]], 0.1, 'triangle', 0.2);
    } else {
      line([[57, 0, 4.5], [53, 1.1, 4.5], [50, 2.2, 6]], 0.075, 'sine', 0.3);
      line([[45, 0, 8]], 0.05, 'sine');
    }
  }

  public setStage(age: number) {
    if (age < 13) this.stage = 'child';
    else if (age < 25) this.stage = 'youth';
    else if (age >= 60) this.stage = 'elder';
    else this.stage = 'adult';
  }

  public toggle(): boolean {
    if (this.on) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  public play() {
    if (!this.ctx && !this.init()) return;
    this.on = true;
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 1.2);
    }
    if (!this.timer) {
      this.tick();
      this.timer = setInterval(this.tick, 4000);
    }
    this.notify();
  }

  public pause() {
    this.on = false;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.notify();
  }

  /** Slider position 0–1; the default 0.35 is the original master level of 0.6. */
  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.35));
    if (this.on && this.master && this.ctx) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, 0.15);
  }

  private level() {
    return (this.volume / 0.35) * 0.6;
  }

  public isPlaying(): boolean {
    return this.on;
  }

  public subscribe(fn: (playing: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    for (const fn of this.listeners) {
      try { fn(this.on); } catch {}
    }
  }
}

export const calmMusic = new CalmMusicEngine();
