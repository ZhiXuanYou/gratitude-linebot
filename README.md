# Gratitude LINE Bot

一個使用 LINE 紀錄感恩日記，並透過 AI 產生週、月、年度回顧的 MVP。

## Architecture

```text
LINE User
   |
   v
LINE Messaging API
   |
   v
Google Apps Script
   |
   +------> Google Sheets
   |
   +------> AI API（僅摘要）
```

本機開發：

```text
Codex
   |
   v
Local Git Repository
   |
   v
clasp
   |
   v
Google Apps Script
```

## MVP Features
- 新增感恩日記
- 查看最近紀錄
- 本週 AI 回顧
- 本月 AI 回顧
- 年度 AI 回顧
- 摘要快取
- AI 使用次數控制
- 依 LINE userId 隔離資料
- 未來可加入自動週/月/年推播

## Repository Structure

```text
gratitude-linebot/
├── AGENTS.md
├── README.md
├── .gitignore
├── .clasp.json
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── CONFIGURATION.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── SETUP_MANUAL.md
│   └── specs/
│       ├── 01-diary.md
│       ├── 02-ai-summary.md
│       ├── 03-scheduler.md
│       └── 04-command-routing.md
└── src/
    ├── appsscript.json
    └── ...
```

## Documents
- `AGENTS.md`：Codex 在此專案必須遵守的規則
- `docs/REQUIREMENTS.md`：產品需求
- `docs/ARCHITECTURE.md`：系統架構與資料設計
- `docs/CONFIGURATION.md`：Script Properties 與設定方式
- `docs/DEVELOPMENT_WORKFLOW.md`：Codex + clasp 開發流程
- `docs/SETUP_MANUAL.md`：需要人工建立或操作的外部服務
- `docs/specs/*`：各功能 Spec

## Recommended Development Order
1. 完成人工前置設定
2. 建立 Google Sheets 結構
3. 確認 Script Properties
4. 完成 LINE webhook
5. 完成 Google Sheets 存取
6. 完成新增日記 / 查看紀錄
7. 串接 AI API
8. 完成摘要快取與用量控制
9. 加入自動排程
10. 整合測試
11. 正式部署
