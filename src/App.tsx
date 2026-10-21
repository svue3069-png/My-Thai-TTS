/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TTSStudio } from './components/TTSStudio';
import { SongMaker } from './components/SongMaker';
import { HistoryTab } from './components/HistoryTab';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { ExportModal } from './components/ExportModal';
import { GuideModal } from './components/GuideModal';
import { ThaiLyricsModal } from './components/ThaiLyricsModal';
import { AudioItem } from './types';
import { getAllAudioItems, getStorageQuota } from './services/storage';
import { Sparkles, Music, Mic, History, Download, BookOpen, Volume2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tts' | 'song' | 'history' | 'export' | 'guide'>('tts');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('thai_studio_dark_mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState<AudioItem | null>(null);
  const [exportModalItem, setExportModalItem] = useState<AudioItem | null>(null);
  const [songAttachedVocal, setSongAttachedVocal] = useState<AudioItem | null>(null);
  const [showLyricsModal, setShowLyricsModal] = useState<boolean>(false);
  const [storageCount, setStorageCount] = useState<number>(0);

  // Sync dark mode class to root document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('thai_studio_dark_mode', darkMode.toString());
  }, [darkMode]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update storage items count
  const refreshStorageCount = async () => {
    try {
      const quota = await getStorageQuota();
      setStorageCount(quota.count);
    } catch {}
  };

  useEffect(() => {
    refreshStorageCount();
  }, [activeTab]);

  // Handlers for cross-tab communication
  const handleAudioGenerated = (item: AudioItem) => {
    setCurrentPlayingAudio(item);
    refreshStorageCount();
  };

  const handleSendToSongMaker = (item: AudioItem) => {
    setSongAttachedVocal(item);
    setActiveTab('song');
  };

  const handleOpenExport = (item: AudioItem) => {
    setExportModalItem(item);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-amber-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        storageCount={storageCount}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick action bar for Lyrics Assistant */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>สตูดิโอพร้อมใช้งาน: ระบบเสียง 48kHz &bull; 7-TET &bull; IndexedDB แคชในเครื่อง</span>
          </div>

          <button
            onClick={() => setShowLyricsModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-emerald-600 text-white shadow-xs hover:opacity-95 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>ขอไอเดียคำกลอน &amp; เนื้อร้อง</span>
          </button>
        </div>

        {/* Tab 1: Thai TTS Studio */}
        {activeTab === 'tts' && (
          <TTSStudio
            onAudioGenerated={handleAudioGenerated}
            onSendToSongMaker={handleSendToSongMaker}
            onOpenExport={handleOpenExport}
            isOfflineMode={isOfflineMode}
          />
        )}

        {/* Tab 2: Traditional Thai Song Maker */}
        {activeTab === 'song' && (
          <SongMaker
            onAudioGenerated={handleAudioGenerated}
            onOpenExport={handleOpenExport}
            initialAttachedVocal={songAttachedVocal}
          />
        )}

        {/* Tab 3: History & Offline Audio Library */}
        {activeTab === 'history' && (
          <HistoryTab
            onPlayAudio={(item) => setCurrentPlayingAudio(item)}
            onSendToSongMaker={handleSendToSongMaker}
            onOpenExport={handleOpenExport}
          />
        )}

        {/* Tab 4: Studio Export Overview */}
        {activeTab === 'export' && (
          <div className="space-y-6 pb-24">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                    ศูนย์ส่งออกระดับสตูดิโอ (Studio Export Center)
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    ส่งออกเสียงพากย์และเพลงไทยเดิมคุณภาพระดับมืออาชีพ พร้อมคำบรรยาย SRT และการ์ดแชร์
                  </p>
                </div>
              </div>

              {currentPlayingAudio ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        ไฟล์ปัจจุบันที่เลือก
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {currentPlayingAudio.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {currentPlayingAudio.voiceName} &bull; ~{currentPlayingAudio.duration.toFixed(1)} วินาที
                      </p>
                    </div>

                    <button
                      onClick={() => setExportModalItem(currentPlayingAudio)}
                      className="px-5 py-2.5 rounded-xl font-heading font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/25 flex items-center space-x-2 transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>เปิดเครื่องมือส่งออก</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <Volume2 className="w-8 h-8 mx-auto text-slate-400" />
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                    กรุณาเลือกไฟล์เสียงที่ต้องการส่งออก
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    คุณสามารถเลือกไฟล์จากแท็บ &ldquo;ประวัติไฟล์&rdquo; หรือสร้างเสียงใหม่ใน &ldquo;พากย์เสียง TTS&rdquo; หรือ &ldquo;แต่งเพลงไทย&rdquo;
                  </p>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
                  >
                    ไปยังประวัติไฟล์เสียง
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Guide View */}
        {activeTab === 'guide' && (
          <GuideModal onClose={() => setActiveTab('tts')} />
        )}
      </main>

      {/* Floating Bottom Audio Player Bar */}
      {currentPlayingAudio && (
        <AudioPlayerBar
          currentAudio={{
            title: currentPlayingAudio.title,
            blob: currentPlayingAudio.audioBlob,
            duration: currentPlayingAudio.duration,
            text: currentPlayingAudio.text,
            voiceName: currentPlayingAudio.voiceName,
          }}
          onClose={() => setCurrentPlayingAudio(null)}
          onSendToSongMaker={(item) => handleSendToSongMaker(currentPlayingAudio)}
          onOpenExport={(item) => handleOpenExport(currentPlayingAudio)}
        />
      )}

      {/* Export Modal */}
      {exportModalItem && (
        <ExportModal
          item={exportModalItem}
          onClose={() => setExportModalItem(null)}
        />
      )}

      {/* Thai Lyrics & Verse Assistant Modal */}
      {showLyricsModal && (
        <ThaiLyricsModal
          onClose={() => setShowLyricsModal(false)}
          onApplyLyrics={(lyrics, title) => {
            // If user applies lyrics, switch to TTS studio with the new lyrics
            setActiveTab('tts');
          }}
        />
      )}
    </div>
  );
}
