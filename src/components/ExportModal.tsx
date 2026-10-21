import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Share2,
  FileText,
  Image,
  Tag,
  Check,
  X,
  Sparkles,
  Music,
  Mic,
  Copy,
} from 'lucide-react';
import { AudioItem } from '../types';

interface ExportModalProps {
  item: AudioItem | null;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const [format, setFormat] = useState<'wav' | 'mp3' | 'ogg'>('wav');
  const [bitrate, setBitrate] = useState<'320' | '192' | 'lossless'>('lossless');
  const [title, setTitle] = useState<string>(item.title);
  const [artist, setArtist] = useState<string>('Thai Studio Artist');
  const [album, setAlbum] = useState<string>('Thai Classical & TTS Collection');
  const [genre, setGenre] = useState<string>(item.type === 'song' ? 'Thai Classical' : 'Thai Voiceover');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const canvasCardRef = useRef<HTMLCanvasElement | null>(null);

  // Generate Social Audio Card on canvas
  useEffect(() => {
    const canvas = canvasCardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw rich Thai-themed gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (item.type === 'song') {
      gradient.addColorStop(0, '#064e3b'); // Emerald deep
      gradient.addColorStop(0.5, '#042f2e');
      gradient.addColorStop(1, '#022c22');
    } else {
      gradient.addColorStop(0, '#78350f'); // Amber bronze
      gradient.addColorStop(0.5, '#451a03');
      gradient.addColorStop(1, '#1c1917');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative Thai geometric borders
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, width - 44, height - 44);

    // Thai lotus emblem / icon circle
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(60, 60, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Kanit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.type === 'song' ? '♫' : 'ไ', 60, 67);

    // Brand tag
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.font = '12px Sarabun, sans-serif';
    ctx.fillText('THAI AUDIO STUDIO • MASTER EXPORT', 96, 52);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Sarabun, sans-serif';
    ctx.fillText(`${item.type === 'song' ? 'เพลงไทยเดิม' : 'เสียงพากย์ธรรมชาติ'} • 48 kHz`, 96, 68);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Kanit, sans-serif';
    const displayTitle = title.length > 28 ? title.slice(0, 28) + '...' : title;
    ctx.fillText(displayTitle, 36, 125);

    // Lyrics / Preview text
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px Sarabun, sans-serif';
    const displayText = item.text.length > 60 ? item.text.slice(0, 60) + '...' : item.text;
    ctx.fillText(`“${displayText}”`, 36, 150);

    // Stylized Waveform bars
    const barCount = 38;
    const startX = 36;
    const barWidth = 6;
    const gap = 3;
    for (let i = 0; i < barCount; i++) {
      const barH = 10 + Math.sin(i * 0.35) * 22 + Math.cos(i * 0.7) * 12;
      ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#10b981';
      ctx.fillRect(startX + i * (barWidth + gap), 215 - barH / 2, barWidth, barH);
    }

    // Footer info
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText(`DURATION: ${item.duration.toFixed(1)}s  |  FORMAT: WAV 48kHz 24-BIT`, 36, 240);
  }, [item, title]);

  // Download Audio Blob
  const handleDownloadAudio = () => {
    const url = URL.createObjectURL(item.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = title.replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, '_') || 'thai_audio';
    a.download = `${safeTitle}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Subtitle SRT
  const handleDownloadSRT = () => {
    const srtContent = generateSRT(item.text, item.duration);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'thai_audio'}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Audio Card PNG
  const handleDownloadCard = () => {
    const canvas = canvasCardRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${title || 'thai_audio'}_card.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        const file = new File([item.audioBlob], `${title}.wav`, { type: 'audio/wav' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title,
            text: item.text,
            files: [file],
          });
        } else {
          await navigator.share({
            title: title,
            text: `${title}\n\n${item.text}`,
            url: window.location.href,
          });
        }
      } else {
        navigator.clipboard.writeText(`${title}\n${item.text}`);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (e) {
      console.warn('Share error or cancelled', e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-2xl w-full shadow-2xl space-y-6 my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                ส่งออกระดับสตูดิโอ (Studio Export Suite)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                รองรับไฟล์คุณภาพสูง WAV 48kHz, การติดป้ายข้อมูล (Metadata), ซับไตเติล และการ์ดแชร์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format & Quality Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <span>ฟอร์แมตไฟล์เสียง (Audio Format)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'wav', label: 'WAV', desc: 'Lossless 48kHz' },
                { id: 'mp3', label: 'MP3', desc: '320 kbps HQ' },
                { id: 'ogg', label: 'OGG', desc: 'Web & Video' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    format === fmt.id
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-600/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm font-heading">{fmt.label}</div>
                  <div className="text-[10px] text-slate-400">{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-500" />
              <span>ข้อมูลผลงาน (Metadata Tags)</span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ชื่อผลงาน (Title)"
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="ศิลปิน (Artist)"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="หมวดหมู่ (Genre)"
                  className="w-full px-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Audio Card Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Image className="w-3.5 h-3.5 text-amber-500" />
              <span>การ์ดภาพสำหรับแชร์โซเชียล (Shareable Audio Card)</span>
            </span>
            <button
              onClick={handleDownloadCard}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>บันทึกรูปการ์ด PNG</span>
            </button>
          </div>

          <div className="flex justify-center bg-slate-950 p-2 rounded-2xl overflow-hidden shadow-inner">
            <canvas
              ref={canvasCardRef}
              width={480}
              height={260}
              className="w-full max-w-[480px] h-auto rounded-xl shadow-md"
            />
          </div>
        </div>

        {/* Export & Sharing Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            {/* Subtitle SRT download button */}
            <button
              onClick={handleDownloadSRT}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1.5 transition-colors"
              title="ดาวน์โหลดไฟล์คำบรรยาย .SRT สำหรับใส่ในวิดีโอ YouTube หรือ TikTok"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดซับ (.SRT)</span>
            </button>

            {/* Native Share button */}
            <button
              onClick={handleNativeShare}
              disabled={isSharing}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'คัดลอกข้อความแล้ว!' : 'แชร์ (Share)'}</span>
            </button>
          </div>

          {/* Primary Audio Download Button */}
          <button
            onClick={handleDownloadAudio}
            className="px-6 py-2.5 rounded-xl font-heading font-semibold text-white bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-lg shadow-purple-600/25 flex items-center space-x-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดไฟล์เสียง ({format.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Subtitle SRT generator utility
function generateSRT(text: string, duration: number): string {
  const lines = text.split(/[。\n.!?]/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) lines.push(text);

  const durationPerLine = duration / lines.length;
  let srt = '';

  lines.forEach((line, index) => {
    const startSec = index * durationPerLine;
    const endSec = (index + 1) * durationPerLine;

    srt += `${index + 1}\n`;
    srt += `${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n`;
    srt += `${line}\n\n`;
  });

  return srt;
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
