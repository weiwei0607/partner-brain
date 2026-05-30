import { useState, useEffect } from 'react';
import { Sparkles, Trash2, Search, Plus, X, ChevronDown } from 'lucide-react';
import { db, type Memory, type MemoryCategory, CATEGORY_COLORS, CATEGORY_EMOJI } from '../db';
import { extractMemories, type ExtractedMemory } from '../gemini';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const ALL_CATEGORIES: MemoryCategory[] = ['喜好', '不喜歡', '故事', '想做的事', '家人朋友', '重要日期', '隨手記'];

export function MemoryTab() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedMemory[]>([]);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState<MemoryCategory | 'all'>('all');
  const [showExtractPanel, setShowExtractPanel] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualCategory, setManualCategory] = useState<MemoryCategory>('隨手記');
  const [manualTags, setManualTags] = useState('');

  useEffect(() => { loadMemories(); }, []);

  async function loadMemories() {
    const all = await db.memories.orderBy('createdAt').reverse().toArray();
    setMemories(all);
  }

  async function handleExtract() {
    if (!chatInput.trim()) return;
    setExtracting(true);
    setError('');
    setExtracted([]);
    try {
      const result = await extractMemories(chatInput);
      if (result.length === 0) {
        setError('沒有找到值得記錄的內容，試著貼入更多對話？');
      } else {
        setExtracted(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '擷取失敗');
    } finally {
      setExtracting(false);
    }
  }

  async function saveExtracted(item: ExtractedMemory) {
    const memory: Memory = {
      id: generateId(),
      content: item.content,
      category: item.category,
      tags: item.tags,
      source: chatInput.slice(0, 200),
      createdAt: Date.now(),
    };
    await db.memories.add(memory);
    setExtracted(prev => prev.filter(e => e.content !== item.content));
    await loadMemories();
  }

  async function saveAllExtracted() {
    for (const item of extracted) {
      await db.memories.add({
        id: generateId(),
        content: item.content,
        category: item.category,
        tags: item.tags,
        source: chatInput.slice(0, 200),
        createdAt: Date.now(),
      });
    }
    setExtracted([]);
    setChatInput('');
    setShowExtractPanel(false);
    await loadMemories();
  }

  async function deleteMemory(id: string) {
    await db.memories.delete(id);
    await loadMemories();
  }

  async function saveManual() {
    if (!manualContent.trim()) return;
    await db.memories.add({
      id: generateId(),
      content: manualContent.trim(),
      category: manualCategory,
      tags: manualTags.split(/[,，、]/).map(t => t.trim()).filter(Boolean),
      createdAt: Date.now(),
    });
    setManualContent('');
    setManualTags('');
    setManualCategory('隨手記');
    setAddingManual(false);
    await loadMemories();
  }

  const filtered = memories.filter(m => {
    const matchCat = filterCat === 'all' || m.category === filterCat;
    const q = searchQ.toLowerCase();
    const matchSearch = !q || m.content.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const counts = ALL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = memories.filter(m => m.category === cat).length;
    return acc;
  }, {} as Record<MemoryCategory, number>);

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { setShowExtractPanel(!showExtractPanel); setAddingManual(false); }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          AI 擷取記憶
        </button>
        <button
          onClick={() => { setAddingManual(!addingManual); setShowExtractPanel(false); }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          手動新增
        </button>
      </div>

      {/* AI Extract Panel */}
      {showExtractPanel && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <p className="text-xs text-slate-400">貼入你們的聊天紀錄，AI 自動找出值得記住的事</p>
          <textarea
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="在這裡貼入聊天紀錄...（支援 LINE / iMessage / 任何格式）"
            className="w-full h-40 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleExtract}
            disabled={extracting || !chatInput.trim()}
            className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {extracting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI 分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                開始擷取
              </>
            )}
          </button>

          {/* Extracted preview */}
          {extracted.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">找到 {extracted.length} 條記憶，確認後儲存：</p>
                <button onClick={saveAllExtracted} className="text-xs text-rose-400 font-semibold hover:text-rose-300">全部儲存</button>
              </div>
              {extracted.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-lg shrink-0">{CATEGORY_EMOJI[item.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{item.content}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[item.category]}`}>
                        {item.category}
                      </span>
                      {item.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => saveExtracted(item)} className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 text-sm">✓</button>
                    <button onClick={() => setExtracted(prev => prev.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg bg-slate-700 text-slate-400 flex items-center justify-center hover:bg-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Add Panel */}
      {addingManual && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <textarea
            value={manualContent}
            onChange={e => setManualContent(e.target.value)}
            placeholder="記下什麼事？例如：TA 說不喜歡吃香菜"
            className="w-full h-20 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">分類</label>
              <div className="relative">
                <select
                  value={manualCategory}
                  onChange={e => setManualCategory(e.target.value as MemoryCategory)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none appearance-none"
                >
                  {ALL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_EMOJI[cat]} {cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">標籤（逗號分隔）</label>
              <input
                type="text"
                value={manualTags}
                onChange={e => setManualTags(e.target.value)}
                placeholder="食物、過敏..."
                className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={saveManual}
            disabled={!manualContent.trim()}
            className="w-full py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            儲存
          </button>
        </div>
      )}

      {/* Category summary */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterCat('all')}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterCat === 'all' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          全部 {memories.length}
        </button>
        {ALL_CATEGORIES.filter(cat => counts[cat] > 0).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterCat === cat ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {CATEGORY_EMOJI[cat]} {cat} {counts[cat]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="搜尋記憶..."
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500"
        />
      </div>

      {/* Memory list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-sm font-medium">記憶庫是空的</p>
          <p className="text-xs mt-1">貼入聊天紀錄，讓 AI 幫你記住 TA 說過的事</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(memory => (
            <div key={memory.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 group">
              <span className="text-xl shrink-0 mt-0.5">{CATEGORY_EMOJI[memory.category]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-relaxed">{memory.content}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[memory.category]}`}>
                    {memory.category}
                  </span>
                  {memory.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">#{tag}</span>
                  ))}
                  <span className="text-[10px] text-slate-600 ml-auto">
                    {new Date(memory.createdAt).toLocaleDateString('zh-TW')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteMemory(memory.id)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
