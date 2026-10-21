import React, { useState } from 'react';
import { Download, Smartphone, Monitor, CheckCircle, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'banner' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running in standalone mode (already installed), show installed badge or return
  if (isInstalled) {
    if (variant === 'navbar') {
      return (
        <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>ติดตั้งแล้ว</span>
        </span>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'navbar' && (
        <button
          onClick={handleInstallClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          title="ดาวน์โหลดและติดตั้งแอปลงในเครื่อง (Install App)"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span>ติดตั้งแอป</span>
        </button>
      )}

      {variant === 'banner' && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 p-0.5 shadow-lg">
          <div className="bg-white dark:bg-slate-900 rounded-[15px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold font-heading text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>ดาวน์โหลดและติดตั้งเป็นแอปในเครื่อง (Install App)</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-normal">
                    ใช้งานออฟไลน์ได้
                  </span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  ติดตั้งลงหน้าจอโฮมมือถือ แท็บเล็ต หรือคอมพิวเตอร์ เปิดใช้งานได้รวดเร็วเหมือนแอปแท้
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20 flex items-center justify-center space-x-1.5 transition-all active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>ติดตั้งทันที (Install)</span>
            </button>
          </div>
        </div>
      )}

      {/* Installation Guide Modal (for iOS, Safari, or manual installation) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-5 animate-fade-in my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-heading text-slate-900 dark:text-white">
                    วิธีติดตั้งแอป (How to Install)
                  </h3>
                  <p className="text-xs text-slate-500">Thai TTS &amp; Traditional Song Studio</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instruction cards by platform */}
            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              {/* iPhone / iPad */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 space-y-2">
                <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>สำหรับ iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                  <li>
                    แตะปุ่ม <strong>แชร์ (Share)</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-500" /> ที่แถบเครื่องมือด้านล่าง
                  </li>
                  <li>
                    เลื่อนลงแล้วเลือก <strong>&ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo; (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-amber-600" />
                  </li>
                  <li>แตะ <strong>&ldquo;เพิ่ม&rdquo; (Add)</strong> ที่มุมขวาบน</li>
                </ol>
              </div>

              {/* Android / Chrome */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-slate-800/80 border border-emerald-200 dark:border-slate-700 space-y-2">
                <div className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>สำหรับ Android (Chrome / Samsung):</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  แตะเมนู <strong>จุดสามจุด (⋮)</strong> มุมขวาบน &rarr; เลือก <strong>&ldquo;ติดตั้งแอป&rdquo; (Install App)</strong> หรือ <strong>&ldquo;เพิ่มลงในหน้าจอหลัก&rdquo;</strong>
                </p>
              </div>

              {/* Windows / Mac / Desktop Chrome & Edge */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <Monitor className="w-4 h-4 text-indigo-500" />
                  <span>สำหรับคอมพิวเตอร์ (Chrome / Edge):</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  คลิกไอคอน <strong>ติดตั้ง (Install)</strong> ที่แถบที่อยู่ URL ด้านบนขวาของเบราว์เซอร์ แล้วกดยืนยัน &ldquo;ติดตั้ง&rdquo;
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl font-medium text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
              >
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
