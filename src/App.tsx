import { useState } from 'react';
import { Brain, Search, Gift, Settings, X, Eye, EyeOff } from 'lucide-react';
import { MemoryTab } from './components/MemoryTab';
import { SearchTab } from './components/SearchTab';
import { GiftTab } from './components/GiftTab';

type Tab = 'memory' | 'search' | 'gift';

const TABS = [
  { id: 'memory' as Tab, label: '記憶庫', icon: Brain },
  { id: 'search' as Tab, label: '詢問', icon: Search },
  { id: 'gift' as Tab, label: '禮物', icon: Gift },
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
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Gemini API Key</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="AIza..."
              className="w-full h-10 pl-3 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            至 Google AI Studio 取得免費 API Key，儲存在本機不會上傳
          </p>
        </div>

        <button
          onClick={save}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            saved ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-600'
          }`}
        >
          {saved ? '已儲存 ✓' : '儲存'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('memory');
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('gemini_api_key'));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center text-xl">
              🧠
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">TA 腦</h1>
              <p className="text-[11px] text-slate-400">戀愛記憶助手</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="sticky top-[65px] z-30 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-lg mx-auto px-5">
          <div className="flex">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-5 py-5 pb-10">
        {tab === 'memory' && <MemoryTab />}
        {tab === 'search' && <SearchTab />}
        {tab === 'gift' && <GiftTab />}
      </main>

      {/* Settings modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
