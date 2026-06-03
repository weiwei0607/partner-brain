import { useState, useEffect } from 'react';
import { Sparkles, Trash2, Search, Plus, X, ChevronDown, Clock } from 'lucide-react';
import { db, generateId, MEMORY_CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJI, type Memory, type MemoryCategory, type Person } from '../../db';
import { extractMemories, type ExtractedMemory } from '../../gemini';

export function MemoryTab({ person }: { person: Person }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedMemory[]>([]);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [filterCat, setFilterCat] = useState<MemoryCategory | 'all'>('all');
  const [showPanel, setShowPanel] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [manualContent, setManualContent] = useState('');
  const [manualCategory, setManualCategory] = useState<MemoryCategory>('隨手記');
  const [manualTags, setManualTags] = useState('');

  useEffect(() => { load(); }, [person.id]);

  async function load() {
    const all = await db.memories.where('personId').equals(person.id).reverse().sortBy('createdAt');
    setMemories(all);
  }

  async function handleExtract() {
    if (!chatInput.trim()) return;
    setExtracting(true); setError(''); setExtracted([]);
    try {
      const result = await extractMemories(chatInput, person);
      if (result.length === 0) setError('沒找到值得記錄的內容，試著貼入更多對話？');
      else setExtracted(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '擷取失敗');
    } finally { setExtracting(false); }
  }

  async function saveOne(item: ExtractedMemory) {
    try {
      await db.memories.add({ id: generateId(), personId: person.id, content: item.content, category: item.category, tags: item.tags, sourceText: chatInput.slice(0, 200), createdAt: Date.now() });
      setExtracted(prev => prev.filter(e => e.content !== item.content));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    }
  }

  async function saveAll() {
    const now = Date.now();
    try {
      await db.transaction('rw', db.memories, async () => {
        for (const item of extracted) {
          await db.memories.add({ id: generateId(), personId: person.id, content: item.content, category: item.category, tags: item.tags, sourceText: chatInput.slice(0, 200), createdAt: now });
        }
      });
      setExtracted([]); setChatInput(''); setShowPanel(false); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量儲存失敗，請重試');
    }
  }

  async function deleteMemory(id: string) {
    await db.memories.delete(id); load();
  }

  async function toggleOutdated(m: Memory) {
    await db.memories.update(m.id, { outdated: !m.outdated }); load();
  }

  async function saveManual() {
    if (!manualContent.trim()) return;
    await db.memories.add({ id: generateId(), personId: person.id, content: manualContent.trim(), category: manualCategory, tags: manualTags.split(/[,，、]/).map(t => t.trim()).filter(Boolean), createdAt: Date.now() });
    setManualContent(''); setManualTags(''); setManualCategory('隨手記'); setAddingManual(false); load();
  }

  const filtered = memories.filter(m => {
    const matchCat = filterCat === 'all' || m.category === filterCat;
    const q = searchQ.toLowerCase();
    return matchCat && (!q || m.content.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q)));
  });

  const counts = MEMORY_CATEGORIES.reduce((acc, cat) => { acc[cat] = memories.filter(m => m.category === cat).length; return acc; }, {} as Record<MemoryCategory, number>);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => { setShowPanel(!showPanel); setAddingManual(false); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors">
          <Sparkles className="w-4 h-4" /> AI 擷取
        </button>
        <button onClick={() => { setAddingManual(!addingManual); setShowPanel(false); }} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Plus className="w-4 h-4" /> 手動
        </button>
      </div>

      {showPanel && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <p className="text-xs text-slate-400">貼入你們的聊天紀錄，AI 自動找出值得記住的事</p>
          <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder={`貼入與 ${person.name} 的聊天紀錄...`} className="w-full h-36 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500" />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={handleExtract} disabled={extracting || !chatInput.trim()} className="w-full py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {extracting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />分析中...</> : <><Sparkles className="w-4 h-4" />開始擷取</>}
          </button>
          {extracted.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">找到 {extracted.length} 條，確認後儲存：</p>
                <button onClick={saveAll} className="text-xs text-rose-400 font-semibold hover:text-rose-300">全部儲存</button>
              </div>
              {extracted.map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700">
                  <span className="text-lg shrink-0">{CATEGORY_EMOJI[item.category]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{item.content}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[item.category]}`}>{item.category}</span>
                      {item.tags.map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">#{tag}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => saveOne(item)} className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 text-sm">✓</button>
                    <button onClick={() => setExtracted(prev => prev.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg bg-slate-700 text-slate-400 flex items-center justify-center hover:bg-slate-600"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {addingManual && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <textarea value={manualContent} onChange={e => setManualContent(e.target.value)} placeholder={`記下 ${person.name} 說過什麼...`} className="w-full h-20 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500" />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select value={manualCategory} onChange={e => setManualCategory(e.target.value as MemoryCategory)} className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none appearance-none">
                {MEMORY_CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_EMOJI[cat]} {cat}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <input type="text" value={manualTags} onChange={e => setManualTags(e.target.value)} placeholder="標籤（逗號分隔）" className="h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none" />
          </div>
          <button onClick={saveManual} disabled={!manualContent.trim()} className="w-full py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 disabled:opacity-50">儲存</button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['all', ...MEMORY_CATEGORIES] as const).map(cat => {
          const isAll = cat === 'all';
          const count = isAll ? memories.length : counts[cat];
          if (!isAll && count === 0) return null;
          return (
            <button key={cat} onClick={() => setFilterCat(cat)} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterCat === cat ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              {isAll ? `全部 ${count}` : `${CATEGORY_EMOJI[cat]} ${cat} ${count}`}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="搜尋記憶..." className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-sm">{memories.length === 0 ? `還沒有關於 ${person.name} 的記憶` : '沒有符合的結果'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} className={`flex items-start gap-3 p-3.5 rounded-xl border group transition-opacity ${m.outdated ? 'bg-slate-900/50 border-slate-800/50 opacity-50' : 'bg-slate-900 border-slate-800'}`}>
              <span className={`text-xl shrink-0 mt-0.5 ${m.outdated ? 'grayscale' : ''}`}>{CATEGORY_EMOJI[m.category]}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${m.outdated ? 'text-slate-500 line-through' : 'text-white'}`}>{m.content}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {m.outdated
                    ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">已過時</span>
                    : <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[m.category]}`}>{m.category}</span>
                  }
                  {!m.outdated && m.tags.map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">#{tag}</span>)}
                  <span className="text-[10px] text-slate-600 ml-auto">{new Date(m.createdAt).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => toggleOutdated(m)} title={m.outdated ? '恢復有效' : '標記為過時'} className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center hover:bg-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteMemory(m.id)} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
