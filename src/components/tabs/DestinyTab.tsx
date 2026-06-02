import { useState, useEffect } from 'react';
import { Sparkles, Save } from 'lucide-react';
import { db, type Person } from '../../db';
import { calculateBazi } from '../../gemini';

export function DestinyTab({ person, onPersonUpdated }: { person: Person; onPersonUpdated: () => void }) {
  const [calculating, setCalculating] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(person.destinyNotes ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setNotesInput(person.destinyNotes ?? '');
    setEditingNotes(false);
    setError('');
  }, [person.id, person.destinyNotes]);

  async function handleCalculate() {
    if (!person.birthDate) { setError('請先在人物設定中填入出生日期'); return; }
    setCalculating(true); setError('');
    try {
      const result = await calculateBazi(person);
      await db.persons.update(person.id, { baziResult: result, updatedAt: Date.now() });
      onPersonUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : '計算失敗');
    } finally { setCalculating(false); }
  }

  async function saveNotes() {
    try {
      await db.persons.update(person.id, { destinyNotes: notesInput, updatedAt: Date.now() });
      setEditingNotes(false);
      onPersonUpdated();
    } catch (err) {
      console.error('儲存筆記失敗:', err);
      setError('儲存失敗，請稍後再試');
    }
  }

  const hasBirthInfo = !!person.birthDate;

  return (
    <div className="space-y-4">
      {/* Birth info summary */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
        <p className="text-xs text-slate-500 mb-3">基本資料</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '出生日期', value: person.birthDate },
            { label: '出生時間', value: person.birthTime },
            { label: '出生地點', value: person.birthPlace },
            { label: 'MBTI', value: person.mbti },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className={`text-sm mt-0.5 ${value ? 'text-white' : 'text-slate-600'}`}>{value || '未填寫'}</p>
            </div>
          ))}
        </div>
        {!hasBirthInfo && (
          <p className="text-xs text-amber-400 mt-3">點右上角 ✏️ 填入出生時間，才能計算八字</p>
        )}
      </div>

      {/* Bazi section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">☰ 八字分析</p>
          <button
            onClick={handleCalculate}
            disabled={calculating || !hasBirthInfo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors"
          >
            {calculating ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />計算中...</> : <><Sparkles className="w-3.5 h-3.5" />AI 計算</>}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {person.baziResult ? (
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-800 rounded-xl p-3">
            {person.baziResult}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {hasBirthInfo ? '點「AI 計算」，Gemini 會根據出生時間推算八字與性格分析' : '填入出生資訊後可以計算'}
          </p>
        )}
      </div>

      {/* External destiny notes */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-200">📋 命理筆記</p>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-xs text-slate-400 hover:text-slate-200">
              {person.destinyNotes ? '編輯' : '新增'}
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesInput}
              onChange={e => setNotesInput(e.target.value)}
              placeholder="從 family-destiny-app 貼入命理結果，或手動記錄性格觀察..."
              className="w-full h-32 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
            />
            <div className="flex gap-2">
              <button onClick={saveNotes} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600">
                <Save className="w-3.5 h-3.5" />儲存
              </button>
              <button onClick={() => { setEditingNotes(false); setNotesInput(person.destinyNotes ?? ''); }} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700">
                取消
              </button>
            </div>
          </div>
        ) : person.destinyNotes ? (
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {person.destinyNotes}
          </div>
        ) : (
          <p className="text-sm text-slate-500">可以把 family-destiny-app 的分析結果貼進來</p>
        )}
      </div>
    </div>
  );
}
