import React, { useState, useEffect } from 'react';
import {
  History,
  Play,
  Pause,
  Download,
  Trash2,
  Star,
  Search,
  Filter,
  Music,
  Mic,
  Calendar,
  Clock,
  HardDrive,
  FileAudio,
  Share2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { AudioItem } from '../types';
import {
  getAllAudioItems,
  deleteAudioItem,
  toggleFavorite,
  updateAudioItemTitle,
  getStorageQuota,
  clearAllAudioItems,
} from '../services/storage';

interface HistoryTabProps {
  onPlayAudio: (item: AudioItem) => void;
  onSendToSongMaker: (item: AudioItem) => void;
  onOpenExport: (item: AudioItem) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  onPlayAudio,
  onSendToSongMaker,
  onOpenExport,
}) => {
  const [items, setItems] = useState<AudioItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'tts' | 'song' | 'favorite'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quota, setQuota] = useState<{ count: number; estimatedSizeMB: number }>({
    count: 0,
    estimatedSizeMB: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState<string>('');

  const loadItems = async () => {
    const all = await getAllAudioItems();
    setItems(all);
    const q = await getStorageQuota();
    setQuota(q);
  };

  useEffect(() => {
    loadItems();
    window.addEventListener('storage-changed', loadItems);
    return () => window.removeEventListener('storage-changed', loadItems);
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Use a simpler approach that avoids blocking window.confirm which can be problematic in sandboxes
    try {
      await deleteAudioItem(id);
      // loadItems() is called automatically via storage-changed event
    } catch (err) {
      console.error('Failed to delete item', err);
    }
  };

  const handleToggleFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(id);
    loadItems();
  };

  const handleStartRename = (item: AudioItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitleText(item.title);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitleText.trim()) {
      await updateAudioItemTitle(id, editTitleText.trim());
      setEditingId(null);
      loadItems();
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllAudioItems();
      // loadItems() is called automatically via storage-changed event
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  // Filter & Search logic
  const filteredItems = items.filter((item) => {
    if (filterType === 'tts' && item.type !== 'tts') return false;
    if (filterType === 'song' && item.type !== 'song') return false;
    if (filterType === 'favorite' && !item.favorite) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchText = item.text.toLowerCase().includes(q);
      const matchVoice = item.voiceName.toLowerCase().includes(q);
      return matchTitle || matchText || matchVoice;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Storage Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center justify-center">
                <History className="w-4 h-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-white">
                ประวัติไฟล์เสียงและเพลงที่บันทึก (Audio History)
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ไฟล์ทั้งหมดบันทึกในฐานข้อมูล IndexedDB ในอุปกรณ์ของคุณ สามารถเปิดฟังซ้ำ ปรับสปีด และส่งออกได้แม้ไม่มีอินเทอร์เน็ต
            </p>
          </div>

          {/* Storage Quota Gauge */}
          <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {quota.count} รายการ ({quota.estimatedSizeMB} MB)
                </div>
                <div className="text-[10px] text-slate-400">หน่วยความจำออฟไลน์</div>
              </div>
            </div>

            {quota.count > 0 && (
              <button
                onClick={handleClearAll}
                className="text-rose-600 dark:text-rose-400 hover:underline text-xs flex items-center space-x-1 border-l border-slate-200 dark:border-slate-700 pl-3"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างทั้งหมด</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Filter Pills */}
          <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'tts', label: 'เสียงพากย์ TTS' },
              { id: 'song', label: 'เพลงไทยเดิม' },
              { id: 'favorite', label: 'รายการโปรด ★' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  filterType === f.id
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64 flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเรื่อง หรือข้อความ..."
              className="w-full pl-9 pr-8 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="ล้างการค้นหา (Clear search)"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audio Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileAudio className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery ? 'ไม่พบไฟล์เสียงที่ตรงกับการค้นหา' : 'ยังไม่มีประวัติไฟล์เสียง'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            สร้างเสียงพากย์ภาษาไทยใหม่ในแท็บ &ldquo;พากย์เสียง TTS&rdquo; หรือแต่งเพลงในแท็บ &ldquo;แต่งเพลงไทย&rdquo; เพื่อบันทึกไฟล์ไว้ที่นี่
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onPlayAudio(item)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-3"
            >
              <div>
                {/* Header badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                        item.type === 'song'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {item.type === 'song' ? <Music className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {item.type === 'song' ? 'เพลงไทยเดิม' : 'เสียงพากย์ TTS'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => handleToggleFav(item.id, e)}
                      className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                      title={item.favorite ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          item.favorite ? 'text-amber-500 fill-amber-500' : ''
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                      title="ลบไฟล์เสียง"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="mt-2">
                  {editingId === item.id ? (
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        className="text-sm font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-indigo-500 w-full focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={(e) => handleSaveRename(item.id, e)}
                        className="p-1 text-emerald-600"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group/title">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <button
                        onClick={(e) => handleStartRename(item, e)}
                        className="opacity-0 group-hover/title:opacity-100 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title="เปลี่ยนชื่อ"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.text}
                  </p>
                </div>
              </div>

              {/* Metadata & Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>~{item.duration.toFixed(1)} วินาที</span>
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString('th-TH')}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onPlayAudio(item)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 flex items-center space-x-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>เปิดฟัง</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {item.type === 'tts' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendToSongMaker(item);
                        }}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        title="ใช้เป็นเสียงร้องในเพลงไทยเดิม"
                      >
                        <Music className="w-3.5 h-3.5 inline mr-1" />
                        <span>ใส่ในเพลง</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenExport(item);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1"
                      title="ส่งออกระดับสตูดิโอ"
                    >
                      <Download className="w-3 h-3" />
                      <span>ส่งออก</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
