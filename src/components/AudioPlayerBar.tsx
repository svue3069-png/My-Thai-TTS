import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Download, Share2, Music2, Sliders, Repeat, Sparkles, FileText } from 'lucide-react';
import { AudioItem } from '../types';

interface AudioPlayerBarProps {
  currentAudio: {
    title: string;
    blob: Blob;
    duration?: number;
    text?: string;
    voiceName?: string;
    chunks?: any[];
  } | null;
  onClose?: () => void;
  onSendToSongMaker?: (audioItem: any) => void;
  onOpenExport?: (audioItem: any) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  currentAudio,
  onClose,
  onSendToSongMaker,
  onOpenExport,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [pitchSemitones, setPitchSemitones] = useState(0); // -6 to +6
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showPitchControls, setShowPitchControls] = useState(false);
  const [activeChunkIndex, setActiveChunkIndex] = useState(-1);
  const [showLyricsOverlay, setShowLyricsOverlay] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Setup audio element and object URL
  useEffect(() => {
    if (!currentAudio?.blob) return;

    const url = URL.createObjectURL(currentAudio.blob);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackSpeed;
    audio.loop = isLooping;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || currentAudio.duration || 1);
    };

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);

      // Update active chunk for follow-read highlighting
      if (currentAudio?.chunks && currentAudio.chunks.length > 0) {
        const index = currentAudio.chunks.findIndex((chunk, i) => {
          const nextChunk = currentAudio.chunks?.[i + 1];
          return time >= chunk.startOffset && (!nextChunk || time < nextChunk.startOffset);
        });
        setActiveChunkIndex(index);
      }
    };

    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Auto-play on change
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));

    // Connect Web Audio Analyser for live visualizer
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!sourceNodeRef.current && audio) {
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        sourceNodeRef.current = source;
        analyserRef.current = analyser;
      }
    } catch (e) {
      // Audio element might already be connected
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      URL.revokeObjectURL(url);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentAudio?.blob]);

  // Handle Play/Pause
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  // Handle Speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      // Preserves pitch or allows shift
      (audioRef.current as any).preservesPitch = pitchSemitones === 0;
    }
  };

  // Handle Pitch Shift
  const handlePitchChange = (semitones: number) => {
    setPitchSemitones(semitones);
    if (audioRef.current) {
      // Shifting pitch via combined playback rate and pitch ratio
      const pitchRatio = Math.pow(2, semitones / 12);
      (audioRef.current as any).preservesPitch = false;
      audioRef.current.playbackRate = playbackSpeed * pitchRatio;
    }
  };

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Handle Volume
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  // Live Waveform visualizer animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!analyserRef.current || !isPlaying) {
        // Draw resting gentle waveform
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.08 + Date.now() * 0.002) * (isPlaying ? 6 : 2);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.9;

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#f59e0b');
        gradient.addColorStop(1, '#10b981');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentAudio) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 border-t border-amber-900/10 dark:border-amber-500/20 backdrop-blur-md shadow-2xl p-3 sm:px-6 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Info & Live Canvas */}
        <div className="flex items-center space-x-3 w-full md:w-1/4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md">
            <Music2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {currentAudio.title || 'เสียงบรรยายภาษาไทย'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {currentAudio.voiceName || 'Thai Voice'} &bull; {currentAudio.text ? currentAudio.text.slice(0, 30) + '...' : 'Audio Master'}
            </p>
          </div>
          {/* Mini Waveform Visualizer */}
          <canvas
            ref={canvasRef}
            width={72}
            height={28}
            className="rounded bg-slate-100 dark:bg-slate-800/80 shrink-0 hidden sm:block"
          />
        </div>

        {/* Playback Controls & Progress bar */}
        <div className="flex flex-col items-center w-full md:w-1/2 space-y-1">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                  setIsPlaying(true);
                }
              }}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white p-1"
              title="เริ่มใหม่ (Restart)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={() => {
                setIsLooping(!isLooping);
                if (audioRef.current) audioRef.current.loop = !isLooping;
              }}
              className={`p-1 transition-colors ${
                isLooping ? 'text-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
              title={isLooping ? 'วนซ้ำเปิดอยู่' : 'เปิดการวนซ้ำ'}
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Speed Presets Toggle */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
              {[0.75, 1.0, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-1.5 py-0.5 text-[11px] rounded font-medium transition-colors ${
                    playbackSpeed === s
                      ? 'bg-amber-500 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Pitch Adjust Accessibility Button */}
            <button
              onClick={() => setShowPitchControls(!showPitchControls)}
              className={`p-1.5 rounded-lg text-xs flex items-center space-x-1 border transition-colors ${
                pitchSemitones !== 0 || showPitchControls
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                  : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="ปรับระดับเสียงสูง-ต่ำ (Pitch Shift)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px]">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones < 0 ? pitchSemitones : 'คีย์'}
              </span>
            </button>
          </div>

          {/* Scrub Timeline */}
          <div className="flex items-center space-x-2 w-full max-w-md">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Expandable Pitch slider for Accessibility */}
          {showPitchControls && (
            <div className="flex items-center space-x-3 bg-amber-50 dark:bg-slate-800/90 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-slate-700 text-xs">
              <span className="text-amber-800 dark:text-amber-300 font-medium">ระดับเสียงแหลม-ทุ้ม:</span>
              <input
                type="range"
                min={-6}
                max={6}
                step={1}
                value={pitchSemitones}
                onChange={(e) => handlePitchChange(parseInt(e.target.value))}
                className="w-28 h-1 bg-amber-200 dark:bg-slate-600 rounded cursor-pointer accent-emerald-500"
              />
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {pitchSemitones === 0 ? 'เสียงปกติ (0)' : `${pitchSemitones > 0 ? '+' : ''}${pitchSemitones} สเกล`}
              </span>
              <button
                onClick={() => handlePitchChange(0)}
                className="text-[10px] underline text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-1"
              >
                รีเซ็ต
              </button>
            </div>
          )}
        </div>

        {/* Volume & Studio Actions */}
        <div className="flex items-center justify-end space-x-2 w-full md:w-1/4">
          <div className="flex items-center space-x-1.5 hidden sm:flex">
            <button onClick={toggleMute} className="text-slate-500 hover:text-slate-800 dark:text-slate-400">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Send to Song Maker button */}
          {onSendToSongMaker && (
            <button
              onClick={() => onSendToSongMaker(currentAudio)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200 transition-colors flex items-center space-x-1"
              title="ใช้เป็นเสียงร้องในเพลงไทยเดิม"
            >
              <Music2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">ใส่ในเพลง</span>
            </button>
          )}

          {/* Export Studio Modal Trigger */}
          {onOpenExport && (
            <button
              onClick={() => onOpenExport(currentAudio)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-colors flex items-center space-x-1 shadow-sm shrink-0"
              title="ส่งออกระดับสตูดิโอ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก</span>
            </button>
          )}

          {/* Lyrics/Follow-Read Overlay Toggle */}
          {currentAudio.chunks && currentAudio.chunks.length > 0 && (
            <button
              onClick={() => setShowLyricsOverlay(!showLyricsOverlay)}
              className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                showLyricsOverlay 
                  ? 'bg-amber-500 text-white border-amber-600' 
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 border-transparent'
              }`}
              title="แสดงข้อความอ่านตาม (Follow Read)"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Follow-Read Highlighting Overlay */}
      {showLyricsOverlay && currentAudio.chunks && (
        <div className="max-w-7xl mx-auto mt-3 pb-2 animate-slide-up">
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden">
            <div className="flex flex-wrap gap-2 leading-relaxed">
              {currentAudio.chunks.map((chunk, i) => (
                <span
                  key={i}
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = chunk.startOffset;
                      setCurrentTime(chunk.startOffset);
                      if (!isPlaying) togglePlay();
                    }
                  }}
                  className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-all duration-300 text-sm ${
                    i === activeChunkIndex
                      ? 'bg-amber-500 text-white font-bold scale-105 shadow-md shadow-amber-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                  }`}
                >
                  {chunk.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
