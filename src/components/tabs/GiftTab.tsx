import { useState, useEffect } from 'react';
import { Gift, Sparkles, ChevronRight } from 'lucide-react';
import { db, generateId, type Memory, type Interest, type GiftAnalysis, type Person } from '../../db';
import { analyzeGift } from '../../gemini';

export function GiftTab({ person }: { person: Person }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [history, setHistory] = useState<GiftAnalysis[]>([]);
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [selected, setSelected] = useState<GiftAnalysis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [person.id]);

  async function load() {
    const [mems, ints, analyses] = await Promise.all([
      db.memories.where('personId').equals(person.id).toArray(),
      db.interests.where('personId').equals(person.id).toArray(),
      db.giftAnalyses.where('personId').equals(person.id).reverse().sortBy('createdAt'),
    ]);
    setMemories(mems); setInterests(ints); setHistory(analyses);
  }

  async function handleAnalyze() {
    setAnalyzing(true); setError(''); setResult(''); setSelected(null);
    try {
      const res = await analyzeGift(input, person, memories, interests);
      setResult(res);
      await db.giftAnalyses.add({ id: generateId(), personId: person.id, input: input.trim() || '（無備註）', result: res, createdAt: Date.now() });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失敗');
    } finally { setAnalyzing(false); }
  }

  const likeCount = memories.filter(m => m.category === '喜好').length;
  const interestCount = interests.length;
  const display = selected?.result ?? result;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: '喜好記錄', count: likeCount, color: 'text-emerald-400' },
          { label: '截圖興趣', count: interestCount, color: 'text-violet-400' },
          { label: '命盤資料', count: person.baziResult ? 1 : 0, color: 'text-amber-400' },
        ].map(item => (
          <div key={item.label} className="bg-slate-900 rounded-xl p-3 border border-slate-800">
            <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {likeCount === 0 && interestCount === 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          先去「說過的話」或「喜歡的東西」記錄資料，禮物建議會更準確！
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <label className="text-xs text-slate-400 block">最近有什麼新觀察？（可以不填）</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`例如：${person.name} 最近常提到想去爬山、生日快到了、剛換工作...`}
          className="w-full h-24 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {analyzing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 分析中...</> : <><Sparkles className="w-4 h-4" />生成禮物建議</>}
        </button>
      </div>

      {display && (
        <div className="bg-slate-900 rounded-2xl border border-rose-500/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-rose-400" />
            <p className="text-sm font-semibold text-rose-400">禮物建議</p>
            {selected && <span className="text-[10px] text-slate-500 ml-auto">{new Date(selected.createdAt).toLocaleDateString('zh-TW')}</span>}
          </div>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{display}</div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">歷史分析</p>
          {history.map(h => (
            <button key={h.id} onClick={() => { setSelected(h); setResult(''); }} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${selected?.id === h.id ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
              <Gift className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{h.input || '（無備註）'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{new Date(h.createdAt).toLocaleDateString('zh-TW')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
