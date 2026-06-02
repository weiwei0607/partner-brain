import Dexie, { type Table } from 'dexie';

export const RELATIONSHIPS = ['男友', '女友', '老公', '老婆', '閨蜜', '好友', '爸爸', '媽媽', '兄弟', '姊妹', '同事', '其他'] as const;
export type Relationship = typeof RELATIONSHIPS[number];

export const AVATARS = ['🧑', '👦', '👧', '👨', '👩', '🧔', '👴', '👵', '🧒', '🐱', '🐶', '🌸', '⭐', '🔥', '💎'] as const;

export interface Person {
  id: string;
  name: string;
  relationship: Relationship;
  avatar: string;
  color: string;
  birthDate?: string;      // YYYY-MM-DD
  birthTime?: string;      // HH:MM
  birthPlace?: string;
  mbti?: string;
  zodiac?: string;
  baziResult?: string;     // calculated or imported text
  destinyNotes?: string;   // pasted from family-destiny-app
  createdAt: number;
  updatedAt: number;
}

export type MemoryCategory = '喜好' | '不喜歡' | '故事' | '想做的事' | '家人朋友' | '重要日期' | '隨手記';

export const MEMORY_CATEGORIES: MemoryCategory[] = ['喜好', '不喜歡', '故事', '想做的事', '家人朋友', '重要日期', '隨手記'];

export const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  '喜好': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  '不喜歡': 'bg-red-500/20 text-red-300 border-red-500/30',
  '故事': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  '想做的事': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  '家人朋友': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  '重要日期': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  '隨手記': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export const CATEGORY_EMOJI: Record<MemoryCategory, string> = {
  '喜好': '💚', '不喜歡': '🚫', '故事': '💬', '想做的事': '⭐',
  '家人朋友': '👥', '重要日期': '📅', '隨手記': '📝',
};

export interface Memory {
  id: string;
  personId: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  sourceText?: string;
  outdated?: boolean;   // 喜好改變後標記為過時，保留歷史但不算進主要分析
  createdAt: number;
}

export interface Interest {
  id: string;
  personId: string;
  content: string;           // inferred interest description
  confidence: 'high' | 'medium' | 'low';
  sourceDescription: string; // what the screenshot showed
  imageThumbnail?: string;   // small base64 preview
  tags: string[];
  createdAt: number;
}

export interface GiftAnalysis {
  id: string;
  personId: string;
  input: string;
  result: string;
  createdAt: number;
}

export const PERSON_COLORS = [
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-fuchsia-500 to-pink-600',
  'from-cyan-500 to-sky-600',
  'from-indigo-500 to-violet-600',
];

class RelationBrainDB extends Dexie {
  persons!: Table<Person>;
  memories!: Table<Memory>;
  interests!: Table<Interest>;
  giftAnalyses!: Table<GiftAnalysis>;

  constructor() {
    super('RelationBrain');
    this.version(1).stores({
      persons: 'id, createdAt',
      memories: 'id, personId, category, createdAt, *tags',
      interests: 'id, personId, createdAt',
      giftAnalyses: 'id, personId, createdAt',
    });
  }
}

export const db = new RelationBrainDB();

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback for older browsers
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
