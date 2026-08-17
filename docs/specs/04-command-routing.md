# Spec 04 - Command Routing

## Purpose
限制哪些 LINE 訊息會觸發哪些功能，避免所有訊息都送到 AI。

## Webhook Event Scope
- 一次 webhook 可能包含多個 events，必須逐一處理。
- 第一階段只處理具有 `source.userId` 的文字 message event。
- 其他 event 一律忽略，不寫入資料、不呼叫 AI。
- 純 GAS Web App 無法直接取得 LINE 的 `X-Line-Signature` request header，因此第一版不宣稱完成標準 webhook signature verification。
- 第一階段以 `HtmlService.createHtmlOutput('OK')` 作為 MVP workaround，嘗試避開 ContentService redirect；此方式僅適用私人、小規模測試，不代表完成 signature verification。
- `LINE_CHANNEL_SECRET` 仍保留設定；未來正式公開使用時，必須改用可取得 headers 並驗證 signature 的 webhook gateway。

## Supported Commands

### 新增日記
```text
感恩 <內容>
感恩內容
```
Action：
- 一則文字訊息以換行切分，每個 trim 後以 `感恩` 開頭的行皆為獨立日記候選
- 非 `感恩` 開頭的行忽略，不併入前後日記
- DiaryService.addFromMessage
- 不使用 AI

Routing precedence：
1. 完整訊息 trim 後若精確符合 `查看紀錄`、Help 或三種 AI 回顧指令，先走對應既有 routing。
2. 否則，只要訊息中至少一行 trim 後以 `感恩` 開頭，就走多篇日記新增流程。
3. 沒有任何感恩開頭行時，走 unsupported routing。

### 查看紀錄
```text
查看紀錄
```
Action：
- DiaryService.getRecent
- 不使用 AI

### 本週回顧
```text
本週回顧
```
Action：
- SummaryService.week
- 只有 cache miss/stale 且達最低篇數時可能呼叫 AI

### 本月回顧
```text
本月回顧
```
Action：
- SummaryService.month
- 只有 cache miss/stale 且達最低篇數時可能呼叫 AI

### 年度回顧
```text
年度回顧
```
Action：
- SummaryService.year
- 只有 cache miss/stale 且達最低篇數時可能呼叫 AI

Phase 2 摘要路徑必須使用 webhook userId 隔離資料；無資料、篇數不足、cache hit、Gemini error 的行為依 `02-ai-summary.md`。

### Help
```text
幫助
使用說明
```
Action：
回傳可用指令，不使用 AI。

## Unsupported Message
例如：
```text
台中有什麼好吃的？
```

不呼叫 AI。

回覆：
```text
目前我是感恩日記小幫手 🌱

你可以使用：
・感恩 + 內容
・查看紀錄
・本週回顧
・本月回顧
・年度回顧
```

## Security
Command router 不接受：
- 指定其他 userId
- 直接傳入 Sheet row
- 任意 AI prompt
