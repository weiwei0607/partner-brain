import { useState, useEffect, useRef } from 'react';
import { Plus, Settings, ChevronLeft, Pencil, Trash2, Brain, MessageSquare, ImagePlus, Gift, Star, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { db, type Person } from './db';
import { getApiKey } from './gemini';
import { AddPersonModal } from './components/AddPersonModal';
import { loadDemoData, DEMO_FLAG } from './demoSeed';
import { SplashScreen } from './components/SplashScreen';
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
    try {
      localStorage.setItem('gemini_api_key', key.trim());
    } catch {
      alert('無法儲存到瀏覽器儲存空間（可能是無痕模式或儲存空間已滿），這次設定不會被記住。');
      return;
    }
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
    <div className="person-card relative group cursor-pointer pb-slide-up">
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
function shouldShowSplash(): boolean {
  try {
    if (sessionStorage.getItem('pb_splash')) return false;
    sessionStorage.setItem('pb_splash', '1');
    return true;
  } catch { return false; }
}

export default function App() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [activeTab, setActiveTab] = useState<PersonTab>('destiny');
  const [showAdd, setShowAdd] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>();
  const [showSettings, setShowSettings] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const isDemo = !getApiKey() && localStorage.getItem(DEMO_FLAG) === '1';
  const [splash, setSplash] = useState<boolean>(shouldShowSplash);

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
          <div className="max-w-lg mx-auto px-5 flex border-t overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
            {PERSON_TABS.map(t => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
                  style={{
                    color: active ? 'var(--rose)' : 'var(--text-3)',
                    borderBottom: `2px solid ${active ? 'var(--rose)' : 'transparent'}`,
                    minWidth: 'max-content',
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
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      {/* Top rose line */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.4) 35%, rgba(244,63,94,0.4) 65%, transparent)' }} />

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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #F43F5E 0%, #e11d48 100%)',
                boxShadow: '0 4px 14px rgba(244,63,94,0.30)',
              }}>
              <Brain size={17} className="text-white" />
            </div>
            <div>
              <h1 style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontWeight: 600,
                fontSize: '17px',
                letterSpacing: '-0.02em',
                color: 'var(--text-1)',
                lineHeight: 1,
              }}>
                人際腦
              </h1>
              <p style={{ fontSize: '10px', marginTop: '3px', color: 'var(--text-3)', fontStyle: 'italic', letterSpacing: '0.02em' }}>
                {persons.length > 0 ? `${persons.length} 位重要的人` : 'AI 人際記憶助手'}
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

      {isDemo && (
        <div className="max-w-lg mx-auto px-5 pt-4">
          <div className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'var(--rose-dim)', border: '1px solid var(--rose-border)', color: 'var(--text-2)' }}>
            示範模式：目前顯示的是虛構人物資料。記錄、瀏覽、分類都可以直接操作；
            截圖抽興趣、禮物建議、問 AI 需要在設定裡填自己的 Gemini API Key。
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-lg mx-auto px-5 py-6 pb-12">
        {persons.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center py-20 pb-slide-up">
            {/* Decorative rose ring */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full" style={{ background: 'var(--rose-dim)', border: '1px solid var(--rose-border)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain size={32} style={{ color: 'var(--rose)' }} />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full" style={{ background: 'var(--rose)', opacity: 0.3 }} />
              <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full" style={{ background: 'var(--rose)', opacity: 0.2 }} />
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '22px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              還沒有人物
            </h2>
            <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.7, marginBottom: '32px' }}>
              加入第一個重要的人<br />開始記錄他說過的話、喜歡的事
            </p>
            <button onClick={() => { setEditingPerson(undefined); setShowAdd(true); }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold btn-rose">
              <Plus size={16} />
              新增第一個人
            </button>
            <button
              disabled={demoLoading}
              onClick={async () => {
                setDemoLoading(true);
                await loadDemoData();
                await loadPersons();
                setDemoLoading(false);
              }}
              className="mt-3 px-6 py-3 rounded-2xl text-sm font-medium transition-colors"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              {demoLoading ? '載入中…' : '先看示範資料'}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', marginTop: '14px', lineHeight: 1.7 }}>
              示範資料是三位虛構人物，不需要 API Key<br />
              人物與記憶都存在你的瀏覽器裡；用到 AI 功能時，該人物的資料才會傳給 Gemini
            </p>
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
