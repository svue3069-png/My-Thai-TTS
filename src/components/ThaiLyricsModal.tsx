import React, { useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check, Music2, X } from 'lucide-react';

interface ThaiLyricsModalProps {
  onClose: () => void;
  onApplyLyrics: (lyricsText: string, titleText: string) => void;
}

export const ThaiLyricsModal: React.FC<ThaiLyricsModalProps> = ({
  onClose,
  onApplyLyrics,
}) => {
  const [theme, setTheme] = useState<string>('nature');
  const [style, setStyle] = useState<string>('Khamen Sai Yok classical');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    title: string;
    lyrics: string;
    tempoHint: string;
    translation?: string;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const THEMES = [
    { id: 'nature', label: 'สายน้ำ ท้องทุ่ง และธรรมชาติ', query: 'River of Kings, rural nature, Chao Phraya' },
    { id: 'moonlight', label: 'ชมจันทร์ และความรักหวานซึ้ง', query: 'Moonlight serenade, traditional Thai romance, stars' },
    { id: 'harvest', label: 'งานบุญ รื่นเริง และเทศกาล', query: 'Temple festival, Loy Krathong, joyous celebration' },
    { id: 'heroic', label: 'สดุดีประวัติศาสตร์ และสยาม', query: 'Historical Ayutthaya, ancient Siamese glory, overture' },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const selectedTheme = THEMES.find((t) => t.id === theme)?.query || theme;
      const res = await fetch('/api/thai-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selectedTheme, style }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        // Fallback verse
        setResult({
          title: 'สายน้ำเจ้าพระยา (The Flowing Chao Phraya)',
          lyrics: `(เกริ่นร้อง) โอ้ละหนอ สายน้ำรินไหลผ่านคุ้งน้ำ\nแสงจันทร์งามสาดส่องลงท้องนภา\nยินเสียงระนาดเอกกังวานแว่วมา\nดังมนตราพาใจให้เคลิบเคลิ้มเอย`,
          tempoHint: 'Song-Chan (Medium tempo 80 BPM)',
          translation: 'The moonlight shines over the river as the melodious Ranat echoes in the night air.',
        });
      }
    } catch {
      setResult({
        title: 'สายน้ำเจ้าพระยา (The Flowing Chao Phraya)',
        lyrics: `(เกริ่นร้อง) โอ้ละหนอ สายน้ำรินไหลผ่านคุ้งน้ำ\nแสงจันทร์งามสาดส่องลงท้องนภา\nยินเสียงระนาดเอกกังวานแว่วมา\nดังมนตราพาใจให้เคลิบเคลิ้มเอย`,
        tempoHint: 'Song-Chan (Medium tempo 80 BPM)',
        translation: 'The moonlight shines over the river as the melodious Ranat echoes in the night air.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl space-y-5 animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold font-heading text-slate-900 dark:text-white">
                ผู้ช่วยประพันธ์คำร้องเพลงไทย (Thai Lyrics Assistant)
              </h3>
              <p className="text-xs text-slate-500">สร้างบทร้องและสัมผัสกลอนสุภาพสำหรับศิลปิน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme buttons */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            เลือกธีมและบรรยากาศบทเพลง:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-2.5 rounded-xl text-left border text-xs transition-colors ${
                  theme === t.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>กำลังประพันธ์คำร้องเพลงไทย...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>สร้างคำร้องและสัมผัสกลอน</span>
            </>
          )}
        </button>

        {/* Generated Result */}
        {result && (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {result.title}
              </h4>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-mono">
                {result.tempoHint}
              </span>
            </div>

            <pre className="text-xs leading-relaxed font-sans whitespace-pre-wrap text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-amber-100 dark:border-slate-800">
              {result.lyrics}
            </pre>

            {result.translation && (
              <p className="text-[11px] text-slate-500 italic">
                ความหมาย: {result.translation}
              </p>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-amber-200 dark:border-slate-700">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${result.title}\n\n${result.lyrics}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>

              <button
                onClick={() => {
                  onApplyLyrics(result.lyrics, result.title);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center space-x-1"
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>นำไปพากย์เสียง TTS ทันที</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
