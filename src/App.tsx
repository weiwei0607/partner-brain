import { useState, useEffect } from 'react';
import { Plus, Settings, ChevronLeft, Pencil, Trash2, Eye, EyeOff, Brain, MessageSquare, ImagePlus, Gift, Star } from 'lucide-react';
import { db, type Person } from './db';
import { getApiKey } from './gemini';
import { AddPersonModal } from './components/AddPersonModal';
import { MemoryTab } from './components/tabs/MemoryTab';
import { InterestTab } from './components/tabs/InterestTab';
import { DestinyTab } from './components/tabs/DestinyTab';
import { GiftTab } from './components/tabs/GiftTab';

type PersonTab = 'destiny' | 'memory' | 'interest' | 'gift';

const PERSON_TABS: { id: PersonTab; label: string; icon: React.ElementType }[] = [
  { id: 'destiny', label: '命盤', icon: Star },
  { id: 'memory', label: '說過的話', icon: MessageSquare },
  { id: 'interest', label: '喜歡的東西', icon: ImagePlus },
  { id: 'gift', label: '禮物', icon: Gift },
];

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(localStorage.getItem('gemini_api_key') ?? '');
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  function save() {
    localStorage.setItem('gemini_api_key', key.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">設定</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700">✕</button>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Gemini API Key</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={key} onChange={e => setKey(e.target.value)} placeholder="AIza..." className="w-full h-10 pl-3 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500" />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">至 Google AI Studio 取得免費 API Key，儲存在本機不上傳</p>
        </div>
        <button onClick={save} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${saved ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'}`}>
          {saved ? '已儲存 ✓' : '儲存'}
        </button>
      </div>
    </div>
  );
}

function PersonCard({ person, onClick, onEdit, onDelete }: { person: Person; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="relative bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden group">
      <div className={`h-20 bg-gradient-to-br ${person.color} flex items-end p-3`}>
        <span className="text-4xl">{person.avatar}</span>
      </div>
      <div className="p-3">
        <p className="font-semibold text-white text-sm">{person.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{person.relationship}</p>
        {person.mbti && <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{person.mbti}</span>}
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60"><Pencil className="w-3 h-3" /></button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-7 h-7 rounded-lg bg-red-500/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-red-500/80"><Trash2 className="w-3 h-3" /></button>
      </div>
      <button onClick={onClick} className="absolute inset-0" />
    </div>
  );
}

export default function App() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [activeTab, setActiveTab] = useState<PersonTab>('destiny');
  const [showAdd, setShowAdd] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>();
  const [showSettings, setShowSettings] = useState(!getApiKey());

  useEffect(() => { loadPersons(); }, []);

  async function loadPersons() {
    const all = await db.persons.orderBy('createdAt').toArray();
    setPersons(all);
  }

  async function refreshActivePerson() {
    if (!activePerson) return;
    const updated = await db.persons.get(activePerson.id);
    if (updated) setActivePerson(updated);
    loadPersons();
  }

  async function deletePerson(id: string) {
    if (!confirm('確定刪除這個人物？所有記憶和分析也會一起刪除。')) return;
    await db.memories.where('personId').equals(id).delete();
    await db.interests.where('personId').equals(id).delete();
    await db.giftAnalyses.where('personId').equals(id).delete();
    await db.persons.delete(id);
    loadPersons();
  }

  function openPerson(person: Person) {
    setActivePerson(person);
    setActiveTab('destiny');
  }

  if (activePerson) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Person header */}
        <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
          <div className="max-w-lg mx-auto px-5 py-3 flex items-center gap-3">
            <button onClick={() => setActivePerson(null)} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-colors shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activePerson.color} flex items-center justify-center text-xl shrink-0`}>
              {activePerson.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">{activePerson.name}</p>
              <p className="text-[11px] text-slate-400">{activePerson.relationship}{activePerson.mbti ? ` · ${activePerson.mbti}` : ''}</p>
            </div>
            <button onClick={() => { setEditingPerson(activePerson); setShowAdd(true); }} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-colors shrink-0">
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="max-w-lg mx-auto px-5 flex border-t border-slate-800/50">
            {PERSON_TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold border-b-2 transition-colors ${activeTab === t.id ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  <Icon className="w-3.5 h-3.5" />{t.label}
                </button>
              );
            })}
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 py-5 pb-12">
          {activeTab === 'destiny' && <DestinyTab person={activePerson} onPersonUpdated={refreshActivePerson} />}
          {activeTab === 'memory' && <MemoryTab person={activePerson} />}
          {activeTab === 'interest' && <InterestTab person={activePerson} />}
          {activeTab === 'gift' && <GiftTab person={activePerson} />}
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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">人際腦</h1>
              <p className="text-[11px] text-slate-400">{persons.length} 個人物</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={() => { setEditingPerson(undefined); setShowAdd(true); }} className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6 pb-12">
        {persons.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🧠</p>
            <p className="text-slate-300 font-semibold">還沒有人物</p>
            <p className="text-slate-500 text-sm mt-2">點右上角 + 新增第一個人</p>
            <button onClick={() => { setEditingPerson(undefined); setShowAdd(true); }} className="mt-6 flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors mx-auto">
              <Plus className="w-4 h-4" />新增人物
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {persons.map(p => (
              <PersonCard
                key={p.id}
                person={p}
                onClick={() => openPerson(p)}
                onEdit={() => { setEditingPerson(p); setShowAdd(true); }}
                onDelete={() => deletePerson(p.id)}
              />
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
