export type AudioType = 'tts' | 'song';

export interface AudioItem {
  id: string;
  title: string;
  text: string;
  type: AudioType;
  voiceName: string;
  engine: 'gemini' | 'offline' | 'instrument';
  audioBlob: Blob;
  duration: number; // in seconds
  speed: number;
  pitch: number;
  volume: number;
  createdAt: number;
  tags: string[];
  favorite: boolean;
  songData?: SongProject;
}

export type ThaiScale = 'thai7tet' | 'pentatonic';

export type ThaiTempoLevel = 'sam-chan' | 'song-chan' | 'chan-dieo';

export interface InstrumentTrack {
  id: string;
  name: string;
  thaiName: string;
  icon: string;
  category: 'melodic' | 'rhythmic';
  volume: number; // 0 to 1
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  steps: (number | null)[]; // step index to note index (0-13) or null
}

export interface SongProject {
  id?: string;
  title: string;
  thaiTitle: string;
  bpm: number;
  scale: ThaiScale;
  tempoLevel: ThaiTempoLevel;
  stepsCount: number; // 16 or 32
  tracks: InstrumentTrack[];
  reverbWet: number; // 0 to 1
  attachedTTSId?: string; // id of an AudioItem to play alongside
  attachedTTSTitle?: string;
}

export interface ThaiVoicePersona {
  id: string;
  name: string;
  gender: 'female' | 'male';
  thaiName: string;
  description: string;
  tag: string;
  samplePhrase: string;
  recommendedStyle: string;
}
