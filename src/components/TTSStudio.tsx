import React, { useState } from 'react';
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
} from 'lucide-react';
import { AudioItem, ThaiVoicePersona } from '../types';
import { THAI_VOICE_PERSONAS, synthesizeThaiSpeech } from '../services/thaiTTS';
import { saveAudioItem } from '../services/storage';

interface TTSStudioProps {
  onAudioGenerated: (audioItem: AudioItem) => void;
  onSendToSongMaker: (audioItem: AudioItem) => void;
  onOpenExport: (audioItem: AudioItem) => void;
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

export const TTSStudio: React.FC<TTSStudioProps> = ({
  onAudioGenerated,
  onSendToSongMaker,
  onOpenExport,
  isOfflineMode,
}) => {
  const [text, setText] = useState<string>(PRESET_TEMPLATES[0].text);
  const [title, setTitle] = useState<string>('บทพากย์เสียงธรรมชาติ');
  const [selectedVoice, setSelectedVoice] = useState<ThaiVoicePersona>(THAI_VOICE_PERSONAS[0]);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [styleDesc, setStyleDesc] = useState<string>('Warm, pleasant, polite central Thai');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastGeneratedItem, setLastGeneratedItem] = useState<AudioItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Thai text metrics
  const charCount = text.length;
  const wordEstimate = text.trim() ? text.split(/\s+/).length + Math.floor(charCount / 5) : 0;
  // Tone marks count in Thai
  const toneMarks = (text.match(/[\u0E48-\u0E4B]/g) || []).length; // เอก, โท, ตรี, จัตวา

  const handleApplyTemplate = (tmpl: typeof PRESET_TEMPLATES[0]) => {
    setText(tmpl.text);
    setTitle(tmpl.label);
    const foundVoice = THAI_VOICE_PERSONAS.find((v) => v.id === tmpl.voice);
    if (foundVoice) setSelectedVoice(foundVoice);
    setStyleDesc(tmpl.style);
  };

  const handleSynthesize = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setSavedSuccess(false);

    try {
      const result = await synthesizeThaiSpeech({
        text,
        voiceName: selectedVoice.id,
        style: styleDesc,
        speed,
        pitch,
        forceOffline: isOfflineMode,
      });

      const newItem: AudioItem = {
        id: `tts-${Date.now()}`,
        title: title || `พากย์เสียง ${selectedVoice.thaiName}`,
        text,
        type: 'tts',
        voiceName: result.voiceName,
        engine: result.engine,
        audioBlob: result.audioBlob,
        duration: result.duration,
        speed,
        pitch,
        volume: 1.0,
        createdAt: Date.now(),
        tags: [selectedVoice.gender === 'female' ? 'หญิง' : 'ชาย', result.engine === 'gemini' ? 'AI Neural' : 'ออฟไลน์'],
        favorite: false,
      };

      // Automatically store in IndexedDB for 100% offline playback
      await saveAudioItem(newItem);
      setSavedSuccess(true);
      setLastGeneratedItem(newItem);
      onAudioGenerated(newItem);
    } catch (err) {
      console.error('Synthesis error:', err);
      alert('เกิดข้อผิดพลาดในการสร้างเสียง กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGenerating(false);
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
                    onClick={() => setText('')}
                    className="text-xs flex items-center space-x-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="ล้างข้อความทั้งหมด (Clear Text)"
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

              {text.length > 0 && (
                <button
                  onClick={() => setText('')}
                  className="absolute top-3.5 right-3.5 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
                  title="ล้างข้อความ (Clear)"
                  aria-label="Clear input text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Character & Tone Metrics */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-3">
                <span>อักษร: <strong className="text-slate-700 dark:text-slate-200">{charCount}</strong></span>
                <span>คำโดยประมาณ: <strong className="text-slate-700 dark:text-slate-200">{wordEstimate}</strong></span>
                <span>รูปวรรณยุกต์: <strong className="text-amber-600 dark:text-amber-400">{toneMarks}</strong> ตัว</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ชื่อเรื่องเสียง"
                    className="px-2 py-1 pr-6 rounded bg-slate-100 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 w-36"
                  />
                  {title.length > 0 && (
                    <button
                      onClick={() => setTitle('')}
                      className="absolute right-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                      title="ล้างชื่อเรื่อง"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
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

            {/* Generate Action Button */}
            <button
              onClick={handleSynthesize}
              disabled={isGenerating || !text.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-heading font-semibold text-white bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 shadow-lg shadow-amber-500/25 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 text-base"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>กำลังสังเคราะห์เสียงภาษาไทย...</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>สังเคราะห์เสียง (Generate Thai TTS)</span>
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
    </div>
  );
};
