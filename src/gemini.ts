import type { Memory, MemoryCategory, Interest, Person } from './db';

const MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const FETCH_TIMEOUT_MS = 30000;

export function getApiKey(): string {
  return localStorage.getItem('gemini_api_key') ?? '';
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { ...init, signal: ctrl.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

// Gemini sometimes wraps JSON in a markdown code block or returns malformed
// output. Surfacing the raw "Unexpected token" SyntaxError to the user is
// meaningless, so we normalize it into a friendly, actionable message.
function safeJsonParse<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('AI 回應的格式無法解析，請重試一次');
  }
}

function extractText(data: unknown): string {
  const d = data as Record<string, unknown> | undefined;
  const candidates = d?.candidates as Array<Record<string, unknown>> | undefined;
  const first = candidates?.[0];
  const content = first?.content as Record<string, unknown> | undefined;
  const parts = content?.parts as Array<Record<string, unknown>> | undefined;
  const text = parts?.[0]?.text as string | undefined;
  if (text === undefined) {
    throw new Error('AI 回應格式異常或內容被阻擋');
  }
  return text.trim();
}

async function post(body: object): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('請先設定 Gemini API Key');

  const resp = await safeFetch(
    `${API_BASE}/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `API 錯誤 ${resp.status}`);
  }
  const data = await resp.json();
  return extractText(data);
}

function jsonPost(prompt: string) {
  return post({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: 'application/json' },
  });
}

function textPost(prompt: string) {
  return post({ contents: [{ parts: [{ text: prompt }] }] });
}

// --- 聊天擷取 ---
export interface ExtractedMemory {
  content: string;
  category: MemoryCategory;
  tags: string[];
}

export async function extractMemories(chatText: string, person: Person): Promise<ExtractedMemory[]> {
  const MAX_LEN = 8000;
  const truncated = chatText.length > MAX_LEN ? chatText.slice(0, MAX_LEN) + '\n…（已截斷）' : chatText;
  const raw = await jsonPost(
    `你是一個人際記憶擷取助手。從以下聊天紀錄中，擷取關於「${person.name}（${person.relationship}）」的重要個人資訊。

聊天紀錄：
${truncated}

擷取規則：
- 只記錄 ${person.name} 說的事，忽略日常寒暄
- 每條記憶要具體，一句話說清楚
- category 只能是：喜好、不喜歡、故事、想做的事、家人朋友、重要日期、隨手記
- tags 是 2-4 個關鍵字

回傳 JSON array（沒有值得記錄的就回傳 []）：
[{"content":"...","category":"喜好","tags":["關鍵字1","關鍵字2"]}]`
  );
  const parsed = safeJsonParse<ExtractedMemory[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

// --- 截圖分析 ---
export interface ExtractedInterest {
  content: string;
  confidence: 'high' | 'medium' | 'low';
  sourceDescription: string;
  tags: string[];
}

export async function analyzeScreenshot(imageBase64: string, person: Person): Promise<ExtractedInterest[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('請先設定 Gemini API Key');

  const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const base64Data = imageBase64.split(',')[1];

  const prompt = `這是一張截圖，可能是 ${person.name}（${person.relationship}）分享給我的 IG 貼文、小紅書筆記、Threads 貼文或其他內容。

請分析截圖內容，推測這個人的興趣、喜好、或生活風格。

回傳 JSON array：
[{
  "content": "從截圖推測的一個興趣或喜好（具體一句話）",
  "confidence": "high/medium/low（確信程度）",
  "sourceDescription": "截圖裡看到了什麼，讓你這樣推測",
  "tags": ["關鍵字1","關鍵字2"]
}]

confidence 說明：high=截圖明確顯示、medium=有一定根據、low=推測
沒有有用資訊就回傳 []`;

  const resp = await safeFetch(
    `${API_BASE}/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `API 錯誤 ${resp.status}`);
  }
  const data = await resp.json();
  const raw = extractText(data);
  const parsed = safeJsonParse<ExtractedInterest[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

// --- 八字計算 ---
export async function calculateBazi(person: Person): Promise<string> {
  const birthInfo = [
    person.birthDate && `出生日期：${person.birthDate}`,
    person.birthTime && `出生時間：${person.birthTime}`,
    person.birthPlace && `出生地點：${person.birthPlace}`,
  ].filter(Boolean).join('\n');

  return textPost(
    `請根據以下資料計算八字四柱，並給出性格分析。

${birthInfo}

請回答：
**四柱八字**
年柱：＿＿ 月柱：＿＿ 日柱：＿＿ 時柱：＿＿

**性格特質**（3-5 點，具體描述）

**優勢**（2-3 點）

**需要注意的地方**（2-3 點）

**與人相處的風格**

語氣自然，不要太玄學，重點放在實用的性格描述。`
  );
}

// --- 查詢 ---
export async function queryPerson(
  question: string,
  person: Person,
  memories: Memory[],
  interests: Interest[]
): Promise<string> {
  const memList = memories.map(m => `[${m.category}${m.outdated ? '・已過時' : ''}] ${m.content}`).join('\n') || '（尚無記錄）';
  const intList = interests.map(i => `[${i.confidence === 'high' ? '高確信' : i.confidence === 'medium' ? '中確信' : '推測'} ] ${i.content}`).join('\n') || '（尚無記錄）';

  return textPost(
    `你是一個人際記憶助手。根據以下資料，回答關於「${person.name}（${person.relationship}）」的問題。

說過的話（明確記憶）：
${memList}

喜歡的東西（從截圖推測）：
${intList}

問題：${question}

回答要求：
- 直接從記憶找答案，沒有就說沒有記錄
- 區分「TA 明確說過」和「從截圖推測」
- 語氣自然口語`
  );
}

// --- 禮物分析 ---
export async function analyzeGift(
  input: string,
  person: Person,
  memories: Memory[],
  interests: Interest[]
): Promise<string> {
  const likes = memories.filter(m => m.category === '喜好' && !m.outdated).map(m => `- ${m.content}`).join('\n') || '（無記錄）';
  const dislikes = memories.filter(m => m.category === '不喜歡').map(m => `- ${m.content}`).join('\n') || '（無記錄）';
  const wishes = memories.filter(m => m.category === '想做的事').map(m => `- ${m.content}`).join('\n') || '（無記錄）';
  const inferredInterests = interests.map(i => `- ${i.content}（${i.confidence === 'high' ? '確定' : '推測'}）`).join('\n') || '（無記錄）';

  const baziHint = person.baziResult ? `\n命盤特質：${person.baziResult.slice(0, 200)}` : '';

  return textPost(
    `你是一個懂浪漫的禮物顧問。幫我想送給「${person.name}（${person.relationship}）」的禮物。

已知喜好：
${likes}

已知不喜歡：
${dislikes}

想做的事：
${wishes}

從分享內容推測的興趣：
${inferredInterests}
${baziHint}

最近觀察到的情況：
${input}

請提供：
1. **TA 的整體興趣輪廓**
2. **具體禮物建議**（3-5 個，每個說明為什麼適合）
3. **要避開的雷區**

語氣溫暖實用，像好友在給建議。`
  );
}
