# 🧠 人際腦 — 你的 AI 人際記憶助手

> 記住伴侶/朋友說過的話、喜歡的東西，AI 幫你想禮物、找話題、算命盤

## ✨ 功能

- **🧠 記住 TA 說過的話** — 貼入聊天紀錄，AI 自動擷取喜好、故事、重要日期
- **📸 截圖分析興趣** — 上傳 IG/小紅書/Threads 截圖，AI 推測 TA 可能喜歡什麼
- **☰ 八字命盤** — 根據出生時間，AI 生成性格分析與相處建議
- **🎁 禮物建議** — 綜合所有記憶與興趣，AI 推薦適合的禮物
- **💬 問 AI** — 隨時詢問「小明上次說想吃什麼？」，AI 從記憶庫找答案

## 🚀 線上使用

本機資料儲存在瀏覽器（IndexedDB），不會上傳到任何伺服器。

👉 **[點此開啟](https://你的部署網址)**

## 🛠️ 技術棧

- React 19 + TypeScript + Vite
- Tailwind CSS
- Dexie.js（瀏覽器本地資料庫）
- Google Gemini API（AI 分析）

## 📦 本地開發

```bash
npm install
npm run dev
```

## 🔑 API Key

首次使用時需要輸入 Google Gemini API Key（免費）：
1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 建立 API Key
3. 貼入設定中（僅儲存在本機）

## 📤 資料備份

設定中提供「匯出 JSON / 匯入 JSON」，可備份所有人物資料。

## 📄 License

MIT
