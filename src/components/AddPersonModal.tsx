import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { db, generateId, RELATIONSHIPS, AVATARS, PERSON_COLORS, type Person, type Relationship } from '../db';

interface Props {
  onClose: () => void;
  onSaved: () => void;
  editing?: Person;
}

const MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];

export function AddPersonModal({ onClose, onSaved, editing }: Props) {
  const [name, setName] = useState(editing?.name ?? '');
  const [relationship, setRelationship] = useState<Relationship>(editing?.relationship ?? '好友');
  const [avatar, setAvatar] = useState(editing?.avatar ?? '🧑');
  const [color, setColor] = useState(editing?.color ?? PERSON_COLORS[0]);
  const [birthDate, setBirthDate] = useState(editing?.birthDate ?? '');
  const [birthTime, setBirthTime] = useState(editing?.birthTime ?? '');
  const [birthPlace, setBirthPlace] = useState(editing?.birthPlace ?? '');
  const [mbti, setMbti] = useState(editing?.mbti ?? '');
  const [destinyNotes, setDestinyNotes] = useState(editing?.destinyNotes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const now = Date.now();
      if (editing) {
        await db.persons.update(editing.id, {
          name: name.trim(), relationship, avatar, color,
          birthDate: birthDate || undefined,
          birthTime: birthTime || undefined,
          birthPlace: birthPlace || undefined,
          mbti: mbti || undefined,
          destinyNotes: destinyNotes || undefined,
          updatedAt: now,
        });
      } else {
        await db.persons.add({
          id: generateId(), name: name.trim(), relationship, avatar, color,
          birthDate: birthDate || undefined,
          birthTime: birthTime || undefined,
          birthPlace: birthPlace || undefined,
          mbti: mbti || undefined,
          destinyNotes: destinyNotes || undefined,
          createdAt: now, updatedAt: now,
        });
      }
      onSaved();
    } catch (err) {
      console.error('儲存人物失敗:', err);
      alert('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">{editing ? '編輯' : '新增'}人物</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar picker */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">頭像</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${avatar === a ? 'ring-2 ring-rose-500 bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">顏色</label>
            <div className="flex flex-wrap gap-2">
              {PERSON_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c} transition-all ${color === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          {/* Name + Relationship */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">名字 / 暱稱 *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：小明"
                className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">關係</label>
              <div className="relative">
                <select
                  value={relationship}
                  onChange={e => setRelationship(e.target.value as Relationship)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none appearance-none"
                >
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Birth info */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">出生資訊（用來算八字）</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">出生日期</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">出生時間</label>
                <input
                  type="time"
                  value={birthTime}
                  onChange={e => setBirthTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
            <input
              type="text"
              value={birthPlace}
              onChange={e => setBirthPlace(e.target.value)}
              placeholder="出生地點（可選，例如：台北）"
              className="w-full h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-rose-500 mt-2"
            />
          </div>

          {/* MBTI */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">MBTI</label>
            <div className="flex flex-wrap gap-1.5">
              {MBTI_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setMbti(mbti === t ? '' : t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${mbti === t ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Destiny notes */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">命理結果（從 family-destiny-app 貼過來）</label>
            <textarea
              value={destinyNotes}
              onChange={e => setDestinyNotes(e.target.value)}
              placeholder="貼入命理分析結果，會結合到禮物建議裡..."
              className="w-full h-24 p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-rose-500 placeholder:text-slate-500"
            />
          </div>

          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="w-full py-3 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors"
          >
            {saving ? '儲存中...' : editing ? '儲存變更' : '新增人物'}
          </button>
        </div>
      </div>
    </div>
  );
}
