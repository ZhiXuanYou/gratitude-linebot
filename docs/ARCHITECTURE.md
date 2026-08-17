# System Architecture

## 1. Runtime Architecture

```text
LINE User
   |
   | message
   v
LINE Messaging API
   |
   | webhook POST
   v
Google Apps Script Web App
   |
   +--------------------+
   |                    |
   v                    v
Google Sheets         AI API
   |                    |
   +----------+---------+
              |
              v
       LINE Reply / Push
```

Apps Script Web App 以 `doPost(e)` 接收 LINE webhook。

一次 webhook request 可能包含多個 events。第一階段逐一檢查，只處理具有 `source.userId` 的文字 message event；其他 event 忽略，不寫入資料、不呼叫 AI。

### 1.1 Webhook Signature 限制
純 GAS Web App 無法直接取得 LINE 的 `X-Line-Signature` request header，因此第一版不宣稱已完成標準 webhook signature verification。

第一階段以 `HtmlService.createHtmlOutput('OK')` 作為 webhook response，嘗試避開 ContentService redirect。這是僅供私人、小規模測試的 MVP workaround，不代表已完成 LINE signature verification，也不視為正式安全架構。

`LINE_CHANNEL_SECRET` 仍保留於 Script Properties。未來正式公開使用時，必須在 LINE 與 GAS 之間加入可取得 request headers 並驗證 signature 的 webhook gateway。

## 2. Development Architecture

```text
Codex
   |
   v
Local Repository
   |
   | edit src/*
   v
clasp
   |
   | clasp push
   v
Google Apps Script Project
```

反向同步：

```text
Google Apps Script
   |
   | clasp pull
   v
Local Repository
```

## 3. Google Spreadsheet Schema

### Users
| Column | Description |
|---|---|
| user_id | LINE userId |
| display_name | LINE 顯示名稱，可選 |
| created_at | 首次使用時間 |
| is_active | 是否啟用 |

`display_name` 優先透過 LINE Profile API 取得；若取得失敗則使用空字串，且不得中止日記功能。

### Entries
| Column | Description |
|---|---|
| id | UUID |
| user_id | LINE userId |
| entry_date | 日記日期 |
| content | 感恩內容 |
| created_at | 建立時間 |
| updated_at | 更新時間 |

日期與時間規則：
- `entry_date` 使用 `yyyy-MM-dd`。
- `created_at`、`updated_at` 使用 Google Sheets Date 值。
- 對使用者顯示時依 Apps Script 專案時區格式化，查看紀錄只顯示日期。

### Summaries
| Column | Description |
|---|---|
| id | UUID |
| user_id | LINE userId |
| summary_type | WEEK / MONTH / YEAR |
| start_date | 開始日期 |
| end_date | 結束日期 |
| content | AI 摘要 |
| generated_at | 產生時間 |
| regenerate_count | 重產次數 |

Phase 2 摘要欄位規則：`id` 使用 UUID；`user_id` 來自 webhook；`summary_type` 為 WEEK／MONTH／YEAR；`start_date`、`end_date` 為 `yyyy-MM-dd`；`generated_at` 為 Google Sheets Date；`regenerate_count` 固定為 `0`。同一 cache identity 只保留一列，stale 時更新既有列。

三個工作表與 headers 均由使用者人工建立。程式只驗證工作表與欄位是否存在，不自行建立或修改 Spreadsheet schema。

## 4. Suggested GAS Source Structure

```text
src/
├── appsscript.json
├── Main.js
├── Config.js
├── LineService.js
├── CommandService.js
├── UserService.js
├── SheetService.js
├── DiaryService.js
├── SummaryService.js
├── SummaryPrompt.js
├── AiService.js
└── DateService.js
```

`doPost()` 應保持精簡。

## 5. Configuration Flow

```text
Google Apps Script
   |
   v
Script Properties
   |
   +-- SPREADSHEET_ID
   +-- LINE_CHANNEL_ACCESS_TOKEN
   +-- LINE_CHANNEL_SECRET
   +-- AI_API_KEY
   +-- AI_PROVIDER
   +-- AI_MODEL
```

程式使用 `PropertiesService.getScriptProperties()` 取得值。

第一階段必要設定為 `SPREADSHEET_ID`、`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`。

## 5.1 Phase 2 Command Flow

```text
文字 message event + source.userId
   |
   v
CommandService
   +-- 含感恩開頭行 -----> DiaryService.addFromMessage（逐行解析、逐篇寫入）
   +-- 查看紀錄 ---------> DiaryService.getRecent（最近 5 筆）
   +-- 幫助 / 使用說明 ---> Help response
   +-- 回顧指令 ----------> SummaryService（cache／Gemini／Summaries）
   +-- 其他文字 ----------> Unsupported response（不呼叫 AI）
```

日記訊息以換行切分。每個 trim 後以 `感恩` 開頭且移除指令後內容非空的行，對應一筆獨立 `Entries`；非感恩行忽略，不與相鄰日記合併。

同一則 LINE message 的所有有效日記視為一個批次：先在記憶體建立完整 Entries rows，再對連續 range 呼叫一次 `setValues()`。單篇也沿用相同介面，不使用逐筆 `appendRow()`。

批次內所有 rows 共用同一個 `now`，`entry_date` 由該時間依 Apps Script 專案時區產生，且每一列的 `created_at`、`updated_at` 都使用相同 `now`；每篇仍各自產生 UUID。

單次 `setValues()` 用於降低逐筆寫入導致部分成功的風險，但 Google Sheets 並非本系統的 database transaction。若批次寫入拋出錯誤，本次日記新增視為失敗，不回覆成功篇數，改回覆友善失敗訊息。

## 6. Google Sheets Connection

```text
GAS
 |
 | read SPREADSHEET_ID
 v
SpreadsheetApp.openById(...)
 |
 v
Google Spreadsheet
 |
 +-- Users
 +-- Entries
 +-- Summaries
```

朋友不需要 Google Sheet 權限。

## 7. AI Cost Strategy
- Phase 2 目前設定為 Gemini `gemini-3.5-flash-lite`；AiService 由 `AI_MODEL` Script Property 動態建立 endpoint，不在程式寫死 model ID。
- 只有摘要路徑能呼叫 AI。
- 先查 `Summaries`。
- 最低篇數不足時不呼叫 AI。
- cache identity 為 userId + summary type + start/end；期間最新 Entry 不晚於摘要 generated_at 才有效。
- 先查 cache，再取得全域 `ScriptLock`，並在 lock 內二次查 cache；仍需要時才呼叫 Gemini及儲存摘要。這是 1～10 人低流量 MVP workaround，未來大量使用者必須改為 key-based lock、queue 或 backend。
- YEAR 在 Phase 2 直接使用當年目前使用者的原始 Entries；月摘要聚合是後續優化。
- 送給 Gemini 的資料在應用程式層先依 userId 隔離，再縮減為日期與內容，不包含身分或 Sheet metadata。
- AI response 在 webhook 中同步產生，可能造成 LINE timeout；目前私人 MVP 接受此風險。正式公開或大量使用時必須採 webhook gateway + 非同步 queue／worker。
