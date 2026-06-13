import { useState, useEffect, useRef } from 'react';
import { Plus, Settings, ChevronLeft, Pencil, Trash2, Brain, MessageSquare, ImagePlus, Gift, Star, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { db, type Person } from './db';
import { getApiKey } from './gemini';
import { AddPersonModal } from './components/AddPersonModal';
import { MemoryTab } from './components/tabs/MemoryTab';
import { InterestTab } from './components/tabs/InterestTab';
import { DestinyTab } from './components/tabs/DestinyTab';
import { GiftTab } from './components/tabs/GiftTab';
import { AskTab } from './components/tabs/AskTab';

type PersonTab = 'destiny' | 'memory' | 'interest' | 'gift' | 'ask';

const PERSON_TABS: { id: PersonTab; label: string; icon: React.ElementType }[] = [
  { id: 'destiny',  label: '命盤',    icon: Star },
  { id: 'memory',   label: '說過的話', icon: MessageSquare },
  { id: 'interest', label: '喜歡的',  icon: ImagePlus },
  { id: 'gift',     label: '禮物',    icon: Gift },
  { id: 'ask',      label: '問 AI',   icon: MessageCircle },
];

/* ── Settings Modal ─────────────────────────────── */
function SettingsModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(localStorage.getItem('gemini_api_key') ?? '');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function save() {
    localStorage.setItem('gemini_api_key', key.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  async function exportData() {
    const [persons, memories, interests, giftAnalyses] = await Promise.all([
      db.persons.toArray(), db.memories.toArray(),
      db.interests.toArray(), db.giftAnalyses.toArray(),
    ]);
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: Date.now(), persons, memories, interests, giftAnalyses }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partner-brain-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!data.persons || !Array.isArray(data.persons)) throw new Error('檔案格式不正確');
      await db.transaction('rw', db.persons, db.memories, db.interests, db.giftAnalyses, async () => {
        for (const p of data.persons) await db.persons.put(p);
        if (data.memories)      for (const m of data.memories) await db.memories.put(m);
        if (data.interests)     for (const i of data.interests) await db.interests.put(i);
        if (data.giftAnalyses)  for (const g of data.giftAnalyses) await db.giftAnalyses.put(g);
      });
      alert('資料匯入成功！請重新整理頁面。');
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '匯入失敗');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(28,21,17,0.35)' }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto pb-slide-up journal-card-elevated"
        style={{ background: 'var(--surface)' }}>

        <div className="flex items-center justify-between">
          <h2 className="font-playfair text-lg font-semibold" style={{ color: 'var(--text-1)', fontFamily: 'Playfair Display, serif' }}>
            設定
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors"
            style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>
            ✕
          </button>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-3)' }}>
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="AIza..."
              className="w-full h-11 pl-3.5 pr-10 rounded-2xl text-sm input-journal"
              style={{ fontFamily: 'monospace' }}
            />
            <button onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--text-3)' }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-3)' }}>
            至 Google AI Studio 取得免費 Key，僅儲存在本機
          </p>
        </div>

        {/* Backup */}
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-3)' }}>
            資料備份
          </label>
          <div className="flex gap-2">
            <button onClick={exportData}
              className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              匯出 JSON
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 py-2.5 rounded-2xl text-[13px] font-semibold transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              匯入 JSON
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ''; }} />
          <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>資料只存於本機，建議定期備份</p>
        </div>

        <button onClick={save}
          className="w-full py-3 rounded-2xl text-sm font-bold transition-all btn-rose"
          style={saved ? { background: '#22c55e', boxShadow: '0 4px 14px rgba(34,197,94,0.28)' } : {}}>
          {saved ? '已儲存 ✓' : '儲存'}
        </button>
      </div>
    </div>
  );
}

/* ── Person Card ────────────────────────────────── */
function PersonCard({ person, onClick, onEdit, onDelete }: {
  person: Person; onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div
      className="relative rounded-3xl overflow-hidden group cursor-pointer pb-slide-up transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 12px rgba(28,21,17,0.06), 0 1px 3px rgba(28,21,17,0.04)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(28,21,17,0.10), 0 2px 8px rgba(28,21,17,0.06)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(28,21,17,0.06), 0 1px 3px rgba(28,21,17,0.04)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Gradient banner */}
      <div className={`h-[4.5rem] bg-gradient-to-br ${person.color} flex items-end p-3 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
        <span className="text-[2.2rem] relative z-10 drop-shadow-sm leading-none">{person.avatar}</span>
      </div>

      {/* Body */}
      <div className="px-3.5 pt-3 pb-4">
        <p className="font-playfair font-semibold text-[14px] leading-tight truncate"
          style={{ color: 'var(--text-1)', fontFamily: 'Playfair Display, serif' }}>
          {person.name}
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
          {person.relationship}
        </p>
        {person.mbti && (
          <span className="pill-rose inline-block mt-2">{person.mbti}</span>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button onClick={e => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 rounded-xl flex items-center justify-center text-white"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
          <Pencil size={12} />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 rounded-xl flex items-center justify-center text-white"
          style={{ background: 'rgba(239,68,68,0.55)', backdropFilter: 'blur(8px)' }}>
          <Trash2 size={12} />
        </button>
      </div>
      <button onClick={onClick} className="absolute inset-0" aria-label={`查看 ${person.name}`} />
    </div>
  );
}

/* ── Main App ─────────────────────────────────── */
export default function App() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [activeTab, setActiveTab] = useState<PersonTab>('destiny');
  const [showAdd, setShowAdd] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>();
  const [showSettings, setShowSettings] = useState(!getApiKey());

  useEffect(() => { loadPersons(); }, []);

  async function loadPersons() {
    try {
      setPersons(await db.persons.orderBy('createdAt').toArray());
    } catch { alert('載入資料失敗，請重新整理頁面'); }
  }

  async function refreshActivePerson() {
    if (!activePerson) return;
    const updated = await db.persons.get(activePerson.id);
    if (updated) setActivePerson(updated);
    await loadPersons();
  }

  async function deletePerson(id: string) {
    if (!confirm('確定刪除這個人物？所有記憶和分析也會一起刪除。')) return;
    await db.transaction('rw', db.persons, db.memories, db.interests, db.giftAnalyses, async () => {
      await db.memories.where('personId').equals(id).delete();
      await db.interests.where('personId').equals(id).delete();
      await db.giftAnalyses.where('personId').equals(id).delete();
      await db.persons.delete(id);
    });
    if (activePerson?.id === id) setActivePerson(null);
    await loadPersons();
  }

  /* ── Person detail view ── */
  if (activePerson) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        {/* Sticky header */}
        <header className="sticky top-0 z-40 border-b"
          style={{
            background: 'rgba(253,252,247,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'var(--border)',
          }}>
          <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-3">
            <button onClick={() => setActivePerson(null)}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <ChevronLeft size={18} />
            </button>

            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${activePerson.color} flex items-center justify-center text-[1.25rem] shrink-0`}
              style={{ boxShadow: '0 2px 8px rgba(28,21,17,0.10)' }}>
              {activePerson.avatar}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-playfair font-semibold text-[15px] truncate"
                style={{ color: 'var(--text-1)', fontFamily: 'Playfair Display, serif' }}>
                {activePerson.name}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-3)' }}>
                {activePerson.relationship}{activePerson.mbti ? ` · ${activePerson.mbti}` : ''}
              </p>
            </div>

            <button onClick={() => { setEditingPerson(activePerson); setShowAdd(true); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              <Pencil size={15} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="max-w-lg mx-auto px-5 flex border-t" style={{ borderColor: 'var(--border)' }}>
            {PERSON_TABS.map(t => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors"
                  style={{
                    color: active ? 'var(--rose)' : 'var(--text-3)',
                    borderBottom: `2px solid ${active ? 'var(--rose)' : 'transparent'}`,
                  }}>
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 py-5 pb-12">
          {activeTab === 'destiny'  && <DestinyTab  person={activePerson} onPersonUpdated={refreshActivePerson} />}
          {activeTab === 'memory'   && <MemoryTab   person={activePerson} />}
          {activeTab === 'interest' && <InterestTab person={activePerson} />}
          {activeTab === 'gift'     && <GiftTab     person={activePerson} />}
          {activeTab === 'ask'      && <AskTab      person={activePerson} />}
        </main>

        {showAdd && (
          <AddPersonModal
            editing={editingPerson}
            onClose={() => { setShowAdd(false); setEditingPerson(undefined); }}
            onSaved={() => { setShowAdd(false); setEditingPerson(undefined); refreshActivePerson(); }}
          />
        )}
      </div>
    );
  }

  /* ── Home view ── */
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Top rose line */}
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--rose) 30%, var(--rose) 70%, transparent)', opacity: 0.25 }} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b"
        style={{
          background: 'rgba(253,252,247,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
        }}>
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--rose) 0%, #e11d48 100%)',
                boxShadow: '0 4px 12px rgba(244,63,94,0.28)',
              }}>
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-playfair font-semibold text-[16px] leading-none"
                style={{ color: 'var(--text-1)', fontFamily: 'Playfair Display, serif' }}>
                人際腦
              </h1>
              <p className="text-[10px] mt-0.5 font-medium"
                style={{ color: 'var(--text-3)' }}>
                {persons.length > 0 ? `${persons.length} 個人物` : 'AI 人際記憶助手'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1.5">
            <button onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
              <Settings size={16} />
            </button>
            <button onClick={() => { setEditingPerson(undefined); setShowAdd(true); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 btn-rose">
              <Plus size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-5 py-6 pb-12">
        {persons.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center py-24 pb-slide-up">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'var(--rose-dim)', border: '1px solid var(--rose-border)' }}>
              <Brain size={36} style={{ color: 'var(--rose)' }} />
            </div>
            <h2 className="font-playfair font-semibold text-xl mb-2"
              style={{ color: 'var(--text-1)', fontFamily: 'Playfair Display, serif' }}>
              還沒有人物
            </h2>
            <p className="text-[14px] mb-8 text-center leading-relaxed" style={{ color: 'var(--text-3)' }}>
              加入第一個重要的人<br />開始記錄他的故事
            </p>
            <button onClick={() => { setEditingPerson(undefined); setShowAdd(true); }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold btn-rose">
              <Plus size={16} />
              新增人物
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {persons.map((p, i) => (
              <div key={p.id} className="delay-50" style={{ animationDelay: `${i * 0.05}s` }}>
                <PersonCard
                  person={p}
                  onClick={() => { setActivePerson(p); setActiveTab('destiny'); }}
                  onEdit={() => { setEditingPerson(p); setShowAdd(true); }}
                  onDelete={() => deletePerson(p.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {showAdd && (
        <AddPersonModal
          editing={editingPerson}
          onClose={() => { setShowAdd(false); setEditingPerson(undefined); }}
          onSaved={() => { setShowAdd(false); setEditingPerson(undefined); loadPersons(); }}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
