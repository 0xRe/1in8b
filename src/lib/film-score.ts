import type { MUSIC_TRACKS } from './film-model';

/**
 * Generated soundtrack for life films: a soft chord pad, a broken-chord accompaniment and a
 * pentatonic melody seeded by the life, through a low-pass filter and a feedback echo. Notes are
 * scheduled ahead on the audio clock, so the score stays steady while the page draws frames.
 */
type Track = Exclude<typeof MUSIC_TRACKS[number], 'silent'>;
type Style = { bpm: number; chords: number[][]; scale: number[]; root: number; voice: OscillatorType; melodyEvery: number; brightness: number };
const STYLES: Record<Track, Style> = {
  // Chords are semitone offsets from the root; each lasts one bar of four beats.
  piano: { bpm: 72, root: 60, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], scale: [0, 2, 4, 7, 9], voice: 'triangle', melodyEvery: 2, brightness: 2600 },
  warm: { bpm: 64, root: 53, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [2, 5, 9, 12], [7, 11, 14, 17]], scale: [0, 2, 4, 7, 9], voice: 'sine', melodyEvery: 2, brightness: 1900 },
  rain: { bpm: 60, root: 57, chords: [[0, 3, 7], [-4, 0, 3], [-9, -5, 0], [-2, 2, 5]], scale: [0, 3, 5, 7, 10], voice: 'triangle', melodyEvery: 1, brightness: 2200 },
  hope: { bpm: 80, root: 62, chords: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]], scale: [0, 2, 4, 7, 9], voice: 'triangle', melodyEvery: 1, brightness: 3200 },
  night: { bpm: 56, root: 50, chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -2, 2]], scale: [0, 3, 5, 7, 10], voice: 'sine', melodyEvery: 2, brightness: 1500 },
};
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export function startFilmScore(audio: BaseAudioContext, output: AudioNode, track: Track, seed: number, seconds: number, start = audio.currentTime + 0.05): () => void {
  const style = STYLES[track] ?? STYLES.piano, beat = 60 / style.bpm, bar = beat * 4, end = start + seconds;
  const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = style.brightness; filter.Q.value = 0.4;
  const master = audio.createGain(), level = 3.6, limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -12; limiter.knee.value = 8; limiter.ratio.value = 4; limiter.attack.value = 0.005; limiter.release.value = 0.25;
  // Fade in over two seconds and out over the last three, so cuts never click; the limiter keeps
  // the louder level (phone speakers) from clipping where chord and melody coincide.
  master.gain.setValueAtTime(0, start); master.gain.linearRampToValueAtTime(level, start + 2);
  master.gain.setValueAtTime(level, Math.max(start + 2, end - 3)); master.gain.linearRampToValueAtTime(0, end);
  const delay = audio.createDelay(2), feedback = audio.createGain(), wet = audio.createGain();
  delay.delayTime.value = beat * 0.75; feedback.gain.value = 0.32; wet.gain.value = 0.28;
  filter.connect(master); master.connect(limiter); limiter.connect(output);
  filter.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(master);
  let rand = (seed >>> 0) || 1;
  const next = () => { rand = (Math.imul(rand, 1664525) + 1013904223) >>> 0; return rand / 4294967296; };
  const note = (midi: number, at: number, length: number, level: number, type: OscillatorType, attack: number) => {
    if (at >= end) return;
    const osc = audio.createOscillator(), gain = audio.createGain(), stop = Math.min(end, at + length + 0.05);
    osc.type = type; osc.frequency.value = hz(midi);
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0008, Math.max(at + attack + 0.01, stop));
    osc.connect(gain); gain.connect(filter); osc.start(at); osc.stop(stop + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  };
  let scheduled = start, barIndex = 0, degree = 2;
  const schedule = (horizon: number) => {
    while (scheduled < Math.min(end, horizon)) {
      const chord = style.chords[barIndex % style.chords.length].map(n => n + style.root);
      // Pad: the whole chord, slow attack, held for the bar.
      for (const n of chord) note(n - 12, scheduled, bar * 1.05, 0.035, 'sine', bar * 0.3);
      note(chord[0] - 24, scheduled, bar, 0.06, 'sine', 0.08);
      // Broken chord in eighths, softer on the off-beats.
      for (let i = 0; i < 8; i++) note(chord[[0, 1, 2, 1, 0, 2, 1, 2][i] % chord.length], scheduled + i * beat / 2, beat * 1.2, i % 2 ? 0.022 : 0.034, style.voice, 0.012);
      // Melody: a stepwise walk over the pentatonic scale, a few notes a bar.
      if (barIndex % style.melodyEvery === 0 || next() < 0.35) for (const at of [0, 1.5, 2, 3]) {
        if (next() < 0.3) continue;
        degree = Math.max(0, Math.min(9, degree + [-1, 0, 1, 1, -1, 2, -2][Math.floor(next() * 7)]));
        const octave = Math.floor(degree / 5), midi = style.root + 12 + style.scale[degree % 5] + octave * 12;
        note(midi, scheduled + at * beat, beat * 1.6, 0.05, 'sine', 0.02);
        note(midi + 12, scheduled + at * beat, beat * 0.8, 0.012, 'triangle', 0.01);
      }
      scheduled += bar; barIndex++;
    }
  };
  // Offline rendering (tests) has no wall clock to wait for: schedule the whole piece at once.
  schedule('startRendering' in audio ? end : audio.currentTime + 4);
  const timer = setInterval(() => schedule(audio.currentTime + 4), 1000);
  return () => { clearInterval(timer); try { master.gain.cancelScheduledValues(audio.currentTime); master.gain.setValueAtTime(0, audio.currentTime); } catch { /* The context may already be closed. */ } };
}
