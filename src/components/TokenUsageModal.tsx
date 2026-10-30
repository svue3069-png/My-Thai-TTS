import React, { useState, useEffect } from 'react';
import {
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  WifiOff,
  RotateCcw,
  X,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  getTokenStats,
  resetDailyTokenStats,
  FREE_TIER_LIMITS,
  TokenStats,
} from '../services/tokenTracker';

interface TokenUsageModalProps {
  onClose: () => void;
  isOfflineMode: boolean;
}

export const TokenUsageModal: React.FC<TokenUsageModalProps> = ({
  onClose,
  isOfflineMode,
}) => {
  const [stats, setStats] = useState<TokenStats>(getTokenStats());

  useEffect(() => {
    const handleUpdate = () => setStats(getTokenStats());
    window.addEventListener('token-stats-updated', handleUpdate);
    return () => window.removeEventListener('token-stats-updated', handleUpdate);
  }, []);

  const requestPercent = Math.min(
    100,
    Math.round((stats.todayRequests / FREE_TIER_LIMITS.rpd) * 100)
  );

  const remainingRequests = Math.max(0, FREE_TIER_LIMITS.rpd - stats.todayRequests);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl space-y-6 my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold font-heading text-lg text-slate-900 dark:text-white">
                  การใช้งานโทเค็นและขีดจำกัด
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  เวอร์ชันฟรี 100%
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Google AI Studio Free Tier Quota &amp; Live Usage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Tier Status Card */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-500/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>ระดับสิทธิ์ปัจจุบัน: {FREE_TIER_LIMITS.tierName}</span>
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">
              ค่าบริการ: $0.00
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            ใช้งานโมเดลเสียง <strong>gemini-3.8-flash-lite-tts</strong> และโมเดล <strong>gemini-3.8-flash</strong> ได้ฟรีทุกวันตามโควตามาตรฐาน
          </p>
        </div>

        {/* Live Quota Progress Bar: Daily Requests */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                จำนวนคำขอสังเคราะห์เสียงวันนี้ (Requests Per Day - RPD)
              </span>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                รีเซ็ตอัตโนมัติทุกเที่ยงคืน ({stats.lastUpdatedDate})
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                {stats.todayRequests.toLocaleString()} / {FREE_TIER_LIMITS.rpd.toLocaleString()}
              </span>
              <div className="text-[10px] text-slate-400">ครั้ง/วัน</div>
            </div>
          </div>

          {/* Progress track */}
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, requestPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>ใช้ไปแล้ว {requestPercent}%</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              เหลืออีก {remainingRequests.toLocaleString()} ครั้งวันนี้
            </span>
          </div>
        </div>

        {/* Free Tier Rate Limits Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[10px] text-slate-400 font-medium">ขีดจำกัดต่อนาที (RPM)</div>
            <div className="text-base font-bold font-heading text-slate-900 dark:text-white mt-0.5">
              {FREE_TIER_LIMITS.rpm} <span className="text-xs font-normal text-slate-400">RPM</span>
            </div>
            <div className="text-[10px] text-slate-500">คำขอต่อ 1 นาที</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="text-[10px] text-slate-400 font-medium">โทเค็นต่อนาที (TPM)</div>
            <div className="text-base font-bold font-heading text-slate-900 dark:text-white mt-0.5">
              1,000,000 <span className="text-xs font-normal text-slate-400">TPM</span>
            </div>
            <div className="text-[10px] text-slate-500">Tokens Per Minute</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 font-medium">โทเค็นสะสมวันนี้</div>
            <div className="text-base font-bold font-heading text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.todayTokens.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">โทเค็น</span>
            </div>
            <div className="text-[10px] text-slate-500">Prompt + Audio Output</div>
          </div>
        </div>

        {/* Last Generation Token Breakdown */}
        {stats.lastUsage && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="flex items-center space-x-1">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
                <span>สถิติการสร้างเสียงครั้งล่าสุด (Last Request Tokens)</span>
              </span>
              <span className="font-mono text-amber-700 dark:text-amber-300">
                รวม {stats.lastUsage.totalTokenCount} โทเค็น
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-amber-100 dark:border-slate-800">
                <span className="text-slate-500 text-[11px] block">ข้อความขาเข้า (Prompt Tokens):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {stats.lastUsage.promptTokenCount} โทเค็น
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-amber-100 dark:border-slate-800">
                <span className="text-slate-500 text-[11px] block">ไฟล์เสียงขาออก (Audio Output Tokens):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {stats.lastUsage.candidatesTokenCount} โทเค็น
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Offline perk banner */}
        <div className="rounded-xl p-3 bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
          <WifiOff className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 dark:text-white">เคล็ดลับ: โหมดออฟไลน์ไม่ใช้โทเค็นเลย!</strong>{' '}
            เมื่อสลับเป็นโหมดออฟไลน์ ระบบจะใช้ Web Speech API และ Web Audio DSP ในเครื่องของคุณ จึงสามารถพากย์เสียงและฟังเพลงได้ไม่จำกัดจำนวนครั้ง แม้ไม่มีอินเทอร์เน็ต
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('คุณต้องการรีเซ็ตสถิติโทเค็นประจำวันใช่หรือไม่?')) {
                setStats(resetDailyTokenStats());
              }
            }}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รีเซ็ตสถิติ</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
