import { useState, useEffect, useRef } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { db, generateId, type Interest, type Person } from '../../db';
import { analyzeScreenshot, type ExtractedInterest } from '../../gemini';

const CONFIDENCE_LABEL: Record<Interest['confidence'], string> = {
  high: '確定',
  medium: '可能',
  low: '推測',
};

const CONFIDENCE_COLOR: Record<Interest['confidence'], string> = {
  high: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function createThumbnail(base64: string): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(120 / img.width, 120 / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    // If the file isn't a decodable image, fall back to the original
    // (still-valid) base64 instead of hanging forever.
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export function InterestTab({ person }: { person: Person }) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedInterest[]>([]);
  const [previewImage, setPreviewImage] = useState('');
  const [thumbnailImage, setThumbnailImage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [person.id]);

  async function load() {
    const all = await db.interests.where('personId').equals(person.id).reverse().sortBy('createdAt');
    setInterests(all);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('請上傳圖片檔案（PNG / JPG 等）');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('圖片太大了（上限 8MB），請上傳較小的截圖');
      return;
    }
    const base64 = await fileToBase64(file);
    const thumb = await createThumbnail(base64);
    setPreviewImage(base64);
    setThumbnailImage(thumb);
    setExtracted([]);
    setError('');
    setAnalyzing(true);
    try {
      const result = await analyzeScreenshot(base64, person);
      if (result.length === 0) setError('截圖裡沒有明顯的興趣信號，換一張試試？');
      else setExtracted(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失敗');
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveOne(item: ExtractedInterest) {
    try {
      await db.interests.add({ id: generateId(), personId: person.id, content: item.content, confidence: item.confidence, sourceDescription: item.sourceDescription, imageThumbnail: thumbnailImage, tags: item.tags, createdAt: Date.now() });
      setExtracted(prev => prev.filter(e => e.content !== item.content));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    }
  }

  async function saveAll() {
    const now = Date.now();
    try {
      await db.transaction('rw', db.interests, async () => {
        for (const item of extracted) {
          await db.interests.add({ id: generateId(), personId: person.id, content: item.content, confidence: item.confidence, sourceDescription: item.sourceDescription, imageThumbnail: thumbnailImage, tags: item.tags, createdAt: now });
        }
      });
      setExtracted([]); setPreviewImage(''); setThumbnailImage(''); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量儲存失敗，請重試');
    }
  }

  async function deleteInterest(id: string) {
    await db.interests.delete(id); load();
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <label
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); if (analyzing) return; const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={`flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900 transition-colors ${analyzing ? 'cursor-not-allowed opacity-80' : 'hover:border-rose-500/50 cursor-pointer'}`}
      >
        {analyzing ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            <p className="text-sm text-rose-400 font-medium">AI 分析截圖中...</p>
          </div>
        ) : previewImage ? (
          <div className="flex items-center gap-4 px-4">
            <img src={previewImage} className="h-24 w-24 object-cover rounded-xl" alt="" />
            <div className="text-left">
              <p className="text-sm text-slate-300 font-medium">截圖已上傳</p>
              <p className="text-xs text-slate-500 mt-1">再次拖入可換圖</p>
            </div>
          </div>
        ) : (
          <>
            <ImagePlus className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-sm text-slate-400 font-medium">拖入截圖或點擊上傳</p>
            <p className="text-xs text-slate-500 mt-1">IG、小紅書、Threads 截圖皆可</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" disabled={analyzing} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      </label>

      {error && <p className="text-xs text-red-400 px-1">{error}</p>}

      {/* Extracted results */}
      {extracted.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">AI 推測 {extracted.length} 個興趣，確認後儲存：</p>
            <button onClick={saveAll} className="text-xs text-rose-400 font-semibold hover:text-rose-300">全部儲存</button>
          </div>
          {extracted.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800 border border-slate-700">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{item.content}</p>
                <p className="text-[11px] text-slate-500 mt-1">{item.sourceDescription}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CONFIDENCE_COLOR[item.confidence]}`}>{CONFIDENCE_LABEL[item.confidence]}</span>
                  {item.tags.map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">#{tag}</span>)}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => saveOne(item)} className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 text-sm">✓</button>
                <button onClick={() => setExtracted(prev => prev.filter((_, j) => j !== i))} className="w-7 h-7 rounded-lg bg-slate-700 text-slate-400 flex items-center justify-center hover:bg-slate-600"><X className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interest list */}
      {interests.length === 0 && extracted.length === 0 && !analyzing ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-3xl mb-2">📸</p>
          <p className="text-sm">上傳 {person.name} 分享給你的截圖</p>
          <p className="text-xs mt-1">AI 會分析 TA 可能對什麼有興趣</p>
        </div>
      ) : interests.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">已儲存的興趣信號 ({interests.length})</p>
          {interests.map(item => (
            <div key={item.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 group">
              {item.imageThumbnail && (
                <img src={item.imageThumbnail} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-relaxed">{item.content}</p>
                <p className="text-[11px] text-slate-500 mt-1">{item.sourceDescription}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CONFIDENCE_COLOR[item.confidence]}`}>{CONFIDENCE_LABEL[item.confidence]}</span>
                  {item.tags.map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">#{tag}</span>)}
                  <span className="text-[10px] text-slate-600 ml-auto">{new Date(item.createdAt).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>
              <button onClick={() => deleteInterest(item.id)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
