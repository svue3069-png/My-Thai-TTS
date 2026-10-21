import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Repeat,
  Volume2,
  Sliders,
  Sparkles,
  Download,
  FolderOpen,
  Plus,
  Trash2,
  Mic,
  Music,
  Headphones,
  Info,
} from 'lucide-react';
import { SongProject, InstrumentTrack, ThaiScale, AudioItem } from '../types';
import { PRESET_SONGS, DEFAULT_TRACKS_TEMPLATE } from '../data/thaiSongsPresets';
import { thaiAudioEngine } from '../services/audioEngine';
import { THAI_7TET_NOTES, THAI_PENTATONIC_NOTES, getScaleNotes } from '../services/thaiInstruments';
import { saveAudioItem, getAllAudioItems } from '../services/storage';

interface SongMakerProps {
  onAudioGenerated: (audioItem: AudioItem) => void;
  onOpenExport: (audioItem: AudioItem) => void;
  initialAttachedVocal?: AudioItem | null;
}

export const SongMaker: React.FC<SongMakerProps> = ({
  onAudioGenerated,
  onOpenExport,
  initialAttachedVocal,
}) => {
  const [song, setSong] = useState<SongProject>(PRESET_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('ranat-ek');
  const [activeNotePicker, setActiveNotePicker] = useState<{ trackId: string; step: number } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [availableVocals, setAvailableVocals] = useState<AudioItem[]>([]);
  const [selectedVocalItem, setSelectedVocalItem] = useState<AudioItem | null>(initialAttachedVocal || null);
  const [liveInstrumentId, setLiveInstrumentId] = useState<string>('ranat-ek');

  // Load available TTS vocals from storage
  useEffect(() => {
    getAllAudioItems().then((items) => {
      const ttsItems = items.filter((i) => i.type === 'tts');
      setAvailableVocals(ttsItems);
    });
  }, []);

  // Sync initial attached vocal if passed from outside
  useEffect(() => {
    if (initialAttachedVocal) {
      setSelectedVocalItem(initialAttachedVocal);
      setSong((prev) => ({
        ...prev,
        attachedTTSId: initialAttachedVocal.id,
        attachedTTSTitle: initialAttachedVocal.title,
      }));
    }
  }, [initialAttachedVocal]);

  // Clean up playback on unmount
  useEffect(() => {
    return () => {
      thaiAudioEngine.stopSequencer();
    };
  }, []);

  // Handle Play / Stop
  const handleTogglePlay = () => {
    if (isPlaying) {
      thaiAudioEngine.stopSequencer();
      setIsPlaying(false);
      setActiveStep(-1);
    } else {
      setIsPlaying(true);
      thaiAudioEngine.startSequencer(
        song,
        (step) => setActiveStep(step),
        () => {
          setIsPlaying(false);
          setActiveStep(-1);
        },
        selectedVocalItem?.audioBlob
      );
    }
  };

  // Switch Preset Song
  const handleSelectPreset = (presetId: string) => {
    if (isPlaying) {
      thaiAudioEngine.stopSequencer();
      setIsPlaying(false);
      setActiveStep(-1);
    }
    const found = PRESET_SONGS.find((p) => p.id === presetId);
    if (found) {
      // Deep clone to avoid mutating preset reference
      setSong(JSON.parse(JSON.stringify(found)));
    }
  };

  // Create Blank Song
  const handleNewSong = () => {
    if (isPlaying) {
      thaiAudioEngine.stopSequencer();
      setIsPlaying(false);
    }
    const blankSong: SongProject = {
      id: `song-${Date.now()}`,
      title: 'เพลงไทยเดิมบทใหม่ (New Composition)',
      thaiTitle: 'เพลงไทยเดิมประยุกต์',
      bpm: 80,
      scale: 'thai7tet',
      tempoLevel: 'song-chan',
      stepsCount: 16,
      reverbWet: 0.35,
      tracks: JSON.parse(JSON.stringify(DEFAULT_TRACKS_TEMPLATE)),
    };
    setSong(blankSong);
  };

  // Toggle or pick step note
  const handleStepClick = (trackId: string, stepIndex: number) => {
    const track = song.tracks.find((t) => t.id === trackId);
    if (!track) return;

    if (track.category === 'rhythmic') {
      // For percussion, clicking toggles between sound 0, sound 1, and rest (null)
      const currentVal = track.steps[stepIndex];
      const nextVal = currentVal === null ? 0 : currentVal === 0 ? 1 : null;
      updateTrackStep(trackId, stepIndex, nextVal);
      // Play note immediately as acoustic feedback
      if (nextVal !== null) {
        thaiAudioEngine.playNote(trackId, nextVal, song.scale, track.volume);
      }
    } else {
      // For melodic instruments, open note picker modal or set default
      setActiveNotePicker({ trackId, step: stepIndex });
    }
  };

  const updateTrackStep = (trackId: string, stepIndex: number, noteVal: number | null) => {
    setSong((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id === trackId) {
          const newSteps = [...t.steps];
          newSteps[stepIndex] = noteVal;
          return { ...t, steps: newSteps };
        }
        return t;
      }),
    }));
  };

  // Update Track Controls (Volume, Pan, Mute, Solo)
  const handleUpdateTrack = (trackId: string, updates: Partial<InstrumentTrack>) => {
    setSong((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
    }));
  };

  // Export Master Song Audio (48kHz WAV)
  const handleExportSongMaster = async () => {
    setIsExporting(true);
    try {
      const wavBlob = await thaiAudioEngine.renderSongToWavBlob(
        song,
        2, // 2 cycles loop
        selectedVocalItem?.audioBlob
      );

      const duration = (song.stepsCount * 2 * (60 / (song.bpm * 4))) + 2.0;

      const newSongItem: AudioItem = {
        id: `song-${Date.now()}`,
        title: `${song.thaiTitle} (${song.title})`,
        text: `ประพันธ์ดนตรีไทยเดิม: ${song.thaiTitle} • อัตราจังหวะ ${song.bpm} BPM • บันไดเสียง ${song.scale === 'thai7tet' ? '7-TET (ไทยเดิม)' : 'เพนทาทอนิก'}`,
        type: 'song',
        voiceName: selectedVocalItem ? `Vocal: ${selectedVocalItem.voiceName}` : 'Traditional Ensemble (วงปี่พาทย์)',
        engine: 'instrument',
        audioBlob: wavBlob,
        duration,
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0,
        createdAt: Date.now(),
        tags: ['เพลงไทยเดิม', song.scale, `${song.bpm}BPM`],
        favorite: true,
        songData: song,
      };

      await saveAudioItem(newSongItem);
      onAudioGenerated(newSongItem);
      onOpenExport(newSongItem);
    } catch (err) {
      console.error('Song rendering error:', err);
      alert('ไม่สามารถประมวลผลไฟล์เพลงได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExporting(false);
    }
  };

  const scaleNotes = getScaleNotes(song.scale);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header & Song Project Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 text-2xl">
              🎵
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={song.thaiTitle}
                  onChange={(e) => setSong({ ...song, thaiTitle: e.target.value })}
                  className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-medium">
                  {song.scale === 'thai7tet' ? 'ระบบ 7 เสียงเท่ากัน' : 'เพนทาทอนิก'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เครื่องดนตรีปี่พาทย์และเครื่องสาย &bull; ปรับแต่งโน้ต จังหวะ และเสียงร้องพากย์ไทย
              </p>
            </div>
          </div>

          {/* Quick Presets & Blank */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">บทเพลงต้นแบบ:</span>
            {PRESET_SONGS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id!)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  song.id === p.id
                    ? 'bg-emerald-600 text-white border-emerald-600 font-medium shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-400'
                }`}
              >
                {p.thaiTitle}
              </button>
            ))}
            <button
              onClick={handleNewSong}
              className="px-2.5 py-1 text-xs rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>เริ่มแต่งใหม่</span>
            </button>
          </div>
        </div>

        {/* Master Transport Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            {/* Play/Stop button */}
            <button
              onClick={handleTogglePlay}
              className={`px-5 py-2.5 rounded-xl font-heading font-semibold text-white flex items-center space-x-2 shadow-md transition-all active:scale-95 ${
                isPlaying
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>หยุดเล่น (Stop)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>เล่นเพลง (Play)</span>
                </>
              )}
            </button>

            {/* Tempo Slider with Thai rhythm level badges */}
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">ความเร็ว:</span>
              <input
                type="range"
                min={50}
                max={150}
                step={2}
                value={song.bpm}
                onChange={(e) => setSong({ ...song, bpm: parseInt(e.target.value) })}
                className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 w-14">
                {song.bpm} BPM
              </span>
              {/* Thai rhythmic badge */}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
                {song.bpm <= 72 ? 'สามชั้น' : song.bpm <= 96 ? 'สองชั้น' : 'ชั้นเดียว'}
              </span>
            </div>

            {/* Scale System Toggle */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setSong({ ...song, scale: 'thai7tet' })}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  song.scale === 'thai7tet'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="ระบบบันไดเสียงไทยเดิม 7 เสียงเท่ากัน (171.43 cents ต่อขั้น)"
              >
                7 เสียงไทยเดิม (7-TET)
              </button>
              <button
                onClick={() => setSong({ ...song, scale: 'pentatonic' })}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  song.scale === 'pentatonic'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="เพนทาทอนิก ด-ร-ม-ซ-ล สากลผสมผสาน"
              >
                เพนทาทอนิก (Pentatonic)
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Temple Reverb Slider */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">ก้องศาลาไทย:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={song.reverbWet}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSong({ ...song, reverbWet: val });
                  thaiAudioEngine.setReverbWet(val);
                }}
                className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
                title="ระดับเสียงก้องกังวานในศาลาเรือนไทยโบราณ"
              />
              <span className="text-slate-400 font-mono text-[10px]">
                {Math.round(song.reverbWet * 100)}%
              </span>
            </div>

            {/* Attached TTS Vocal selector */}
            <div className="relative">
              <select
                value={selectedVocalItem?.id || ''}
                onChange={(e) => {
                  const item = availableVocals.find((v) => v.id === e.target.value) || null;
                  setSelectedVocalItem(item);
                  setSong((prev) => ({
                    ...prev,
                    attachedTTSId: item?.id,
                    attachedTTSTitle: item?.title,
                  }));
                }}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-xs truncate"
              >
                <option value="">-- ไม่ใส่เสียงร้องพากย์ --</option>
                {availableVocals.map((v) => (
                  <option key={v.id} value={v.id}>
                    🎙️ {v.title} ({v.voiceName})
                  </option>
                ))}
              </select>
            </div>

            {/* Studio Export Button */}
            <button
              onClick={handleExportSongMaster}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'กำลังบันทึกมาสเตอร์...' : 'ส่งออกเพลง (Master WAV)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Instrument Playable Keyboard & Virtual Pads */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <span>แป้นสัมผัสจำลองเสียงเครื่องดนตรีไทย (Virtual Instrument Pads)</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (คลิกหรือแตะเพื่อลองฟังเสียงสด)
            </span>
          </div>

          {/* Instrument select for live pads */}
          <div className="flex items-center space-x-1">
            {song.tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => setLiveInstrumentId(t.id)}
                className={`px-2 py-1 text-xs rounded-lg transition-colors flex items-center space-x-1 ${
                  liveInstrumentId === t.id
                    ? 'bg-emerald-600 text-white font-medium shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={t.thaiName}
              >
                <span>{t.icon}</span>
                <span className="hidden md:inline">{t.thaiName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* The Sound Keys / Bars */}
        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
          {scaleNotes.map((note, idx) => (
            <button
              key={idx}
              onClick={() => thaiAudioEngine.playNote(liveInstrumentId, idx, song.scale, 0.9)}
              className="py-3 px-1 rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500 hover:from-emerald-50 hover:to-emerald-100 dark:hover:from-emerald-950/40 dark:hover:to-emerald-900/40 active:scale-95 transition-all text-center group shadow-xs"
            >
              <div className="text-base font-bold font-heading text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                {note.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {note.solfege}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sequencer Grid & Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
            <span>ตารางเรียบเรียงดนตรี (16-Step Arranger Timeline)</span>
            {selectedVocalItem && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                🎙️ เสียงร้อง: {selectedVocalItem.title}
              </span>
            )}
          </h3>

          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
              <span>มีโน้ต</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-slate-700 inline-block"></span>
              <span>เว้นว่าง (พัก)</span>
            </span>
          </div>
        </div>

        {/* Step Numbers Row */}
        <div className="min-w-[700px] flex items-center space-x-2 pl-44">
          {Array.from({ length: song.stepsCount }).map((_, stepIdx) => (
            <div
              key={stepIdx}
              className={`flex-1 text-center text-[10px] font-mono py-0.5 rounded ${
                activeStep === stepIdx
                  ? 'bg-amber-500 text-white font-bold animate-pulse'
                  : stepIdx % 4 === 0
                  ? 'text-slate-800 dark:text-slate-200 font-bold'
                  : 'text-slate-400'
              }`}
            >
              {stepIdx + 1}
            </div>
          ))}
        </div>

        {/* Tracks List & Grid */}
        <div className="space-y-2 min-w-[700px]">
          {song.tracks.map((track) => (
            <div
              key={track.id}
              className={`flex items-center space-x-2 p-1.5 rounded-xl border transition-colors ${
                selectedTrackId === track.id
                  ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              {/* Track Info & Mixer Faders */}
              <div className="w-44 shrink-0 flex items-center justify-between pr-2 border-r border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xl">{track.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {track.thaiName}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{track.name}</div>
                  </div>
                </div>

                {/* Track Mute & Solo */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleUpdateTrack(track.id, { muted: !track.muted })}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      track.muted
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title={track.muted ? 'เปิดเสียง' : 'ปิดเสียง (Mute)'}
                  >
                    M
                  </button>
                  <button
                    onClick={() => handleUpdateTrack(track.id, { solo: !track.solo })}
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${
                      track.solo
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title={track.solo ? 'ยกเลิกโซโล่' : 'โซโล่ (Solo)'}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* 16 Step Buttons for this track */}
              <div className="flex-1 flex items-center space-x-1.5">
                {track.steps.map((noteVal, stepIdx) => {
                  const isCurrentActive = activeStep === stepIdx;
                  const hasNote = noteVal !== null && noteVal !== undefined;
                  const noteObj = hasNote ? scaleNotes[noteVal] : null;

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => handleStepClick(track.id, stepIdx)}
                      className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center active:scale-95 ${
                        isCurrentActive ? 'ring-2 ring-amber-500 z-10' : ''
                      } ${
                        hasNote
                          ? track.category === 'melodic'
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                          : stepIdx % 4 === 0
                          ? 'bg-slate-200/80 dark:bg-slate-750 text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={`${track.thaiName} ขั้นที่ ${stepIdx + 1}${
                        noteObj ? `: ${noteObj.name} (${noteObj.solfege})` : ': ว่าง'
                      }`}
                    >
                      {hasNote ? (
                        <span>
                          {track.category === 'melodic'
                            ? noteObj?.name || '●'
                            : noteVal === 0
                            ? 'ฉิ่ง'
                            : 'ฉาบ'}
                        </span>
                      ) : (
                        <span className="text-[9px] opacity-25">&bull;</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note Picker Modal for Melodic Track step */}
      {activeNotePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  เลือกโน้ตเสียงดนตรีไทย (ขั้นที่ {activeNotePicker.step + 1})
                </h4>
                <p className="text-xs text-slate-500">
                  ระบบเสียง: {song.scale === 'thai7tet' ? '7 เสียงเท่ากัน' : 'เพนทาทอนิก'}
                </p>
              </div>
              <button
                onClick={() => setActiveNotePicker(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Scale Notes Selector */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {scaleNotes.map((n, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    updateTrackStep(activeNotePicker.trackId, activeNotePicker.step, idx);
                    thaiAudioEngine.playNote(activeNotePicker.trackId, idx, song.scale, 0.9);
                    setActiveNotePicker(null);
                  }}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-center transition-colors group"
                >
                  <div className="font-bold text-sm font-heading">{n.name}</div>
                  <div className="text-[10px] text-slate-400 group-hover:text-white">
                    {n.solfege}
                  </div>
                </button>
              ))}
            </div>

            {/* Clear / Rest note option */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  updateTrackStep(activeNotePicker.trackId, activeNotePicker.step, null);
                  setActiveNotePicker(null);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                ลบโน้ต (เว้นวรรค)
              </button>
              <button
                onClick={() => setActiveNotePicker(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
