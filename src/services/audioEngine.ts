import { SongProject } from '../types';
import {
  createThaiTempleReverbBuffer,
  playThaiInstrument,
} from './thaiInstruments';

class ThaiAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Playback scheduler state
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  private timerId: number | null = null;
  private nextStepTime: number = 0;
  private onStepCallback: ((step: number) => void) | null = null;
  private onStopCallback: (() => void) | null = null;
  private attachedAudioBuffer: AudioBuffer | null = null;
  private attachedAudioSource: AudioBufferSourceNode | null = null;

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      // Temple Reverb setup
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = createThaiTempleReverbBuffer(this.ctx);

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      // Connect dry + wet paths to master
      this.dryGain.connect(this.masterGain);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getContext(): AudioContext {
    this.init();
    return this.ctx!;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // Play a single note immediately (e.g. from the Instrument Pad / Keyboard)
  public playNote(
    instrumentId: string,
    noteIndex: number,
    scale: 'thai7tet' | 'pentatonic' = 'thai7tet',
    volume: number = 0.85
  ) {
    this.init();
    const ctx = this.ctx!;
    const now = ctx.currentTime;

    // Send part to dry and part to reverb
    const instBus = ctx.createGain();
    instBus.gain.setValueAtTime(volume, now);

    instBus.connect(this.dryGain!);
    instBus.connect(this.reverbNode!);

    playThaiInstrument(ctx, instrumentId, noteIndex, now, scale, instBus, 1.0);
  }

  // Set temple reverb level (0 = dry, 1 = deep temple hall)
  public setReverbWet(amount: number) {
    if (this.reverbGain && this.dryGain && this.ctx) {
      const wet = Math.min(Math.max(amount, 0), 1);
      this.reverbGain.gain.setTargetAtTime(wet * 0.7, this.ctx.currentTime, 0.05);
      this.dryGain.gain.setTargetAtTime(1.0 - wet * 0.3, this.ctx.currentTime, 0.05);
    }
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  // Start sequencer playback
  public startSequencer(
    song: SongProject,
    onStep: (step: number) => void,
    onStop: () => void,
    attachedAudioBlob?: Blob
  ) {
    this.init();
    this.stopSequencer();

    this.isPlaying = true;
    this.currentStep = 0;
    this.onStepCallback = onStep;
    this.onStopCallback = onStop;

    const ctx = this.ctx!;
    this.nextStepTime = ctx.currentTime + 0.05;

    // If there is an attached vocal TTS audio, decode and play it in sync
    if (attachedAudioBlob) {
      attachedAudioBlob.arrayBuffer().then((buffer) => {
        ctx.decodeAudioData(
          buffer,
          (decoded) => {
            if (!this.isPlaying) return;
            this.attachedAudioBuffer = decoded;
            this.attachedAudioSource = ctx.createBufferSource();
            this.attachedAudioSource.buffer = decoded;
            this.attachedAudioSource.connect(this.dryGain!);
            this.attachedAudioSource.start(this.nextStepTime);
          },
          (err) => console.warn('Could not decode attached vocal audio', err)
        );
      });
    }

    this.scheduleLoop(song);
  }

  private scheduleLoop(song: SongProject) {
    if (!this.isPlaying || !this.ctx) return;

    const lookAheadMs = 25;
    const scheduleWindowSec = 0.1;
    // 16th note step duration in seconds
    // BPM = quarter notes per minute => step = 60 / (BPM * 4)
    const stepDuration = 60 / (song.bpm * 4);

    while (this.nextStepTime < this.ctx.currentTime + scheduleWindowSec) {
      this.scheduleStep(this.currentStep, this.nextStepTime, song);
      this.currentStep = (this.currentStep + 1) % song.stepsCount;
      this.nextStepTime += stepDuration;
    }

    this.timerId = window.setTimeout(() => this.scheduleLoop(song), lookAheadMs);
  }

  private scheduleStep(step: number, time: number, song: SongProject) {
    if (!this.ctx) return;

    // Update UI step callback synchronously or via requestAnimationFrame
    window.requestAnimationFrame(() => {
      if (this.isPlaying && this.onStepCallback) {
        this.onStepCallback(step);
      }
    });

    // Check if any solo tracks exist
    const hasSolo = song.tracks.some((t) => t.solo);

    for (const track of song.tracks) {
      if (track.muted) continue;
      if (hasSolo && !track.solo) continue;

      const noteIndex = track.steps[step];
      if (noteIndex !== null && noteIndex !== undefined) {
        const trackGain = this.ctx.createGain();
        trackGain.gain.setValueAtTime(track.volume, time);

        // Stereo Panning
        if (this.ctx.createStereoPanner) {
          const panner = this.ctx.createStereoPanner();
          panner.pan.setValueAtTime(track.pan, time);
          trackGain.connect(panner);
          panner.connect(this.dryGain!);
          panner.connect(this.reverbNode!);
        } else {
          trackGain.connect(this.dryGain!);
          trackGain.connect(this.reverbNode!);
        }

        playThaiInstrument(
          this.ctx,
          track.id,
          noteIndex,
          time,
          song.scale,
          trackGain,
          1.0
        );
      }
    }
  }

  public stopSequencer() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.attachedAudioSource) {
      try {
        this.attachedAudioSource.stop();
        this.attachedAudioSource.disconnect();
      } catch {}
      this.attachedAudioSource = null;
    }
    if (this.onStopCallback) {
      this.onStopCallback();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * High-Quality Studio Export:
   * Renders the entire Thai music arrangement + attached vocals to a 48kHz WAV audio file
   * using OfflineAudioContext.
   */
  public async renderSongToWavBlob(
    song: SongProject,
    repeatCycles: number = 2,
    attachedAudioBlob?: Blob
  ): Promise<Blob> {
    const sampleRate = 48000;
    const stepDuration = 60 / (song.bpm * 4);
    const totalSteps = song.stepsCount * repeatCycles;
    const totalDuration = totalSteps * stepDuration + 2.5; // tail reverb decay

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    // Offline Reverb setup
    const offlineReverb = offlineCtx.createConvolver();
    offlineReverb.buffer = createThaiTempleReverbBuffer(offlineCtx);

    const offlineReverbGain = offlineCtx.createGain();
    const wet = song.reverbWet ?? 0.35;
    offlineReverbGain.gain.setValueAtTime(wet * 0.7, 0);

    const offlineDryGain = offlineCtx.createGain();
    offlineDryGain.gain.setValueAtTime(1.0 - wet * 0.25, 0);

    offlineDryGain.connect(offlineCtx.destination);
    offlineReverb.connect(offlineReverbGain);
    offlineReverbGain.connect(offlineCtx.destination);

    // Schedule attached vocal track if present
    if (attachedAudioBlob) {
      try {
        const rawArrayBuffer = await attachedAudioBlob.arrayBuffer();
        const decoded = await offlineCtx.decodeAudioData(rawArrayBuffer);
        const vocalSource = offlineCtx.createBufferSource();
        vocalSource.buffer = decoded;
        vocalSource.connect(offlineDryGain);
        vocalSource.start(0.1);
      } catch (err) {
        console.warn('Could not render attached vocal audio in offline mix', err);
      }
    }

    const hasSolo = song.tracks.some((t) => t.solo);

    for (let cycle = 0; cycle < repeatCycles; cycle++) {
      for (let s = 0; s < song.stepsCount; s++) {
        const stepTime = (cycle * song.stepsCount + s) * stepDuration;

        for (const track of song.tracks) {
          if (track.muted) continue;
          if (hasSolo && !track.solo) continue;

          const noteIndex = track.steps[s];
          if (noteIndex !== null && noteIndex !== undefined) {
            const trackGain = offlineCtx.createGain();
            trackGain.gain.setValueAtTime(track.volume, stepTime);

            trackGain.connect(offlineDryGain);
            trackGain.connect(offlineReverb);

            playThaiInstrument(
              offlineCtx,
              track.id,
              noteIndex,
              stepTime,
              song.scale,
              trackGain,
              1.0
            );
          }
        }
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWavBlob(renderedBuffer);
  }
}

// Convert AudioBuffer to 16-bit PCM WAV Blob with full standard RIFF header
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;
  const numSamples = left.length;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const totalSize = 36 + dataSize;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp between -1 and 1
    const sL = Math.max(-1, Math.min(1, left[i]));
    view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7fff, true);
    offset += 2;

    if (numChannels > 1) {
      const sR = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(offset, sR < 0 ? sR * 0x8000 : sR * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const thaiAudioEngine = new ThaiAudioEngine();
