import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2 } from 'lucide-react';
import { db, generateId, type Memory, type Interest, type Person } from '../../db';
import { queryPerson } from '../../gemini';

interface QaItem {
  id: string;
  question: string;
  answer: string;
  createdAt: number;
}

export function AskTab({ person }: { person: Person }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<QaItem[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, [person.id]);

  async function loadData() {
    const [mems, ints] = await Promise.all([
      db.memories.where('personId').equals(person.id).toArray(),
      db.interests.where('personId').equals(person.id).toArray(),
    ]);
    setMemories(mems);
    setInterests(ints);
  }

  async function handleAsk() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true); setError(''); setAnswer('');
    try {
      const res = await queryPerson(q, person, memories, interests);
      setAnswer(res);
      setHistory(prev => [...prev, { id: generateId(), question: q, answer: res, createdAt: Date.now() }]);
      setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '查詢失敗');
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  const hasData = memories.length > 0 || interests.length > 0;

  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
          先去「說過的話」或「喜歡的東西」記錄一些資料，問 AI 才會有答案！
        </div>
      )}

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <p className="text-xs text-slate-400">問任何關於 {person.name} 的問題</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAsk(); }}
            placeholder={`例如：${person.name} 上次說想吃什麼？`}
            className="flex-1 h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
          />
          <button
            onClick={handleAsk}
            disabled={loading || !question.trim() || !hasData}
            className="h-11 px-4 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {answer && !loading && (
        <div className="bg-slate-900 rounded-2xl border border-rose-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-rose-400" />
            <p className="text-xs text-rose-400 font-semibold">AI 回答</p>
          </div>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{answer}</div>
        </div>
      )}

      {history.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">歷史對話</p>
          {history.slice(0, -1).reverse().map(item => (
            <div key={item.id} className="bg-slate-900 rounded-xl border border-slate-800 p-3 space-y-2">
              <p className="text-sm text-white font-medium">{item.question}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
