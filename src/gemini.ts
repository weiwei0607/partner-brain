import type { Memory, MemoryCategory } from './db';

const MODEL = 'gemini-1.5-flash';

function getApiKey(): string {
  return localStorage.getItem('gemini_api_key') ?? '';
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('請先設定 Gemini API Key');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API 錯誤 ${resp.status}`);
  }

  const data = await resp.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates[0].content.parts[0].text.trim();
}

async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('請先設定 Gemini API Key');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API 錯誤 ${resp.status}`);
  }

  const data = await resp.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates[0].content.parts[0].text.trim();
}

export interface ExtractedMemory {
  content: string;
  category: MemoryCategory;
  tags: string[];
}

export async function extractMemories(chatText: string): Promise<ExtractedMemory[]> {
  const prompt = `你是一個戀愛記憶擷取助手。從以下聊天紀錄中，擷取關於「對方（非我）」的重要個人資訊。

聊天紀錄：
${chatText}

擷取規則：
- 只記錄對方說的事，忽略日常寒暄（「嗯」「好」「哈哈」「在哪」等）
- 每條記憶要具體，一句話說清楚
- category 只能是以下其中一個：喜好、不喜歡、故事、想做的事、家人朋友、重要日期、隨手記
- tags 是 2-4 個關鍵字，用於之後搜尋

回傳 JSON array（若沒有值得記錄的內容則回傳空 array []）：
[
  {
    "content": "具體的記憶內容",
    "category": "喜好",
    "tags": ["關鍵字1", "關鍵字2"]
  }
]`;

  const raw = await callGemini(prompt);
  const parsed = JSON.parse(raw) as ExtractedMemory[];
  return Array.isArray(parsed) ? parsed : [];
}

export async function queryMemories(question: string, memories: Memory[]): Promise<string> {
  if (memories.length === 0) return '記憶庫還是空的，先去「記憶庫」頁面貼入聊天紀錄吧！';

  const memoryList = memories
    .map(m => `[${m.category}] ${m.content}（標籤：${m.tags.join('、')}）`)
    .join('\n');

  const prompt = `你是一個戀愛記憶助手。根據以下對方的個人記憶，回答使用者的問題。

對方的記憶庫：
${memoryList}

使用者問題：${question}

回答要求：
- 直接從記憶庫找相關資訊回答
- 如果記憶庫沒有相關資訊，誠實說「記憶庫裡沒有這方面的記錄」
- 語氣自然、口語化，像在提醒朋友
- 若有多條相關記憶，全部列出`;

  return callGeminiText(prompt);
}

export async function analyzeForGift(input: string, memories: Memory[]): Promise<string> {
  const likeMemories = memories
    .filter(m => m.category === '喜好' || m.category === '想做的事')
    .map(m => `- ${m.content}`)
    .join('\n');

  const dislikeMemories = memories
    .filter(m => m.category === '不喜歡')
    .map(m => `- ${m.content}`)
    .join('\n');

  const prompt = `你是一個懂浪漫的禮物顧問。根據以下資料，分析對方可能喜歡什麼禮物。

已知對方喜好：
${likeMemories || '（尚無記錄）'}

已知對方不喜歡：
${dislikeMemories || '（尚無記錄）'}

對方最近分享或提到的內容：
${input}

請回答：
1. **TA 的興趣方向**（從以上資料推測）
2. **具體禮物建議**（3-5 個，說明為什麼適合）
3. **要避開的雷區**（根據不喜歡的記錄）

語氣要溫暖、實用，像好友在給建議。`;

  return callGeminiText(prompt);
}
