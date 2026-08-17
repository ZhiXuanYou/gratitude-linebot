# Configuration

## 1. 原則
真正的 ID、Token、Secret、API Key 不寫進 Repository。

文件只保留「屬性名稱」。

真正的值請在瀏覽器的 Google Apps Script 專案中設定：

```text
Apps Script
→ 專案設定
→ 指令碼屬性 / Script Properties
```

## 2. Required Script Properties

- `SPREADSHEET_ID`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `AI_API_KEY`
- `AI_PROVIDER`
- `AI_MODEL`

### SPREADSHEET_ID
Google Spreadsheet URL：

```text
https://docs.google.com/spreadsheets/d/AAAABBBBCCCC/edit
```

`AAAABBBBCCCC` 就是 Spreadsheet ID。

真正值只填入 Script Properties，不要補進 Markdown。

## 3. GAS 讀取方式

```javascript
function getConfigValue(key) {
  const value = PropertiesService
    .getScriptProperties()
    .getProperty(key);

  if (!value) {
    throw new Error(`Missing Script Property: ${key}`);
  }

  return value;
}
```

Google Sheet：

```javascript
function getSpreadsheet() {
  const spreadsheetId = getConfigValue('SPREADSHEET_ID');
  return SpreadsheetApp.openById(spreadsheetId);
}
```

## 4. 不要做的事情

不要：

```javascript
const AI_API_KEY = '真正的Key';
const SPREADSHEET_ID = '真正的ID';
```

不要在：
- AGENTS.md
- README.md
- docs/*
- src/*
- Git commit

留下 Secret。

## 5. 建議設定順序
第一階段：
- `SPREADSHEET_ID`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

第一階段包含 LINE webhook 與 Reply Message，因此以上三項都必須設定。

`LINE_CHANNEL_SECRET` 第一階段先保留於 Script Properties。純 GAS Web App 無法直接取得 LINE 的 `X-Line-Signature` request header，因此第一版不宣稱完成標準 webhook signature verification。第一階段的 `HtmlService.createHtmlOutput('OK')` 僅是私人、小規模測試用的 MVP workaround；未來正式公開使用時，必須改用可取得 headers 並驗證 signature 的 webhook gateway。

AI 階段：
- `AI_API_KEY`
- `AI_PROVIDER`
- `AI_MODEL`

Phase 2 第一版固定支援：

```text
AI_PROVIDER=gemini
AI_MODEL=gemini-3.5-flash-lite
AI_API_KEY=<Google AI Studio API Key>
```

以上值只設定於 Script Properties。程式只在 AI 摘要路徑讀取並驗證；設定缺失或不支援時，摘要回覆安全錯誤，且不得影響新增日記、查看紀錄、Help 或 unsupported routing。

Gemini REST 使用 `generateContent`，API key 放在 `x-goog-api-key` request header，不放入 URL、原始碼或 Log。

正式程式由 `AI_MODEL` 動態建立 Gemini endpoint，不得寫死 model ID。更換 model 時必須先更新正式文件，再修改 Script Property。
