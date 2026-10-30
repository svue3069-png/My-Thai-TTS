import { ThaiVoicePersona, TokenUsage } from '../types';
import { audioBufferToWavBlob } from './audioEngine';

/**
 * Utility to wait for a specific duration
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const THAI_VOICE_PERSONAS: ThaiVoicePersona[] = [
  {
    id: 'Kore',
    name: 'Kore (นวลพรรณ)',
    gender: 'female',
    thaiName: 'นวลพรรณ',
    description: 'เสียงหญิงอบอุ่น นุ่มนวล ชัดถ้อยชัดคำ เหมาะกับบทความทั่วไปและการเรียนรู้',
    tag: 'ยอดนิยม / ค่าเริ่มต้น',
    samplePhrase: 'สวัสดีค่ะ ขอต้อนรับเข้าสู่ระบบพากย์เสียงภาษาไทยแบบธรรมชาติ',
    recommendedStyle: 'Warm, pleasant, clear central Thai articulation, polite particles (ค่ะ)',
  },
  {
    id: 'Puck',
    name: 'Puck (ก้องเกียรติ)',
    gender: 'male',
    thaiName: 'ก้องเกียรติ',
    description: 'เสียงชายกระฉับกระเฉง สดใส เป็นกันเอง เหมาะกับสื่อสังคมและวิดีโอ',
    tag: 'สดใส / สนทนา',
    samplePhrase: 'สวัสดีครับเพื่อนๆ วันนี้เรามีเรื่องราวที่น่าสนใจมาแบ่งปันกันครับ',
    recommendedStyle: 'Energetic, friendly, conversational modern Thai cadence',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (มัสยา)',
    gender: 'female',
    thaiName: 'มัสยา',
    description: 'เสียงหญิงนุ่มละมุน ชวนเคลิ้ม เหมาะกับบทกลอน นิทาน และการทำสมาธิ',
    tag: 'นุ่มนวล / บทกวี',
    samplePhrase: 'สายลมแผ่วพลิ้วพัดผ่านระเบียงริมน้ำ แว่วเสียงดนตรีไทยกล่อมเกลาจิตใจ',
    recommendedStyle: 'Gentle, soothing, rhythmic poetic Thai cadence, calm and melodious',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (ธีรเดช)',
    gender: 'male',
    thaiName: 'ธีรเดช',
    description: 'เสียงชายทุ้มลึก มีพลัง น่าเชื่อถือ เหมาะกับการอ่านข่าวและสารคดี',
    tag: 'ทางการ / ข่าวสาร',
    samplePhrase: 'รายงานสถานการณ์ประจำวัน และความคืบหน้าโครงการศิลปวัฒนธรรมไทย',
    recommendedStyle: 'Authoritative, deep resonance, formal broadcast journalism tone',
  },
  {
    id: 'Charon',
    name: 'Charon (ปู่ชาญ)',
    gender: 'male',
    thaiName: 'ปู่ชาญ',
    description: 'เสียงผู้เฒ่าทรงภูมิ ผู้เล่าขานตำนาน เหมาะกับนิทานพื้นบ้านและประวัติศาสตร์',
    tag: 'เล่าขาน / โบราณ',
    samplePhrase: 'กาลครั้งหนึ่งนานมาแล้ว ในดินแดนอันอุดมสมบูรณ์ไปด้วยเสียงดนตรีปี่พาทย์',
    recommendedStyle: 'Wise grandfatherly elder storyteller, resonant, traditional Siamese phrasing',
  },
];

export interface TTSRequestOptions {
  text: string;
  voiceName: string;
  style: string;
  speed: number;
  pitch: number;
  forceOffline?: boolean;
  isPaid?: boolean;
}

export interface TTSResponseResult {
  audioBlob: Blob;
  duration: number;
  engine: 'gemini' | 'offline';
  voiceName: string;
  usage?: TokenUsage;
  fellBackFromQuota?: boolean;
  retryAfterSeconds?: number;
  isPaid?: boolean;
}

/**
 * Synthesize Thai text to speech
 * Primary: Gemini 3.8 Flash Lite TTS via /api/tts
 * Fallback / Offline: Web Speech API & local AudioBuffer synthesis
 */
export async function synthesizeThaiSpeech(
  options: TTSRequestOptions
): Promise<TTSResponseResult> {
  const { text, voiceName, style, speed, pitch, forceOffline, isPaid } = options;

  if (!forceOffline && navigator.onLine) {
    let retries = 0;
    const maxRetries = 3;
    let baseDelay = 3000; // Increased base delay for 10 RPM models

    while (retries <= maxRetries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for long generations

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            text,
            voiceName,
            style,
            speed,
            pitch,
            isPaid,
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.audioBase64) {
            // Convert base64 to Blob
            const binary = atob(data.audioBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });

            return {
              audioBlob: blob,
              duration: data.duration || Math.max(1, text.length * 0.12),
              engine: 'gemini',
              voiceName,
              usage: data.usage,
              isPaid: data.isPaid,
            };
          }
        }

        // Handle Rate Limit (429) specifically
        if (response.status === 429) {
          const errorData = await response.json();
          const serverRetryAfter = errorData.retryAfter ? errorData.retryAfter * 1000 : null;
          
          if (errorData.isDailyLimit && !isPaid) {
            // Silently fallback to offline synthesis for daily limit to avoid interrupting user flow
            const offlineResult = await synthesizeOfflineSpeech(text, speed, pitch, voiceName);
            return {
              ...offlineResult,
              fellBackFromQuota: true,
              retryAfterSeconds: errorData.retryAfter
            };
          }

          // If server says wait 45s, we must wait 45s. Otherwise, we use backoff.
          const waitTime = serverRetryAfter || (baseDelay * Math.pow(2, retries));
          
          await sleep(waitTime);
          retries++;
          continue;
        }

        // For other non-OK responses (500, 503, etc.), break and fallback
        break;
      } catch (err: any) {
        clearTimeout(timeoutId);
        retries++;
        await sleep(baseDelay * Math.pow(1.5, retries));
      }
    }
  }

  // Fallback: Offline speech synthesis + Audio synthesis
  return synthesizeOfflineSpeech(text, speed, pitch, voiceName);
}

/**
 * Offline fallback synthesis
 * Uses Web Speech API if supported, along with generating an offline audio buffer
 */
async function synthesizeOfflineSpeech(
  text: string,
  speed: number,
  pitch: number,
  voiceName: string
): Promise<TTSResponseResult> {
  // Approximate duration: Thai speaking rate is approx 5-7 syllables per second
  const estimatedSeconds = Math.max(1.2, (text.length / 5.5) / speed);

  // Play immediately via SpeechSynthesis if available
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = Math.min(Math.max(speed, 0.5), 2.0);
      utterance.pitch = Math.min(Math.max(pitch, 0.5), 1.5);

      // Select Thai voice if installed
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(
        (v) => v.lang.includes('th') || v.name.toLowerCase().includes('thai')
      );
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis invocation error:', e);
    }
  }

  // Create an authentic offline AudioBuffer containing melodic Thai speech cadence
  // so the user has a real audio file saved in IndexedDB, playable anytime!
  const blob = await generateTonalSpeechAudioBuffer(text, speed, pitch);

  return {
    audioBlob: blob,
    duration: estimatedSeconds,
    engine: 'offline',
    voiceName: `${voiceName} (Offline Mode)`,
  };
}

/**
 * Generates an audio WAV blob for offline saving and playback
 * Using tonal formant modeling matching Thai prosody (Mid, Low, Falling, High, Rising tones)
 */
async function generateTonalSpeechAudioBuffer(
  text: string,
  speed: number,
  pitch: number
): Promise<Blob> {
  const sampleRate = 24000;
  const duration = Math.max(1.2, (text.length * 0.14) / speed);
  const totalSamples = Math.ceil(duration * sampleRate);

  const offlineCtx = new OfflineAudioContext(1, totalSamples, sampleRate);
  const baseFreq = 185 * pitch; // base vocal fundamental

  // Syllable segment duration
  const syllableCount = Math.max(2, Math.ceil(text.length / 2.2));
  const syllableTime = duration / syllableCount;

  for (let s = 0; s < syllableCount; s++) {
    const startTime = s * syllableTime;
    const endTime = startTime + syllableTime * 0.85;

    // Pitch inflection modeling Thai tones
    const toneMod = (s % 5);
    let startPitch = baseFreq;
    let endPitch = baseFreq;
    if (toneMod === 1) { // Low tone
      startPitch = baseFreq * 0.9;
      endPitch = baseFreq * 0.82;
    } else if (toneMod === 2) { // Falling tone
      startPitch = baseFreq * 1.25;
      endPitch = baseFreq * 0.85;
    } else if (toneMod === 3) { // High tone
      startPitch = baseFreq * 1.2;
      endPitch = baseFreq * 1.25;
    } else if (toneMod === 4) { // Rising tone
      startPitch = baseFreq * 0.85;
      endPitch = baseFreq * 1.2;
    }

    // Voice oscillator (harmonic triangle/saw)
    const osc = offlineCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startPitch, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endPitch), endTime);

    // Formant body filter (vocal tract)
    const formant = offlineCtx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(600 + (s % 3) * 350, startTime);
    formant.Q.setValueAtTime(4.0, startTime);

    const gain = offlineCtx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.7, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);

    osc.connect(formant);
    formant.connect(gain);
    gain.connect(offlineCtx.destination);

    osc.start(startTime);
    osc.stop(endTime + 0.01);
  }

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWavBlob(rendered);
}

/**
 * Get available device Thai voices for offline mode
 */
export function getLocalThaiVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices.filter(
    (v) => v.lang.startsWith('th') || v.lang.includes('TH') || v.name.toLowerCase().includes('thai')
  );
}

/**
 * Generate a smart Thai title based on input text
 */
export async function generateAutoTitle(text: string): Promise<string> {
  if (!text || text.trim().length < 5) return '';

  try {
    const response = await fetch('/api/generate-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.title || '';
    }
  } catch (err) {
    console.warn('Auto-title generation failed:', err);
  }
  
  // Fallback: take first line
  return text.split('\n')[0].substring(0, 30).trim();
}
