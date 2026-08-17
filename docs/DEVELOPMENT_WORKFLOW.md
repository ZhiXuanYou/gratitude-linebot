# Development Workflow

## 1. Current Development Model

```text
Codex
  ↓
Local Repository
  ↓
src/*
  ↓
clasp push
  ↓
Google Apps Script
```

## 2. Existing Setup
本專案已透過 `clasp clone-script` 綁定既有 Apps Script。

專案根目錄應存在：
```text
.clasp.json
```

GAS 原始碼位於：
```text
src/
```

## 3. 開始工作前

進入專案：

```cmd
cd C:\Users\Zhi\OneDrive\Desktop\Project\gratitude-linebot
```

查看同步狀態：

```cmd
clasp status
```

如果曾在瀏覽器直接修改 Apps Script：

```cmd
clasp pull
```

## 4. Codex 開發
Codex 應：
1. 閱讀 `AGENTS.md`。
2. 閱讀相關 requirements / architecture / spec。
3. 提出 implementation plan。
4. 修改 `src/`。
5. 說明修改檔案。
6. 提供測試步驟。

## 5. 推送 GAS

```cmd
clasp status
clasp push
```

## 6. 從 GAS 拉回

```cmd
clasp pull
```

## 7. 建議原則
- 同一時間盡量不要同時在瀏覽器和本機修改同一支檔案。
- 本機 Repository 視為主要開發來源。
- Apps Script 瀏覽器主要用於：
  - Script Properties
  - 權限授權
  - Execution Log
  - Deploy
  - Trigger
  - 必要除錯確認

### 7.1 開發用手動測試函式
- 可在 `src/` 建立不影響正式 webhook 流程的手動測試函式，用於權限授權、連線確認與必要除錯。
- 測試函式不得由 `doPost(e)` 或正式 command routing 呼叫。
- 測試函式不得寫入測試資料、建立或修改 Spreadsheet schema，也不得輸出 Secret、Token、Spreadsheet ID 或完整私人日記內容。
- Spreadsheet connection/schema verification helper 只能讀取 `SPREADSHEET_ID`、開啟 Spreadsheet，並驗證 `Users`、`Entries`、`Summaries` 與既有 headers。
- 測試函式應回傳不含敏感資訊的明確成功結果；驗證失敗時沿用正式 service 的錯誤。
- Phase 2 可建立人工執行的 Gemini smoke test helper，但每次執行只能透過正式 `SummaryPrompt` 與 `AiService` 發送一次最小必要 request。
- Gemini smoke test 必須使用固定、非敏感的假日記，不得讀取 Users、Entries、Summaries 或任何真實使用者資料，也不得寫入或修改 Google Sheets。
- Gemini smoke test 只能回傳 success、model 與非敏感的摘要結果；失敗時不得暴露 API Key、request headers、原始 provider response 或 stack trace。
- Gemini smoke test 的安全診斷模式可顯示 HTTP status code、Google Gemini error status（例如 `PERMISSION_DENIED`、`NOT_FOUND`、`RESOURCE_EXHAUSTED`）、model，以及經清理與截斷的 error message。
- 安全診斷不得顯示完整 provider response；message 必須移除 API Key、疑似憑證、request header、換行與控制字元，並限制長度。無法安全解析的欄位使用一般化文字。
- 正式 LINE 摘要流程不得將安全診斷內容回覆給使用者，仍只使用 `docs/specs/02-ai-summary.md` 的統一友善錯誤訊息。
- Gemini smoke test 不得由 `doPost(e)`、`CommandService` 或正式 routing 呼叫；因會消耗真實 Provider quota，只能由使用者在 Apps Script 編輯器明確手動執行。

### 7.2 SummaryService integration diagnostic helper

- 可建立 `testWeeklySummaryIntegration`，但只能由開發者在 Apps Script 編輯器中人工執行，不得由 `doPost()`、`CommandService` 或任何正式 routing 呼叫。
- helper 不經 LINE webhook、不使用 `replyToken`，並且必須走正式 `SummaryService` 共用邏輯，不得複製另一套摘要流程。
- 測試用 LINE userId 必須填在 helper 內明確標示的 `TEST_LINE_USER_ID` 常數；預設必須為空。未填時直接拋出安全錯誤，不得讀取資料或呼叫 Gemini。
- helper 可以讀取指定使用者的 Entries、讀取 Summaries cache，並在 cache miss 或 stale 時依正式流程呼叫一次 Gemini、寫入 Summaries；不得修改 Entries 或 Users。
- 診斷 stage 僅限 `ENTRY_QUERY`、`MINIMUM_CHECK`、`CACHE_READ`、`LOCK_WAIT`、`AI_REQUEST`、`SUMMARY_WRITE`、`COMPLETE`。
- 診斷結果可包含 summary type、start/end date、entries count、cache state（`hit`／`miss`／`stale`）、exception type、安全清理後 message，以及 AI error 的 Gemini HTTP status／provider status。
- 診斷結果不得包含 userId、日記全文、摘要全文、API Key、LINE Token／Secret、Spreadsheet ID、完整 provider response。
- 正式 LINE 路徑仍只回覆既有的統一友善錯誤，不得暴露任何診斷資訊。

## 8. Git 建議

```cmd
git init
git add .
git commit -m "chore: initialize gratitude linebot project"
```

Secret 不可加入 Git。

## 9. 第一次給 Codex 的 Prompt

```text
請先閱讀：
- AGENTS.md
- docs/REQUIREMENTS.md
- docs/ARCHITECTURE.md
- docs/CONFIGURATION.md
- docs/specs/01-diary.md
- docs/specs/04-command-routing.md

先不要一次完成全部專案。

請先：
1. 說明你對專案的理解。
2. 檢查需求是否有矛盾或缺漏。
3. 提出第一階段 implementation plan。
4. 告訴我預計新增或修改哪些檔案。
5. 第一階段只做 LINE webhook、Google Sheets 連線、新增日記、查看紀錄。
6. AI 摘要先不要實作。
```
