# Manual Setup Guide

本文件只列需要使用者本人登入外部服務、授權或填入 Secret 的操作。

## A. Local / clasp
已完成或需要確認：
- Node.js
- npm
- clasp
- `clasp login`
- `clasp clone-script`

常用：

```cmd
clasp status
clasp pull
clasp push
```

## B. Google Spreadsheet

建立一份 Google Spreadsheet，例如：
```text
testExcel
```

建立三個工作表。

工作表與以下 headers 由使用者人工建立。程式只負責驗證，不會自行建立工作表、增加欄位或修改 Spreadsheet schema。

### Users
```text
user_id | display_name | created_at | is_active
```

### Entries
```text
id | user_id | entry_date | content | created_at | updated_at
```

### Summaries
```text
id | user_id | summary_type | start_date | end_date | content | generated_at | regenerate_count
```

從 Sheet URL 取得 Spreadsheet ID。

不要把 Sheet 分享給 LINE Bot 使用者。

## C. Google Apps Script Script Properties

瀏覽器：

```text
Apps Script
→ 專案設定
→ 指令碼屬性
```

依開發進度填入：

```text
SPREADSHEET_ID
LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET
AI_API_KEY
AI_PROVIDER
AI_MODEL
```

第一階段需要設定：
```text
SPREADSHEET_ID
LINE_CHANNEL_ACCESS_TOKEN
LINE_CHANNEL_SECRET
```

真正值不要寫進文件或 Git。

注意：純 GAS Web App 無法直接取得 LINE 的 `X-Line-Signature` request header，因此第一版不宣稱完成標準 webhook signature verification。第一階段以 `HtmlService.createHtmlOutput('OK')` 嘗試避開 ContentService redirect，但這只是私人、小規模測試用的 MVP workaround，不代表完成 signature verification。`LINE_CHANNEL_SECRET` 仍保留設定；未來正式公開使用時，必須改用可取得 headers 並驗證 signature 的 webhook gateway。

## D. LINE Developers
需要手動：
1. 登入 LINE Developers。
2. 建立 Provider（若需要）。
3. 建立 Messaging API Channel。
4. 取得 Channel Secret。
5. 取得 Channel Access Token。
6. 將兩者填入 Apps Script Script Properties。
7. GAS Web App 部署完成後，把 Web App URL 設為 LINE Webhook URL。
8. 開啟 Webhook。
9. Verify。
10. 將 Bot 加好友測試。

第一階段 Bot 會使用 Channel Access Token 呼叫 LINE Reply Message，並優先透過 LINE Profile API 取得 `display_name`。Profile API 失敗時允許留空，不影響日記功能。

## E. Google Apps Script Web App

當 webhook 程式完成後：

```text
Apps Script
→ Deploy
→ New deployment
→ Web app
```

部署完成取得 Web App URL。

LINE 會對該 URL 發送 POST request，
GAS 的 `doPost(e)` 會接收。

## F. Google 授權
第一次執行 Spreadsheet 存取、外部 HTTP 呼叫等能力時，
由使用者本人完成 Google 授權。

## G. AI Provider
Phase 2 使用 Google Gemini：
1. 登入 Google AI Studio，確認 API Project、費率、資料政策與隱私條款。
2. 建立 API Key。
3. 在 Apps Script Script Properties 設定 `AI_API_KEY`。
4. 設定 `AI_PROVIDER=gemini`。
5. 設定 `AI_MODEL=gemini-3.5-flash-lite`。
6. 第一次由 GAS 呼叫 Gemini 時完成必要的外部 HTTP 權限授權。

Gemini quota 以 Google AI Studio 對目前 Project 與 model 顯示的即時數值為準。Provider 可能調整 RPM、TPM、RPD 或其他限制，程式不得寫死觀察值。測試以 mock/stub 為主，真實 Gemini 測試只做最小必要次數。

Bot 不提供任意 AI 聊天，避免額度被濫用。

Phase 2 仍採純 GAS Web App：無法標準取得 `X-Line-Signature`，同步 AI request 可能造成 LINE timeout，`HtmlService.createHtmlOutput('OK')` 也仍只是私人 MVP workaround。正式公開或大量使用時，必須改成可驗證 signature 的 webhook gateway，以及非同步 queue／worker。

## H. Triggers
自動週/月/年摘要為後續功能。
手動摘要穩定後再建立時間觸發器。

## I. Codex 可以做
- GAS 程式架構
- LINE webhook
- Sheets CRUD
- command routing
- AI API 串接
- cache / quota control
- date calculation
- scheduler
- documentation

## J. 使用者本人要做
- Google / LINE / AI 帳號登入
- Script Properties 真正值
- Google 權限授權
- LINE Channel 建立
- API Key 建立
- Web App Deploy / 權限確認
- Webhook URL 設定
- 最終測試授權
