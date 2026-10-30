import React, { useState, useEffect } from 'react';
import { Volume2, Moon, Sun, Wifi, WifiOff, Sparkles, Music, Mic, History, Share2, HelpCircle, Zap } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { getTokenStats, FREE_TIER_LIMITS } from '../services/tokenTracker';

interface NavbarProps {
  activeTab: 'tts' | 'song' | 'history' | 'export' | 'guide';
  setActiveTab: (tab: 'tts' | 'song' | 'history' | 'export' | 'guide') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (val: boolean) => void;
  storageCount: number;
  onOpenTokenLimits?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  isOfflineMode,
  setIsOfflineMode,
  storageCount,
  onOpenTokenLimits,
}) => {
  const [tokenStats, setTokenStats] = useState(getTokenStats());

  useEffect(() => {
    const handleStats = () => setTokenStats(getTokenStats());
    window.addEventListener('token-stats-updated', handleStats);
    return () => window.removeEventListener('token-stats-updated', handleStats);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-amber-900/10 dark:border-amber-500/20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('tts')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <span className="text-xl font-bold font-heading">ไ</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-heading font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  Thai Audio Studio
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  เสียงไทย &amp; ดนตรีเดิม
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Natural Thai TTS &bull; Traditional Song Maker &bull; Offline Studio
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('tts')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tts'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>พากย์เสียง TTS</span>
            </button>

            <button
              onClick={() => setActiveTab('song')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'song'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>แต่งเพลงไทย</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>ประวัติไฟล์</span>
              {storageCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {storageCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'export'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>ส่งออกสตูดิโอ</span>
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* PWA Install Button */}
            <PWAInstallButton variant="navbar" />

            {/* Free Tier Token Quota Button */}
            {onOpenTokenLimits && (
              <button
                onClick={onOpenTokenLimits}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                title="คลิกเพื่อดูการใช้งานโทเค็นและขีดจำกัดเวอร์ชันฟรี"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span className="font-mono font-bold">
                  {tokenStats.todayRequests}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  /{FREE_TIER_LIMITS.rpd.toLocaleString()} ฟรี
                </span>
              </button>
            )}

            {/* Offline Mode Toggle Button */}
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              title={isOfflineMode ? 'อยู่ในโหมดออฟไลน์ (คลิกเพื่อต่อออนไลน์)' : 'อยู่ในโหมดออนไลน์ (คลิกเพื่อทดสอบออฟไลน์)'}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isOfflineMode
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-rose-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
              <span className="hidden sm:inline">{isOfflineMode ? 'ออฟไลน์ (Offline)' : 'ออนไลน์ (AI Neural)'}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Guide Button */}
            <button
              onClick={() => setActiveTab('guide')}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="คู่มือการใช้งานและดนตรีไทย"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('tts')}
            className={`flex flex-col items-center py-1 px-2 text-xs font-medium ${
              activeTab === 'tts' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Mic className="w-4 h-4 mb-0.5" />
            <span>พากย์เสียง</span>
          </button>
          <button
            onClick={() => setActiveTab('song')}
            className={`flex flex-col items-center py-1 px-2 text-xs font-medium ${
              activeTab === 'song' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Music className="w-4 h-4 mb-0.5" />
            <span>แต่งเพลง</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-1 px-2 text-xs font-medium relative ${
              activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            <span>ประวัติ ({storageCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex flex-col items-center py-1 px-2 text-xs font-medium ${
              activeTab === 'export' ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Share2 className="w-4 h-4 mb-0.5" />
            <span>ส่งออก</span>
          </button>
        </div>
      </div>
    </header>
  );
};
