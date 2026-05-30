import { useState, useEffect, useRef } from 'react';
import { Send, Brain } from 'lucide-react';
import { db, type Memory, CATEGORY_EMOJI } from '../db';
import { queryMemories } from '../gemini';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  relatedMemories?: Memory[];
}

function findRelatedMemories(question: string, memories: Memory[]): Memory[] {
  const q = question.toLowerCase();
  return memories
    .filter(m =>
      m.content.toLowerCase().includes(q) ||
      m.tags.some(t => t.toLowerCase().includes(q)) ||
      q.split(/\s+/).some(word => word.length > 1 && m.content.includes(word))
    )
    .slice(0, 3);
}

export function SearchTab() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadMemories(); }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMemories() {
    const all = await db.memories.orderBy('createdAt').reverse().toArray();
    setMemories(all);
  }

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const related = findRelatedMemories(q, memories);
    setMessages(prev => [...prev, { role: 'user', text: q, relatedMemories: related }]);
    setLoading(true);
    try {
      const answer = await queryMemories(q, memories);
      setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: `錯誤：${e instanceof Error ? e.message : '查詢失敗'}` }]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    'TA 不喜歡吃什麼？',
    'TA 最近想做什麼？',
    'TA 的家人叫什麼名字？',
    'TA 有什麼重要日期？',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm text-slate-400 font-medium">問我關於 TA 的任何事</p>
              <p className="text-xs text-slate-500 mt-1">我會從記憶庫找答案</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs text-slate-400 hover:border-rose-500/50 hover:text-slate-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            {memories.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  記憶庫現有 {memories.length} 條記憶
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {memories.slice(0, 6).map(m => (
                    <span key={m.id} className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-400">
                      {CATEGORY_EMOJI[m.category]} {m.content.slice(0, 20)}{m.content.length > 20 ? '...' : ''}
                    </span>
                  ))}
                  {memories.length > 6 && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-500">
                      +{memories.length - 6} 條
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] space-y-2`}>
                {/* Related memories hint (user side) */}
                {msg.role === 'user' && msg.relatedMemories && msg.relatedMemories.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-end">
                    {msg.relatedMemories.map(m => (
                      <span key={m.id} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {CATEGORY_EMOJI[m.category]} {m.content.slice(0, 15)}...
                      </span>
                    ))}
                  </div>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-rose-500 text-white rounded-tr-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800">
              <div className="flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-slate-800">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="問我關於 TA 的事..."
          className="flex-1 h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 disabled:opacity-50 transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
