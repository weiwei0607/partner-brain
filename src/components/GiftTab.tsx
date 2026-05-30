import { useState, useEffect } from 'react';
import { Gift, Sparkles, Clock, ChevronRight } from 'lucide-react';
import { db, type Memory, type GiftAnalysis } from '../db';
import { analyzeForGift } from '../gemini';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function GiftTab() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<GiftAnalysis[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<GiftAnalysis | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [mems, analyses] = await Promise.all([
      db.memories.toArray(),
      db.giftAnalyses.orderBy('createdAt').reverse().toArray(),
    ]);
    setMemories(mems);
    setHistory(analyses);
  }

  async function handleAnalyze() {
    if (!input.trim()) return;
    setAnalyzing(true);
    setError('');
    setResult('');
    setSelectedHistory(null);
    try {
      const res = await analyzeForGift(input, memories);
      setResult(res);
      const analysis: GiftAnalysis = {
        id: generateId(),
        input: input.trim(),
        result: res,
        createdAt: Date.now(),
      };
      await db.giftAnalyses.add(analysis);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失敗');
    } finally {
      setAnalyzing(false);
    }
  }

  const likeCount = memories.filter(m => m.category === '喜好').length;
  const dislikeCount = memories.filter(m => m.category === '不喜歡').length;
  const wishCount = memories.filter(m => m.category === '想做的事').length;

  const displayResult = selectedHistory?.result ?? result;

  return (
    <div className="space-y-4">
      {/* Memory summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '喜好', count: likeCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: '不喜歡', count: dislikeCount, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: '心願', count: wishCount, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(item => (
          <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {likeCount === 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          記憶庫還沒有喜好資料，先去「記憶庫」頁面貼入聊天紀錄，禮物建議會更準確！
        </div>
      )}

      {/* Input */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">TA 最近分享過什麼？</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="貼入 TA 分享的連結、截圖描述、或直接說：「TA 最近一直看運動鞋的IG」、「TA 說朋友推薦了某本書」..."
            className="w-full h-32 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !input.trim()}
          className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI 分析中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              分析禮物方向
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {displayResult && (
        <div className="bg-slate-900 rounded-2xl border border-rose-500/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-rose-400" />
            <p className="text-sm font-semibold text-rose-400">禮物建議</p>
            {selectedHistory && (
              <span className="text-[10px] text-slate-500 ml-auto">
                {new Date(selectedHistory.createdAt).toLocaleDateString('zh-TW')}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {displayResult}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            歷史分析
          </p>
          {history.map(h => (
            <button
              key={h.id}
              onClick={() => { setSelectedHistory(h); setResult(''); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                selectedHistory?.id === h.id
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Gift className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{h.input.slice(0, 50)}{h.input.length > 50 ? '...' : ''}</p>
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
