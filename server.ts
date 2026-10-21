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

    // Prepare speech prompt with specific Thai pronunciation and tonality cues
    const promptText = `Speak in natural, fluent Thai: "${text}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText,
              speechMetadata: {
                style: `${style}. Speech rate is ${speed >= 1.2 ? 'slightly fast' : speed <= 0.8 ? 'slow and deliberate' : 'moderate'}. Tone pitch is ${pitch > 1.1 ? 'higher' : pitch < 0.9 ? 'deeper' : 'natural'}.`,
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

    return res.json({
      audioBase64: base64Audio,
      mimeType,
      duration: estimatedSeconds,
      voiceName,
      model: 'gemini-3.8-flash-lite-tts',
    });
  } catch (error: any) {
    console.error('Error generating speech:', error);
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
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating Thai lyrics:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate song lyrics',
    });
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
