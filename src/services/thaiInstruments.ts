import { ThaiScale } from '../types';

// Thai 7-TET frequencies (7 equidistant intervals per octave)
// Interval ratio = 2^(1/7) ≈ 1.1040895 (approx 171.43 cents)
const BASE_FREQ_7TET = 261.63; // C4 as base
export const THAI_7TET_NOTES = [
  { name: 'ด', solfege: 'Do', freq: BASE_FREQ_7TET * Math.pow(2, 0 / 7), label: 'ด (C)' },
  { name: 'ร', solfege: 'Re', freq: BASE_FREQ_7TET * Math.pow(2, 1 / 7), label: 'ร' },
  { name: 'ม', solfege: 'Mi', freq: BASE_FREQ_7TET * Math.pow(2, 2 / 7), label: 'ม' },
  { name: 'ฟ', solfege: 'Fa', freq: BASE_FREQ_7TET * Math.pow(2, 3 / 7), label: 'ฟ' },
  { name: 'ซ', solfege: 'Sol', freq: BASE_FREQ_7TET * Math.pow(2, 4 / 7), label: 'ซ' },
  { name: 'ล', solfege: 'La', freq: BASE_FREQ_7TET * Math.pow(2, 5 / 7), label: 'ล' },
  { name: 'ท', solfege: 'Ti', freq: BASE_FREQ_7TET * Math.pow(2, 6 / 7), label: 'ท' },
  // Second octave
  { name: 'ดํ', solfege: 'Do+', freq: BASE_FREQ_7TET * Math.pow(2, 7 / 7), label: 'ดํ (C5)' },
  { name: 'รํ', solfege: 'Re+', freq: BASE_FREQ_7TET * Math.pow(2, 8 / 7), label: 'รํ' },
  { name: 'มํ', solfege: 'Mi+', freq: BASE_FREQ_7TET * Math.pow(2, 9 / 7), label: 'มํ' },
  { name: 'ฟํ', solfege: 'Fa+', freq: BASE_FREQ_7TET * Math.pow(2, 10 / 7), label: 'ฟํ' },
  { name: 'ซํ', solfege: 'Sol+', freq: BASE_FREQ_7TET * Math.pow(2, 11 / 7), label: 'ซํ' },
  { name: 'ลํ', solfege: 'La+', freq: BASE_FREQ_7TET * Math.pow(2, 12 / 7), label: 'ลํ' },
  { name: 'ทํ', solfege: 'Ti+', freq: BASE_FREQ_7TET * Math.pow(2, 13 / 7), label: 'ทํ' },
];

// Pentatonic notes (Do, Re, Mi, Sol, La)
export const THAI_PENTATONIC_NOTES = [
  { name: 'ด', solfege: 'Do', freq: 261.63, label: 'ด (C4)' },
  { name: 'ร', solfege: 'Re', freq: 293.66, label: 'ร (D4)' },
  { name: 'ม', solfege: 'Mi', freq: 329.63, label: 'ม (E4)' },
  { name: 'ซ', solfege: 'Sol', freq: 392.00, label: 'ซ (G4)' },
  { name: 'ล', solfege: 'La', freq: 440.00, label: 'ล (A4)' },
  { name: 'ดํ', solfege: 'Do+', freq: 523.25, label: 'ดํ (C5)' },
  { name: 'รํ', solfege: 'Re+', freq: 587.33, label: 'รํ (D5)' },
  { name: 'มํ', solfege: 'Mi+', freq: 659.25, label: 'มํ (E5)' },
  { name: 'ซํ', solfege: 'Sol+', freq: 783.99, label: 'ซํ (G5)' },
  { name: 'ลํ', solfege: 'La+', freq: 880.00, label: 'ลํ (A5)' },
  { name: 'ดํํ', solfege: 'Do++', freq: 1046.50, label: 'ดํํ (C6)' },
  { name: 'รํํ', solfege: 'Re++', freq: 1174.66, label: 'รํํ (D6)' },
  { name: 'มํํ', solfege: 'Mi++', freq: 1318.51, label: 'มํํ (E6)' },
  { name: 'ซํํ', solfege: 'Sol++', freq: 1567.98, label: 'ซํํ (G6)' },
];

export function getScaleNotes(scale: ThaiScale) {
  return scale === 'thai7tet' ? THAI_7TET_NOTES : THAI_PENTATONIC_NOTES;
}

// Generate Temple Sala Reverb Impulse Response
export function createThaiTempleReverbBuffer(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = rate * 2.5; // 2.5 seconds decay
  const impulse = ctx.createBuffer(2, length, rate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const decay = Math.exp(-i / (rate * 0.7));
    // Warm reflections with slight early diffusion
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
  }
  return impulse;
}

/**
 * Synthesize authentic Thai traditional instruments using Web Audio API nodes
 */
export function playThaiInstrument(
  ctx: AudioContext | OfflineAudioContext,
  instrumentId: string,
  noteIndex: number,
  time: number,
  scale: ThaiScale = 'thai7tet',
  destination: AudioNode,
  volume: number = 0.8
) {
  const notes = getScaleNotes(scale);
  const note = notes[Math.min(noteIndex, notes.length - 1)] || notes[0];
  const freq = note.freq;

  switch (instrumentId) {
    case 'ranat-ek':
      playRanatEk(ctx, freq, time, destination, volume);
      break;
    case 'ranat-thum':
      playRanatThum(ctx, freq * 0.5, time, destination, volume); // lower octave
      break;
    case 'khong-wong':
      playKhongWong(ctx, freq, time, destination, volume);
      break;
    case 'saw-duang':
      playSawDuang(ctx, freq, time, destination, volume);
      break;
    case 'khlui':
      playKhlui(ctx, freq, time, destination, volume);
      break;
    case 'ching-chap':
      playChingChap(ctx, noteIndex, time, destination, volume);
      break;
    case 'taphon':
      playTaphon(ctx, noteIndex, time, destination, volume);
      break;
    case 'klong-khaek':
      playKlongKhaek(ctx, noteIndex, time, destination, volume);
      break;
    default:
      playRanatEk(ctx, freq, time, destination, volume);
  }
}

// 1. Ranat Ek (ระนาดเอก) - Wooden bar strike with harmonic partials
function playRanatEk(
  ctx: BaseAudioContext,
  freq: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol * 0.9, time + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
  gain.connect(destination);

  // Fundamental wooden bar resonance
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, time);

  // Inharmonic bar overtone (~2.75x fundamental)
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2.756, time);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(vol * 0.35, time);
  gain2.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
  osc2.connect(gain2);
  gain2.connect(gain);

  // Click transient (mallet impact)
  const clickOsc = ctx.createOscillator();
  clickOsc.type = 'triangle';
  clickOsc.frequency.setValueAtTime(freq * 5.2, time);
  clickOsc.frequency.exponentialRampToValueAtTime(100, time + 0.02);

  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(vol * 0.4, time);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
  clickOsc.connect(clickGain);
  clickGain.connect(gain);

  osc1.connect(gain);

  osc1.start(time);
  osc2.start(time);
  clickOsc.start(time);

  osc1.stop(time + 0.5);
  osc2.stop(time + 0.2);
  clickOsc.stop(time + 0.03);
}

// 2. Ranat Thum (ระนาดทุ้ม) - Deep, warm bamboo xylophone
function playRanatThum(
  ctx: BaseAudioContext,
  freq: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol * 1.0, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.65);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(750, time);
  filter.connect(destination);
  gain.connect(filter);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(freq * 0.5, time);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(vol * 0.5, time);
  subGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);

  osc.connect(gain);
  sub.connect(subGain);
  subGain.connect(gain);

  osc.start(time);
  sub.start(time);
  osc.stop(time + 0.7);
  sub.stop(time + 0.7);
}

// 3. Khong Wong Yai (ฆ้องวงใหญ่) - Bronze gong circle with warm metallic sustain
function playKhongWong(
  ctx: BaseAudioContext,
  freq: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol * 0.85, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.4);
  gain.connect(destination);

  // FM synthesis for bell / bronze kettle resonance
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(freq, time);

  const modulator = ctx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(freq * 1.414, time);

  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(freq * 0.8, time);
  modGain.gain.exponentialRampToValueAtTime(1, time + 0.6);

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  // Subtle second bronze partial
  const partial = ctx.createOscillator();
  partial.type = 'sine';
  partial.frequency.setValueAtTime(freq * 2.01, time);
  const partGain = ctx.createGain();
  partGain.gain.setValueAtTime(vol * 0.25, time);
  partGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.8);
  partial.connect(partGain);
  partGain.connect(gain);

  carrier.connect(gain);

  modulator.start(time);
  carrier.start(time);
  partial.start(time);

  modulator.stop(time + 1.5);
  carrier.stop(time + 1.5);
  partial.stop(time + 0.9);
}

// 4. Saw Duang (ซอดวง) - Traditional bowed silk fiddle
function playSawDuang(
  ctx: BaseAudioContext,
  freq: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const duration = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol * 0.7, time + 0.06); // Bow attack
  gain.gain.setValueAtTime(vol * 0.7, time + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0.0001, time + duration);

  // Formant filter (bamboo resonator body)
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1450, time);
  filter.Q.setValueAtTime(3.5, time);

  gain.connect(filter);
  filter.connect(destination);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);

  // Natural vibrato LFO (5.5 Hz)
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(5.5, time);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(freq * 0.02, time);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  osc.connect(gain);

  lfo.start(time);
  osc.start(time);
  lfo.stop(time + duration + 0.1);
  osc.stop(time + duration + 0.1);
}

// 5. Khlui Phiang Aw (ขลุ่ยเพียงออ) - Breathy bamboo flute
function playKhlui(
  ctx: BaseAudioContext,
  freq: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const duration = 0.55;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol * 0.75, time + 0.07);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  gain.connect(destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 0.98, time); // slight expressive bend
  osc.frequency.linearRampToValueAtTime(freq, time + 0.05);

  // Gentle breath vibrato
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(4.8, time);
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(freq * 0.015, time);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  // Harmonic overtone
  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 2, time);
  const osc2Gain = ctx.createGain();
  osc2Gain.gain.setValueAtTime(vol * 0.15, time);
  osc2Gain.connect(gain);
  osc2.connect(osc2Gain);

  osc.connect(gain);

  lfo.start(time);
  osc.start(time);
  osc2.start(time);

  lfo.stop(time + duration);
  osc.stop(time + duration);
  osc2.stop(time + duration);
}

// 6. Ching & Chap (ฉิ่ง - ฉาบ) - Metronome cymbals
// Even step = Ching (open ring), Odd step = Chap (damped cut)
function playChingChap(
  ctx: BaseAudioContext,
  stepOrNote: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const isChing = stepOrNote % 2 === 0;

  if (isChing) {
    // Ching: high sustained chime
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * 0.8, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 2.0); // long ringing
    gain.connect(destination);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(3480, time);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(7120, time);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(vol * 0.4, time);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);

    osc1.connect(gain);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 2.1);
    osc2.stop(time + 2.1);
  } else {
    // Chap: damped metallic slap
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * 0.9, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    gain.connect(destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, time);
    filter.connect(gain);

    // Filtered noise pulse
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(3200, time);
    osc.connect(filter);

    osc.start(time);
    osc.stop(time + 0.14);
  }
}

// 7. Taphon (ตะโพน) - Sacred double-headed drum
function playTaphon(
  ctx: BaseAudioContext,
  noteIndex: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const isThep = noteIndex % 2 === 0; // Thep (deep center boom) vs Phrom (rim slap)
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol * 1.0, time + 0.004);

  const osc = ctx.createOscillator();

  if (isThep) {
    // Deep pitch drop: 110Hz down to 55Hz
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(55, time + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);
  } else {
    // High head rim slap: 210Hz down to 110Hz
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
  }

  osc.connect(gain);
  gain.connect(destination);

  osc.start(time);
  osc.stop(time + 0.6);
}

// 8. Klong Khaek (กลองแขก) - High & Low rhythmic drums
function playKlongKhaek(
  ctx: BaseAudioContext,
  noteIndex: number,
  time: number,
  destination: AudioNode,
  vol: number
) {
  const isTuaPhu = noteIndex % 2 === 0; // Male (high sharp) vs Female (low bounce)
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol * 0.9, time + 0.003);

  const osc = ctx.createOscillator();
  if (isTuaPhu) {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, time);
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  } else {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(75, time + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
  }

  osc.connect(gain);
  gain.connect(destination);

  osc.start(time);
  osc.stop(time + 0.4);
}
