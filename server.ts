import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize Google GenAI client if API key is provided
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// TTS Endpoint using Gemini 3.8 Flash Lite TTS
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      style = 'Natural, pleasant, standard central Thai pronunciation with warm polite cadence',
      speed = 1.0,
      pitch = 1.0,
      isPaid = false,
    } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key is not configured on the server',
        fallback: 'offline',
      });
    }

    // Use gemini-1.5-flash for paid requests as it has higher stability and limits
    const modelName = isPaid ? 'gemini-1.5-flash' : 'gemini-3.8-flash-lite-tts';

    // Prepare speech prompt with specific Thai pronunciation and tonality cues
    const promptText = `Speak the following Thai text with natural central Thai articulation and perfect tonality: "${text}"`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText,
              speechMetadata: {
                style: `${style}. Use a ${speed >= 1.2 ? 'slightly fast' : speed <= 0.8 ? 'slow' : 'natural'} pace. Tone should be ${pitch > 1.1 ? 'higher' : pitch < 0.9 ? 'deeper' : 'standard'}. Ensure all Thai vowels and tone marks are pronounced clearly and naturally.`,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || 'Kore', // 'Kore', 'Puck', 'Fenrir', 'Zephyr', 'Charon'
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(
      (part: any) => part.inlineData && part.inlineData.data
    );

    if (!audioPart || !audioPart.inlineData?.data) {
      return res.status(500).json({
        error: 'No audio returned from speech synthesis model',
        fallback: 'offline',
      });
    }

    const base64Audio = audioPart.inlineData.data;
    const mimeType = audioPart.inlineData.mimeType || 'audio/wav';

    // Estimate duration based on WAV size (24kHz, 16-bit mono = 48000 bytes/sec)
    const audioByteLength = Buffer.from(base64Audio, 'base64').length;
    const estimatedSeconds = Math.max(0.5, (audioByteLength - 44) / 48000);

    // Extract token usage metadata from Gemini API response
    const usageMeta = (response as any).usageMetadata || {};
    const promptTokens = usageMeta.promptTokenCount ?? Math.max(1, Math.ceil(text.length * 0.9) + 12);
    const candidateTokens = usageMeta.candidatesTokenCount ?? Math.max(1, Math.ceil(estimatedSeconds * 50));
    const totalTokens = usageMeta.totalTokenCount ?? (promptTokens + candidateTokens);

    return res.json({
      audioBase64: base64Audio,
      mimeType,
      duration: estimatedSeconds,
      voiceName,
      model: modelName,
      usage: {
        promptTokenCount: promptTokens,
        candidatesTokenCount: candidateTokens,
        totalTokenCount: totalTokens,
      },
      isPaid,
      freeTierLimits: {
        rpm: 15,
        rpd: 1500,
        tpm: 1000000,
        tier: isPaid ? 'Paid Tier (Usage Based)' : 'Free Tier (Google AI Studio)',
      },
    });
  } catch (error: any) {
    console.error('Error generating speech:', error);
    
    // Check if it's a rate limit error from Gemini
    const isRateLimit = error?.status === 429 || 
                       (error?.message && error.message.includes('429')) || 
                       (error?.response?.status === 429) ||
                       error?.statusText === 'Too Many Requests';

    if (isRateLimit) {
      // Try to extract retry delay if possible from the error message or structured details
      let retryAfter = 60; // Default to 60s
      let isDailyLimit = false;

      try {
        const errorText = error?.message || '';
        // Check for daily quota exhaustion specifically
        if (errorText.includes('per_day') || errorText.includes('RequestsPerDay')) {
          isDailyLimit = true;
        }

        // Look for "retry in X.Xs" or "retry in XhXmXs" or similar patterns
        const matchSec = errorText.match(/retry in ([\d.]+)s/i);
        const matchHMS = errorText.match(/retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);

        if (matchSec && matchSec[1]) {
          retryAfter = Math.ceil(parseFloat(matchSec[1]));
        } else if (matchHMS && (matchHMS[1] || matchHMS[2] || matchHMS[3])) {
          const h = parseInt(matchHMS[1] || '0');
          const m = parseInt(matchHMS[2] || '0');
          const s = parseFloat(matchHMS[3] || '0');
          retryAfter = h * 3600 + m * 60 + Math.ceil(s);
          if (h > 0) isDailyLimit = true;
        } else if (error?.details) {
          // Check for structured RetryInfo if present
          const retryInfo = error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
          if (retryInfo?.retryDelay?.seconds) {
            retryAfter = parseInt(retryInfo.retryDelay.seconds);
          }
        }
      } catch (e) {
        console.warn('Failed to parse retryAfter from error', e);
      }

      return res.status(429).json({
        error: isDailyLimit ? 'Gemini API Daily Quota Exceeded (100 RPD)' : 'Gemini API Rate Limit Exceeded (10 RPM)',
        message: error?.message || 'Please wait before generating more audio',
        retryAfter: isDailyLimit ? retryAfter : Math.min(retryAfter, 120), // Only cap if it's RPM
        status: 'RESOURCE_EXHAUSTED',
        isDailyLimit,
        fallback: 'offline',
      });
    }

    return res.status(500).json({
      error: error?.message || 'Failed to synthesize speech',
      fallback: 'offline',
    });
  }
});

// Thai Song Lyrics & Arrangement Assistant
app.post('/api/thai-lyrics', async (req, res) => {
  try {
    const { theme = 'nature', style = 'Khamen Sai Yok classical' } = req.body;

    if (!ai) {
      // Provide authentic Thai song verses fallback
      return res.json({
        title: 'สายน้ำเจ้าพระยา (The River of Kings)',
        lyrics: `(เกริ่นร้อง) โอ้ละหนอ สายน้ำรินไหลผ่านคุ้งน้ำ\nแสงจันทร์งามสาดส่องลงท้องนภา\nยินเสียงระนาดเอกกังวานแว่วมา\nดังมนตราพาใจให้เคลิบเคลิ้มเอย`,
        tempoHint: 'Song-Chan (Medium tempo, 80 BPM)',
        suggestedInstruments: ['Ranat Ek', 'Saw Duang', 'Khong Wong Yai', 'Ching'],
        usage: {
          promptTokenCount: 65,
          candidatesTokenCount: 92,
          totalTokenCount: 157,
        },
      });
    }

    const prompt = `You are a master of traditional Thai classical music (ดนตรีไทยเดิม) and traditional poetry (กลอนสุภาพ, กาพย์, สักวา).
Generate a beautiful traditional Thai song verse or poetic chant based on the theme "${theme}" and style "${style}".
Return a JSON object with:
- title: string (Thai title and English translation)
- lyrics: string (Thai lyrics with 4 to 8 lines, including rhythmic singing cues like (เกริ่นร้อง), (เอื้อน), (ลูกคู่))
- tempoHint: string (e.g. "Song-Chan (จังหวะสองชั้น) 82 BPM")
- suggestedInstruments: string[] (traditional Thai instruments such as "Ranat Ek", "Khlui", "Saw Duang", "Khong Wong Yai", "Ching & Chap")
- translation: string (English summary of the poetic meaning)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const usageMeta = (response as any).usageMetadata || {};
    const promptTokens = usageMeta.promptTokenCount ?? Math.max(1, Math.ceil(prompt.length * 0.35));
    const candidateTokens = usageMeta.candidatesTokenCount ?? Math.max(1, Math.ceil((response.text?.length || 200) * 0.4));
    const totalTokens = usageMeta.totalTokenCount ?? (promptTokens + candidateTokens);

    return res.json({
      ...parsed,
      usage: {
        promptTokenCount: promptTokens,
        candidatesTokenCount: candidateTokens,
        totalTokenCount: totalTokens,
      },
      freeTierLimits: {
        rpm: 15,
        rpd: 1500,
        tpm: 1000000,
        tier: 'Free Tier (Google AI Studio)',
      },
    });
  } catch (error: any) {
    console.error('Error generating Thai lyrics:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate song lyrics',
    });
  }
});

// Auto-Title Generation Endpoint
app.post('/api/generate-title', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.length < 5) {
      return res.status(400).json({ error: 'Text is too short for title generation' });
    }

    if (!ai) {
      // Simple fallback if no AI: take first 20 chars
      const fallbackTitle = text.split('\n')[0].substring(0, 30).trim() || 'บทความใหม่';
      return res.json({ title: fallbackTitle });
    }

    const prompt = `You are an expert Thai editor. Based on the following Thai text, suggest a short, catchy, and professional title in Thai (3-6 words max).
Text: "${text.substring(0, 1000)}"
Return ONLY the title as a plain string, no quotes or additional text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let generatedTitle = response.text?.trim() || '';
    // Clean up any quotes the model might have added
    generatedTitle = generatedTitle.replace(/^["'«](.*)["'»]$/, '$1').replace(/[เ]"/g, '').trim();
    
    // Safety check for length
    if (generatedTitle.length > 50) {
      generatedTitle = generatedTitle.substring(0, 47) + '...';
    }

    return res.json({ title: generatedTitle || 'บทความพากย์เสียง' });
  } catch (error: any) {
    console.error('Error generating title:', error);
    return res.status(500).json({ error: 'Failed to generate title' });
  }
});

// Configure Vite in development or static serve in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
