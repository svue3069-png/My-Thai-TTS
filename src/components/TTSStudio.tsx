import React, { useState, useEffect } from 'react';
import {
  Mic,
  Play,
  Pause,
  Download,
  Sparkles,
  Sliders,
  Volume2,
  Bookmark,
  Music2,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Globe,
  WifiOff,
  Trash2,
  X,
  CreditCard,
  AlertCircle,
  Info,
} from 'lucide-react';
import { AudioItem, ThaiVoicePersona } from '../types';
import { THAI_VOICE_PERSONAS, synthesizeThaiSpeech, sleep, generateAutoTitle } from '../services/thaiTTS';
import { saveAudioItem } from '../services/storage';
import {
  estimateThaiTokens,
  getTokenStats,
  recordTokenUsage,
  FREE_TIER_LIMITS,
  calculateEstimatedCost,
  isQuotaExceeded,
} from '../services/tokenTracker';

interface TTSStudioProps {
  onAudioGenerated: (audioItem: AudioItem) => void;
  onSendToSongMaker: (audioItem: AudioItem) => void;
  onOpenExport: (audioItem: AudioItem) => void;
  onOpenTokenLimits?: () => void;
  isOfflineMode: boolean;
}

const PRESET_TEMPLATES = [
  {
    label: 'คำทักทายสุภาพ',
    text: 'สวัสดีค่ะ ขอต้อนรับทุกท่านเข้าสู่สตูดิโอพากย์เสียงภาษาไทย เสียงพากย์เป็นธรรมชาติ ชัดเจน และฟังง่ายทุกประโยคค่ะ',
    voice: 'Kore',
    style: 'Warm, pleasant, polite central Thai',
  },
  {
    label: 'ประกาศข่าวสาร',
    text: 'รายงานสภาพอากาศและข่าวสารประจำวัน วันนี้ท้องฟ้าแจ่มใส มีลมพัดเย็นสบายตลอดช่วงเช้า เหมาะแก่การเดินทางท่องเที่ยวและทำกิจกรรมกลางแจ้งครับ',
    voice: 'Fenrir',
    style: 'Formal, authoritative news anchor broadcast tone',
  },
  {
    label: 'นิทาน / วรรณคดี',
    text: 'กาลครั้งหนึ่งนานมาแล้ว ริมฝั่งแม่น้ำเจ้าพระยาอันกว้างใหญ่ มีเรือนไม้สักทองหลังงาม แว่วเสียงเพลงปี่พาทย์บรรเลงขับขานก้องกังวานในสายลม',
    voice: 'Charon',
    style: 'Classic Thai storytelling, elder wisdom tone',
  },
  {
    label: 'สักวา / คำกลอน',
    text: 'สักวาดาวจระเข้ก็เหหก ศีรษะตกหันหางขึ้นกลางหาว ดุเหว่าเร้ากระชั้นสำเนียงกราว ดั่งเสียงขลุ่ยก้องพราวในราตรีเอย',
    voice: 'Zephyr',
    style: 'Poetic, lyrical melodious Thai chant cadence',
  },
  {
    label: 'เนื้อร้องดนตรีไทย',
    text: 'โอ้ละหนอดวงเดือนเอย พี่มาเว้ารักเจ้าสาวคำดวง โอ้ดึกแล้วหนอพี่ขอลาล่วง อกพี่เป็นห่วงรักเจ้าดวงเดือนเอย',
    voice: 'Kore',
    style: 'Sing-song melodic Thai classical cadence',
  },
];

/**
 * Utility to split Thai text into manageable chunks for TTS
 * Focuses on splitting at spaces, newlines, or sentence endings.
 * If no split points are found, it performs a hard split to prevent API limits.
 */
function splitThaiText(text: string, maxChunkLength: number = 1000): string[] {
  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxChunkLength) {
      chunks.push(para.trim());
    } else {
      // Split by spaces, newlines, or Thai/Western punctuation
      const parts = para.split(/([ \u0020\u0E2F\u3002\uff0e\u002e\u003f\u0021\u002c\u003b]+)/);
      let currentChunk = "";
      
      for (const part of parts) {
        // If a single part is still too long (no spaces/punctuation found), hard split it
        if (part.length > maxChunkLength) {
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
          }
          
          let remainingPart = part;
          while (remainingPart.length > maxChunkLength) {
            chunks.push(remainingPart.substring(0, maxChunkLength).trim());
            remainingPart = remainingPart.substring(maxChunkLength);
          }
          currentChunk = remainingPart;
        } else if ((currentChunk + part).length > maxChunkLength && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = part;
        } else {
          currentChunk += part;
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
    }
  }
  return chunks.filter((c) => c.length > 0);
}

export const TTSStudio: React.FC<TTSStudioProps> = ({
  onAudioGenerated,
  onSendToSongMaker,
  onOpenExport,
  onOpenTokenLimits,
  isOfflineMode,
}) => {
  const [text, setText] = useState<string>(PRESET_TEMPLATES[0].text);
  const [title, setTitle] = useState<string>('บทพากย์เสียงธรรมชาติ');
  const [selectedVoice, setSelectedVoice] = useState<ThaiVoicePersona>(THAI_VOICE_PERSONAS[0]);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [styleDesc, setStyleDesc] = useState<string>('Warm, pleasant, polite central Thai');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(-1);
  const [textChunks, setTextChunks] = useState<string[]>([]);
  const [lastGeneratedItem, setLastGeneratedItem] = useState<AudioItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [tokenStats, setTokenStats] = useState(getTokenStats());
  const [isDetectingTitle, setIsDetectingTitle] = useState<boolean>(false);
  const [isTitleManuallyEdited, setIsTitleManuallyEdited] = useState<boolean>(false);
  const [isPaidMode, setIsPaidMode] = useState<boolean>(false);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [costEstimate, setCostEstimate] = useState<number>(0);
  const [hasPaidTierPermission, setHasPaidTierPermission] = useState<boolean>(false);

  // Listen for live token stats updates
  useEffect(() => {
    const handleStats = () => setTokenStats(getTokenStats());
    window.addEventListener('token-stats-updated', handleStats);
    return () => window.removeEventListener('token-stats-updated', handleStats);
  }, []);

  // Auto-detect title from text with debounce
  useEffect(() => {
    if (!text.trim() || isTitleManuallyEdited || isGenerating) return;
    
    // Only auto-detect if the title is empty or the default one
    const isDefaultTitle = title === 'บทพากย์เสียงธรรมชาติ' || title === '';
    if (!isDefaultTitle) return;

    const timer = setTimeout(async () => {
      // Minimum length to avoid triggering on every tiny keystroke
      if (text.length < 20) return;
      
      setIsDetectingTitle(true);
      try {
        const detected = await generateAutoTitle(text);
        if (detected && !isTitleManuallyEdited) {
          setTitle(detected);
        }
      } catch (err) {
        console.warn('Auto-title failed', err);
      } finally {
        setIsDetectingTitle(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [text, isTitleManuallyEdited, isGenerating]);

  // Update cost estimate
  useEffect(() => {
    if (text.trim()) {
      setCostEstimate(calculateEstimatedCost(text));
    } else {
      setCostEstimate(0);
    }
  }, [text]);

  // Thai text metrics & estimated tokens
  const charCount = text.length;
  const wordEstimate = text.trim() ? text.split(/\s+/).length + Math.floor(charCount / 5) : 0;
  const toneMarks = (text.match(/[\u0E48-\u0E4B]/g) || []).length; // เอก, โท, ตรี, จัตวา
  const estimatedTokens = estimateThaiTokens(text);

  const handleApplyTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    setText(tmpl.text);
    setTitle(tmpl.label);
    setIsTitleManuallyEdited(false); // Reset when applying template
    const foundVoice = THAI_VOICE_PERSONAS.find((v) => v.id === tmpl.voice);
    if (foundVoice) setSelectedVoice(foundVoice);
    setStyleDesc(tmpl.style);
  };

  const handleSynthesize = async (bypassApproval: boolean = false) => {
    if (!text.trim()) return;

    // Check if we need to show approval modal
    const outOfQuota = isQuotaExceeded();
    if (!bypassApproval && (isPaidMode || outOfQuota)) {
      setShowApprovalModal(true);
      return;
    }

    setIsGenerating(true);
    setSavedSuccess(false);
    setGenerationProgress(0);
    setCurrentChunkIndex(-1);

    const chunks = splitThaiText(text);
    setTextChunks(chunks);
    const results: any[] = [];
    let totalPromptTokens = 0;
    let totalCandidatesTokens = 0;
    let totalDuration = 0;
    const finalChunks: any[] = [];

    try {
      let quotaExceededAlerted = false;
      let waitSeconds = 0;

      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunkIndex(i);
        setGenerationProgress(Math.round((i / chunks.length) * 100));
        const chunk = chunks[i];
        const result = await synthesizeThaiSpeech({
          text: chunk,
          voiceName: selectedVoice.id,
          style: styleDesc,
          speed,
          pitch,
          forceOffline: isOfflineMode,
          isPaid: isPaidMode,
        });

        if (result.fellBackFromQuota) {
          quotaExceededAlerted = true;
          waitSeconds = result.retryAfterSeconds || 0;
        }

        results.push(result);
        if (result.usage) {
          totalPromptTokens += result.usage.promptTokenCount;
          totalCandidatesTokens += result.usage.candidatesTokenCount;
        }

        finalChunks.push({
          text: chunk,
          duration: result.duration,
          startOffset: totalDuration,
        });

        totalDuration += result.duration;
        setGenerationProgress(Math.round(((i + 1) / chunks.length) * 100));

        // Cooldown between chunks to be safer with the API rate limits
        // 10 RPM (Free) = 1 call every 6s, 15 RPM (Paid) = 1 call every 4s
        if (i < chunks.length - 1) {
          const cooldown = isPaidMode ? 4000 : 6500;
          await sleep(cooldown); 
        }
      }

      // Merge audio blobs
      let finalAudioBlob: Blob;
      if (results.length === 1) {
        finalAudioBlob = results[0].audioBlob;
      } else {
        // Concatenate WAV files by stripping headers of 2nd+ chunks
        const audioBuffers: ArrayBuffer[] = [];
        for (let i = 0; i < results.length; i++) {
          const ab = await results[i].audioBlob.arrayBuffer();
          if (i === 0) {
            audioBuffers.push(ab);
          } else {
            // Strip 44-byte WAV header
            audioBuffers.push(ab.slice(44));
          }
        }
        finalAudioBlob = new Blob(audioBuffers, { type: 'audio/wav' });
      }

      const totalUsage = {
        promptTokenCount: totalPromptTokens,
        candidatesTokenCount: totalCandidatesTokens,
        totalTokenCount: totalPromptTokens + totalCandidatesTokens,
      };

      const newItem: AudioItem = {
        id: `tts-${Date.now()}`,
        title: title || `พากย์เสียง ${selectedVoice.thaiName}`,
        text,
        type: 'tts',
        voiceName: results[0].voiceName,
        engine: results[0].engine,
        audioBlob: finalAudioBlob,
        duration: totalDuration,
        speed,
        pitch,
        volume: 1.0,
        createdAt: Date.now(),
        tags: [selectedVoice.gender === 'female' ? 'หญิง' : 'ชาย', results[0].engine === 'gemini' ? 'AI Neural' : 'ออฟไลน์'],
        favorite: false,
        tokenUsage: totalUsage,
        chunks: finalChunks,
      };

      // Record token usage for the free tier counter
      if (totalUsage.totalTokenCount > 0) {
        recordTokenUsage(totalUsage, isOfflineMode || results[0].engine === 'offline');
      }

      // Automatically store in IndexedDB for 100% offline playback
      await saveAudioItem(newItem);
      setSavedSuccess(true);
      setLastGeneratedItem(newItem);
      onAudioGenerated(newItem);

      if (quotaExceededAlerted) {
        const hours = Math.ceil(waitSeconds / 3600);
        setTimeout(() => {
          alert(`หมายเหตุ: ขีดจำกัดเสียง AI รายวัน (100 ครั้ง) หมดแล้ว\n\nระบบได้เปลี่ยนมาใช้ "เสียงสำรอง" (Offline Voice) ให้คุณโดยอัตโนมัติเพื่อให้งานไม่สะดุด\n\nคุณสามารถใช้เสียง AI ได้อีกครั้งในอีกประมาณ ${hours} ชั่วโมงค่ะ`);
        }, 500);
      }
    } catch (err: any) {
      console.error('Synthesis error:', err);
      const isRateLimit = err?.message?.includes('429') || err?.status === 429;
      alert(isRateLimit 
        ? 'เกินขีดจำกัดการใช้งานรายนาที (Rate Limit) กรุณารอสักครู่แล้วลองใหม่อีกครั้ง หรือลองใช้โหมดออฟไลน์สำหรับบทความยาว' 
        : 'เกิดข้อผิดพลาดในการสร้างเสียง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentChunkIndex(-1);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner / Studio Introduction */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-emerald-500/10 border border-amber-500/20 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>AI Neural &amp; Offline Voice</span>
              </span>
              {isOfflineMode && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500 text-white flex items-center space-x-1">
                  <WifiOff className="w-3 h-3" />
                  <span>โหมดออฟไลน์</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900 dark:text-white mt-1">
              ห้องพากย์เสียงภาษาไทย (Thai TTS Studio)
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              สังเคราะห์เสียงภาษาไทยที่เป็นธรรมชาติ วรรณยุกต์แม่นยำ พร้อมระบบปรับความเร็วและคีย์เสียงเพื่อการเข้าถึง (Accessibility) และรองรับการฟังแบบออฟไลน์
            </p>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {PRESET_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.label}
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-400 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Text Input & Templates (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>ข้อความภาษาไทยที่ต้องการพากย์</span>
                <span className="text-xs text-slate-400 font-normal">
                  (รองรับคำสแลง คำสุภาพ และบทกลอน)
                </span>
              </label>

              <div className="flex items-center space-x-1.5">
                {text.length > 0 && (
                  <button
                    onClick={() => {
                      setText('');
                      setTitle('บทพากย์เสียงธรรมชาติ');
                      setIsTitleManuallyEdited(false);
                    }}
                    className="text-xs flex items-center space-x-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="ล้างข้อความและชื่อเรื่อง (Clear All)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างข้อความ</span>
                  </button>
                )}

                <button
                  onClick={copyToClipboard}
                  disabled={!text.trim()}
                  className="text-xs flex items-center space-x-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 px-2 py-0.5 rounded-lg transition-colors"
                  title="คัดลอกข้อความ"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="พิมพ์หรือวางข้อความภาษาไทยที่นี่... เช่น 'สวัสดีค่ะ วันนี้อากาศดีมาก'"
                rows={6}
                className="w-full p-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-base leading-relaxed transition-all resize-y"
              />

              {isGenerating && textChunks.length > 0 && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in z-10">
                  <div className="w-full max-w-md space-y-4">
                    <span className="text-2xl font-bold font-mono text-amber-500 w-full text-center block">
                      {generationProgress}%
                    </span>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-300/30 dark:border-slate-600/30">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    {/* Chunk text removed per request */}
                  </div>
                </div>
              )}

              {text.length > 0 && !isGenerating && (
                <button
                  onClick={() => {
                    setText('');
                    setTitle('บทพากย์เสียงธรรมชาติ');
                    setIsTitleManuallyEdited(false);
                  }}
                  className="absolute top-3.5 right-3.5 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                  title="ล้างข้อความ (Clear)"
                  aria-label="Clear input text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Character, Tone & Token Metrics */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>อักษร: <strong className="text-slate-700 dark:text-slate-200">{charCount}</strong></span>
                  <span>คำโดยประมาณ: <strong className="text-slate-700 dark:text-slate-200">{wordEstimate}</strong></span>
                  <span>วรรณยุกต์: <strong className="text-amber-600 dark:text-amber-400">{toneMarks}</strong></span>
                  <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Zap className="w-3 h-3 fill-current" />
                    <span>~{estimatedTokens} โทเค็น (โดยประมาณ)</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setIsTitleManuallyEdited(true);
                      }}
                      placeholder={isDetectingTitle ? "กำลังวิเคราะห์..." : "ชื่อเรื่องเสียง"}
                      className={`px-2 py-1 pr-6 rounded bg-slate-100 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 w-36 transition-all ${isDetectingTitle ? 'opacity-70 italic' : ''}`}
                    />
                    {isDetectingTitle ? (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin" />
                      </div>
                    ) : title.length > 0 && (
                      <button
                        onClick={() => {
                          setTitle('');
                          setIsTitleManuallyEdited(true);
                        }}
                        className="absolute right-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        title="ล้างชื่อเรื่อง"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Free Tier Token Limit & Usage Live Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-slate-800/60 border border-amber-200/80 dark:border-slate-700">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span className="text-slate-700 dark:text-slate-300">
                    โควตาเวอร์ชันฟรี: <strong>{tokenStats.todayRequests}</strong> / <strong>{FREE_TIER_LIMITS.rpd.toLocaleString()}</strong> คำขอวันนี้
                  </span>
                  <span className="text-[11px] text-slate-400 hidden md:inline">
                    (ขีดจำกัด 15 RPM &bull; 1M TPM)
                  </span>
                </div>

                {onOpenTokenLimits && (
                  <button
                    onClick={onOpenTokenLimits}
                    className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 flex items-center space-x-1 shrink-0"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    <span>ตรวจสอบโควตาและขีดจำกัดฟรี</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Voice Personas Selection */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                เลือกผู้พากย์เสียงธรรมชาติ (Thai Voice Personas)
              </h3>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {selectedVoice.thaiName} ({selectedVoice.gender === 'female' ? 'หญิง' : 'ชาย'})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {THAI_VOICE_PERSONAS.map((voice) => {
                const isSelected = selectedVoice.id === voice.id;
                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice);
                      setStyleDesc(voice.recommendedStyle);
                    }}
                    className={`cursor-pointer rounded-xl p-3 border transition-all text-left relative ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                          voice.gender === 'female'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {voice.thaiName[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center space-x-1">
                          <span>{voice.thaiName}</span>
                          <span className="text-[10px] font-normal text-slate-400">({voice.id})</span>
                        </div>
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                          {voice.tag}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                      {voice.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Accessibility Settings & Generate (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <span>การตั้งค่าการเข้าถึง (Accessibility Controls)</span>
              </h3>
              <span className="text-[11px] text-slate-400">ปรับความเร็ว &amp; โทนเสียง</span>
            </div>

            {/* Speed (Rate) slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  ความเร็วในการพูด (Speech Rate)
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {speed}x {speed < 0.9 ? '(ช้า เพื่อการฟังง่าย)' : speed > 1.2 ? '(เร็ว)' : '(ปกติ)'}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.5x ช้ามาก</span>
                <span>1.0x มาตรฐาน</span>
                <span>1.5x เร็ว</span>
                <span>2.0x เร็วมาก</span>
              </div>
            </div>

            {/* Pitch slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  ระดับเสียงสูง-ต่ำ (Pitch / Key)
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {pitch}x {pitch < 0.9 ? '(ทุ้มลึก)' : pitch > 1.1 ? '(แหลมใส)' : '(ธรรมชาติ)'}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.5x ทุ้มหนัก</span>
                <span>1.0x มาตรฐาน</span>
                <span>1.5x ใสสูง</span>
              </div>
            </div>

            {/* Style Prompting */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                อารมณ์และสไตล์การอ่าน (Tone &amp; Style)
              </label>
              <input
                type="text"
                value={styleDesc}
                onChange={(e) => setStyleDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Pay Per Use Toggle */}
            <div className={`p-4 rounded-2xl border transition-all ${isPaidMode ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl ${isPaidMode ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">โหมดจ่ายตามจริง (Paid Mode)</h4>
                    <p className="text-[10px] text-slate-500">เสถียรกว่า &amp; ขีดจำกัดสูงกว่า</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaidMode(!isPaidMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isPaidMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPaidMode ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              
              {isPaidMode && (
                <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs animate-fade-in">
                  <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>ค่าใช้จ่ายโดยประมาณ:</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    ${costEstimate.toFixed(4)} USD
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => handleSynthesize()}
              disabled={isGenerating || !text.trim()}
              className={`w-full py-3.5 px-6 rounded-xl font-heading font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 text-base relative overflow-hidden ${
                isPaidMode 
                  ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-emerald-700 shadow-amber-600/25' 
                  : 'bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 shadow-amber-500/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="absolute inset-0 bg-black/10 transition-all" style={{ width: `${generationProgress}%` }} />
                  <RefreshCw className="w-5 h-5 animate-spin relative z-10" />
                  <span className="relative z-10">กำลังประมวลผล {generationProgress}%...</span>
                </>
              ) : (
                <>
                  {isPaidMode ? <CreditCard className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span>{isPaidMode ? `สร้างเสียง (Paid Mode ~$${costEstimate.toFixed(3)})` : 'สังเคราะห์เสียง (Generate Thai TTS)'}</span>
                </>
              )}
            </button>

            {/* Offline notification badge */}
            <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
              <Bookmark className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-white">บันทึกออฟไลน์อัตโนมัติ:</strong>{' '}
                ไฟล์เสียงทุกไฟล์จะถูกแคชไว้ในฐานข้อมูล IndexedDB ในเครื่องของคุณทันที สามารถเปิดฟังแบบออฟไลน์ได้โดยไม่ต้องเชื่อมต่ออินเทอร์เน็ต
              </div>
            </div>
          </div>

          {/* Last Generated Audio Preview Card */}
          {lastGeneratedItem && (
            <div className="bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>สังเคราะห์สำเร็จและบันทึกแล้ว</span>
                </span>
                <span className="text-xs text-slate-500">
                  ความยาว ~{lastGeneratedItem.duration.toFixed(1)} วินาที
                </span>
              </div>

              <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                {lastGeneratedItem.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                &ldquo;{lastGeneratedItem.text}&rdquo;
              </p>

              {/* Token Usage Badge */}
              {lastGeneratedItem.tokenUsage ? (
                <div className="flex items-center justify-between text-[11px] bg-amber-100/70 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3 py-1.5 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
                    <span>
                      โทเค็นที่ใช้: <strong>{lastGeneratedItem.tokenUsage.totalTokenCount}</strong> โทเค็น
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                    (Prompt: {lastGeneratedItem.tokenUsage.promptTokenCount} &bull; Audio: {lastGeneratedItem.tokenUsage.candidatesTokenCount})
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-[11px] bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl px-3 py-1.5">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>โหมดออฟไลน์: ประมวลผลในเครื่อง 0 โทเค็น (ฟรีไม่จำกัด)</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-500/20">
                <button
                  onClick={() => onAudioGenerated(lastGeneratedItem)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 flex items-center space-x-1 transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>เล่นเสียงตัวอย่าง</span>
                </button>

                <button
                  onClick={() => onSendToSongMaker(lastGeneratedItem)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 hover:bg-emerald-200 flex items-center space-x-1 transition-colors"
                >
                  <Music2 className="w-3.5 h-3.5" />
                  <span>ใส่ในสตูดิโอแต่งเพลง</span>
                </button>

                <button
                  onClick={() => onOpenExport(lastGeneratedItem)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center space-x-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ส่งออกไฟล์</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal for Paid/Exceeded Usage */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <CreditCard className="w-8 h-8" />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                ยืนยันการใช้โหมด "จ่ายตามจริง" (Pay Per Use)
              </h2>
              
              {isQuotaExceeded() && !isPaidMode && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-start space-x-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-800 dark:text-rose-300">
                    โควตาฟรีรายวันของคุณหมดแล้ว หากต้องการใช้เสียง AI Neural ต่อไป ระบบจะสลับเข้าสู่โหมดจ่ายตามจริงโดยอัตโนมัติ
                  </p>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 dark:text-slate-400">โทเค็นที่คาดว่าจะใช้:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">~{estimatedTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">ค่าใช้จ่ายประมาณการ:</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${costEstimate.toFixed(4)} USD</span>
                </div>
                <p className="text-[10px] text-slate-400 text-center italic">
                  * คำนวณจาก $0.10/1M tokens (Input) และ $0.40/1M tokens (Audio Output)
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setIsPaidMode(true);
                    handleSynthesize(true);
                  }}
                  className="w-full py-3 rounded-xl font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all"
                >
                  อนุมัติและเริ่มสร้างเสียง
                </button>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="w-full py-3 rounded-xl font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
