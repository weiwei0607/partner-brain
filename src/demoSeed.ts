import { db, type Person, type Memory, type Interest } from './db';

// 示範資料：讓沒有 API Key 的訪客也能看到完整介面與資料結構。
// AI 相關功能（截圖抽興趣、禮物分析、問 AI）仍需自備金鑰。

const now = Date.now();
const day = 86400000;

const persons: Person[] = [
  {
    id: 'demo-mom',
    name: '媽媽',
    relationship: '媽媽',
    avatar: '👩',
    color: 'from-rose-500 to-pink-600',
    birthDate: '1968-04-12',
    birthTime: '07:30',
    birthPlace: '臺北',
    mbti: 'ISFJ',
    zodiac: '牡羊座',
    destinyNotes: '土旺，重視安穩與家庭秩序；對變動的接受度低，需要被提前告知而不是事後通知。',
    createdAt: now - 40 * day,
    updatedAt: now - 2 * day,
  },
  {
    id: 'demo-friend',
    name: '小魚',
    relationship: '閨蜜',
    avatar: '🐱',
    color: 'from-violet-500 to-purple-600',
    birthDate: '1999-11-03',
    birthTime: '21:15',
    birthPlace: '高雄',
    mbti: 'ENFP',
    zodiac: '天蠍座',
    destinyNotes: '火旺，行動快、耐性短；適合一起做短期有回饋的事，長線計畫容易半途轉向。',
    createdAt: now - 26 * day,
    updatedAt: now - 1 * day,
  },
  {
    id: 'demo-colleague',
    name: '阿哲',
    relationship: '同事',
    avatar: '🧔',
    color: 'from-emerald-500 to-teal-600',
    birthDate: '1994-06-21',
    mbti: 'INTJ',
    zodiac: '雙子座',
    createdAt: now - 12 * day,
    updatedAt: now - 3 * day,
  },
];

const mem = (
  id: string, personId: string, content: string,
  category: Memory['category'], tags: string[], ago: number
): Memory => ({ id, personId, content, category, tags, createdAt: now - ago * day });

const memories: Memory[] = [
  mem('dm1', 'demo-mom', '不喜歡有香味的東西，護手霜買無香的', '不喜歡', ['禮物', '日用品'], 38),
  mem('dm2', 'demo-mom', '一直說想去京都看楓葉，但覺得團費太貴捨不得', '想做的事', ['旅行'], 30),
  mem('dm3', 'demo-mom', '膝蓋不好，長時間走路會痛，行程要留休息時間', '隨手記', ['健康'], 22),
  mem('dm4', 'demo-mom', '喜歡吃甜的但不能太甜，偏好紅豆和芋頭', '喜好', ['食物'], 15),
  mem('dm5', 'demo-mom', '生日 4/12，但她說不用特地慶祝，其實會在意有沒有人記得', '重要日期', ['生日'], 40),

  mem('df1', 'demo-friend', '最近在學陶藝，說想做一整套自己的餐具', '想做的事', ['興趣'], 20),
  mem('df2', 'demo-friend', '咖啡只喝淺焙，深焙會說像在喝中藥', '喜好', ['咖啡'], 18),
  mem('df3', 'demo-friend', '討厭別人臨時改時間，會直接不爽但不講', '不喜歡', ['相處'], 12),
  mem('df4', 'demo-friend', '大學時因為家裡的事休學一年，那段她很少提', '故事', ['敏感'], 9),
  mem('df5', 'demo-friend', '之前說想換工作，上個月已經換了，記得問近況', '隨手記', ['近況'], 4),

  mem('dc1', 'demo-colleague', '中午幾乎都自己吃，不太喜歡團體聚餐', '不喜歡', ['相處'], 10),
  mem('dc2', 'demo-colleague', '對機械鍵盤很有研究，最近在等一把客製化的', '喜好', ['3C'], 7),
  mem('dc3', 'demo-colleague', '小孩剛上小一，會提早下班接小孩', '家人朋友', ['家庭'], 5),
];

const interests: Interest[] = [
  {
    id: 'di1', personId: 'demo-friend',
    content: '對手作陶藝有持續興趣，偏好素色、粗胚質感的器皿',
    confidence: 'high',
    tags: ['手作', '禮物線索'],
    sourceDescription: '限時動態截圖：陶藝教室的作品架，她自己標了三個愛心',
    createdAt: now - 19 * day,
  },
  {
    id: 'di2', personId: 'demo-friend',
    content: '在追蹤幾家單品咖啡的訂閱豆，可能有換豆需求',
    confidence: 'medium',
    tags: ['咖啡'],
    sourceDescription: '對話截圖：提到「這包快喝完了但懶得挑」',
    createdAt: now - 11 * day,
  },
  {
    id: 'di3', personId: 'demo-mom',
    content: '對日本紅葉季的行程有明確嚮往，但價格是主要阻力',
    confidence: 'high',
    tags: ['旅行'],
    sourceDescription: '轉傳給她的旅行社連結，她回「好漂亮，可惜太貴」',
    createdAt: now - 29 * day,
  },
];

export const DEMO_FLAG = 'partner_brain_demo_loaded';

export async function loadDemoData() {
  await db.transaction('rw', db.persons, db.memories, db.interests, async () => {
    for (const p of persons) await db.persons.put(p);
    for (const m of memories) await db.memories.put(m);
    for (const i of interests) await db.interests.put(i);
  });
  localStorage.setItem(DEMO_FLAG, '1');
}

export async function clearDemoData() {
  const ids = persons.map((p) => p.id);
  await db.transaction('rw', db.persons, db.memories, db.interests, db.giftAnalyses, async () => {
    for (const id of ids) {
      await db.memories.where('personId').equals(id).delete();
      await db.interests.where('personId').equals(id).delete();
      await db.giftAnalyses.where('personId').equals(id).delete();
      await db.persons.delete(id);
    }
  });
  localStorage.removeItem(DEMO_FLAG);
}
