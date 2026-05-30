import Dexie, { type Table } from 'dexie';

export type MemoryCategory =
  | '喜好'
  | '不喜歡'
  | '故事'
  | '想做的事'
  | '家人朋友'
  | '重要日期'
  | '隨手記';

export interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  source?: string;
  createdAt: number;
}

export interface GiftAnalysis {
  id: string;
  input: string;
  result: string;
  createdAt: number;
}

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
  '喜好': '💚',
  '不喜歡': '🚫',
  '故事': '💬',
  '想做的事': '⭐',
  '家人朋友': '👥',
  '重要日期': '📅',
  '隨手記': '📝',
};

class PartnerBrainDB extends Dexie {
  memories!: Table<Memory>;
  giftAnalyses!: Table<GiftAnalysis>;

  constructor() {
    super('PartnerBrain');
    this.version(1).stores({
      memories: 'id, category, createdAt, *tags',
      giftAnalyses: 'id, createdAt',
    });
  }
}

export const db = new PartnerBrainDB();
