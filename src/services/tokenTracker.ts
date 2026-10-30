import { TokenUsage } from '../types';

export interface FreeTierLimits {
  rpm: number; // Requests Per Minute (15)
  rpd: number; // Requests Per Day (1,500)
  tpm: number; // Tokens Per Minute (1,000,000)
  maxContextTokens: number; // 1,048,576 tokens
  tierName: string;
}

export const FREE_TIER_LIMITS: FreeTierLimits = {
  rpm: 10,
  rpd: 100,
  tpm: 1000000,
  maxContextTokens: 1048576,
  tierName: 'Google AI Studio Free Tier (เวอร์ชันฟรี)',
};

export interface TokenStats {
  todayRequests: number;
  todayTokens: number;
  todayPromptTokens: number;
  todayCandidatesTokens: number;
  lastUsage: TokenUsage | null;
  lastUpdatedDate: string;
}

const STORAGE_KEY = 'thai_studio_token_stats';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTokenStats(): TokenStats {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: TokenStats = JSON.parse(raw);
      // Reset if it is a new day
      if (data.lastUpdatedDate === today) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Error reading token stats:', e);
  }

  // Initial fresh state for today
  const fresh: TokenStats = {
    todayRequests: 0,
    todayTokens: 0,
    todayPromptTokens: 0,
    todayCandidatesTokens: 0,
    lastUsage: null,
    lastUpdatedDate: today,
  };
  saveTokenStats(fresh);
  return fresh;
}

function saveTokenStats(stats: TokenStats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent('token-stats-updated', { detail: stats }));
  } catch (e) {
    console.warn('Error saving token stats:', e);
  }
}

export function recordTokenUsage(usage: TokenUsage, isOffline: boolean = false) {
  if (isOffline) {
    // Offline mode does not consume Gemini API tokens!
    return;
  }

  const current = getTokenStats();
  const updated: TokenStats = {
    todayRequests: current.todayRequests + 1,
    todayTokens: current.todayTokens + (usage.totalTokenCount || 0),
    todayPromptTokens: current.todayPromptTokens + (usage.promptTokenCount || 0),
    todayCandidatesTokens: current.todayCandidatesTokens + (usage.candidatesTokenCount || 0),
    lastUsage: usage,
    lastUpdatedDate: getTodayKey(),
  };

  saveTokenStats(updated);
}

/**
 * Estimates token count for Thai text in Gemini tokenizer
 * Thai characters average ~0.8-1.1 tokens per character due to UTF-8 multibyte subword tokens
 */
export function estimateThaiTokens(text: string): number {
  if (!text || !text.trim()) return 0;
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const otherChars = text.length - thaiChars;
  // Thai characters take ~0.9 tokens each, plus English/spaces ~0.35 tokens
  const estimated = Math.ceil(thaiChars * 0.9 + otherChars * 0.35);
  // Add 12 tokens for model system & speech instructions overhead
  return Math.max(1, estimated + 12);
}

export const PAID_TIER_COST = {
  inputPer1k: 0.0001, // $0.10 per 1M tokens = $0.0001 per 1k
  outputPer1k: 0.0004, // $0.40 per 1M tokens (audio is more expensive to generate)
};

export function calculateEstimatedCost(text: string): number {
  const tokens = estimateThaiTokens(text);
  // Estimate output tokens as roughly 1.5x input for TTS metadata + audio density
  const outputTokens = Math.ceil(tokens * 1.5);
  const cost = (tokens / 1000) * PAID_TIER_COST.inputPer1k + (outputTokens / 1000) * PAID_TIER_COST.outputPer1k;
  return Number(cost.toFixed(6));
}

export function isQuotaExceeded(): boolean {
  const stats = getTokenStats();
  return stats.todayRequests >= FREE_TIER_LIMITS.rpd;
}

export function resetDailyTokenStats() {
  const fresh: TokenStats = {
    todayRequests: 0,
    todayTokens: 0,
    todayPromptTokens: 0,
    todayCandidatesTokens: 0,
    lastUsage: null,
    lastUpdatedDate: getTodayKey(),
  };
  saveTokenStats(fresh);
  return fresh;
}
