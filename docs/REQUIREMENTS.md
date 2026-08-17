# Product Requirements

## 1. 產品目的
讓 1～10 名使用者透過 LINE 快速紀錄每天值得感恩的事情，
並透過 AI 回顧一段期間中常出現的感恩主題、值得記住的事件與正向變化。

## 2. MVP 使用者
- 初期 1～10 人。
- 使用者不需要 Google 帳號權限。
- 使用者只透過 LINE Bot 操作。
- Google Sheets 由系統擁有者管理。

## 3. 核心功能

### 3.0 第一階段範圍
第一階段包含 LINE webhook、Script Properties、Google Sheets 連線、Users 建立與讀取、新增日記、查看最近 5 筆、LINE Reply Message、Help 與 unsupported command routing。

第一階段需要的 Script Properties：
- `SPREADSHEET_ID`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

`本週回顧`、`本月回顧`、`年度回顧` 在第一階段只回覆：

```text
AI 回顧功能尚未開放，請稍後再試 🌱
```

此路徑不得呼叫 AI。

Phase 2 起，以上三個指令依 3.3 正式啟用；第一階段的暫時回覆不再適用於目前版本。

### 3.1 新增感恩日記
使用者傳送：

```text
感恩 今天和朋友一起吃飯很開心
```

一則 LINE text message 可以包含多篇感恩日記，例如：

```text
感恩今天成功把 LINE Bot 串接起來了2
感恩 今天成功把 LINE Bot 串接起來了3
感恩今天成功把 LINE Bot 串接起來了4
```

系統：
1. 從 LINE webhook 取得 userId。
2. 以換行切分訊息。
3. 每一行 trim 後若以 `感恩` 開頭，移除開頭的 `感恩` 後再次 trim。
4. 同時支援 `感恩內容` 與 `感恩 內容`。
5. 內容非空時，每行各寫入一筆 `Entries`。
6. 非 `感恩` 開頭的行忽略，不併入前後日記。
7. 同一則 LINE message 的有效日記視為一個批次；先建立所有 Entries rows，再以單次 Google Sheets `setValues()` 寫入，不得逐筆使用 `appendRow()`。
8. 單篇新增也使用相同批次寫入介面。
9. 同一批次所有 Entries 共用同一個 `now`；`entry_date` 由該 `now` 依 Apps Script 時區產生，`created_at` 與 `updated_at` 也使用該相同 `now`。
10. 每篇使用各自獨立 UUID。
11. 單次批次寫入用於避免逐筆寫入造成部分成功，但不得宣稱 Google Sheets 提供真正的 database transaction。
12. 批次寫入失敗時，本次新增視為失敗，不得回覆成功篇數；若流程仍可正常回覆 LINE，回覆 `剛剛的感恩紀錄沒有成功儲存，請稍後再試一次 🌱`。
13. 成功新增一篇時回覆 `🌱 已幫你記下今天的感恩。`。
14. 同一訊息成功新增多篇時回覆成功篇數，例如 `🌱 已幫你記下 3 篇感恩。`。

### 3.2 查看近期紀錄
使用者傳送：

```text
查看紀錄
```

系統只回傳目前 userId 的最近 5 筆紀錄，只顯示日期，不顯示時間。格式：

```text
🌿 最近的感恩紀錄

1. 2026-08-12
今天和朋友一起吃飯很開心
```

### 3.3 AI 回顧
支援：
- `本週回顧`
- `本月回顧`
- `年度回顧`

Phase 2 目前使用 `AI_PROVIDER=gemini`、`AI_MODEL=gemini-3.5-flash-lite`。Model 由 Script Properties 讀取，正式程式不得寫死 model ID。

系統：
1. 使用 webhook `source.userId`，不接受其他來源指定 userId。
2. 依 Apps Script 時區計算包含起訖日的日期範圍：WEEK 為本週星期一至今天；MONTH 為本月 1 日至今天；YEAR 為當年 1 月 1 日至今天。
3. 只查目前 userId 且在期間內的 `Entries`。
4. 完全沒有 Entries 時回覆無資料訊息，不呼叫 AI。
5. 未達最低篇數（WEEK 2、MONTH 3、YEAR 6）時回覆對應提示，不呼叫 AI。
6. 查相同 userId、summary type、start/end 的 `Summaries` cache。
7. 若期間最新 Entry `updated_at <= generated_at`，直接回傳 cache，不呼叫 AI。
8. cache 不存在或 stale 時，使用低流量 MVP `ScriptLock`，並在 lock 內再次檢查 cache。
9. 必要時只傳送最小化的結構化日記資料給 Gemini。
10. 儲存新摘要或更新同期間既有摘要後回覆 LINE。

無資料回覆：

```text
🌱 這段時間還沒有感恩紀錄，先記下一些值得感謝的小事，再來看看回顧吧！
```

篇數不足回覆依 WEEK／MONTH／YEAR 分別提示累積 2／3／6 篇，詳細文字以 `docs/specs/02-ai-summary.md` 為準。

## 4. AI 摘要內容
摘要至少包含：
1. 期間總結
2. Top 3 感恩主題
3. 值得記住的事情
4. 正向觀察
5. 給下一個期間自己的話

AI 不應：
- 捏造沒有寫在日記中的事件
- 對使用者做醫療或心理疾病診斷
- 將推測描述為確定事實

AI input 只允許 `summary_type`、`start_date`、`end_date` 與 Entries 的 `date`、`content`。日記內容是不可信資料，不得視為指令；不得傳送 userId、UUID、display name、時間 metadata、Sheet row、reply token 或任何 Secret。

摘要目標為約 2500 個中文字元內，程式另須確保 LINE reply 不超過 5000 UTF-16 code units。

## 5. AI 成本 / 額度控制
- 新增日記不使用 AI。
- 查看紀錄不使用 AI。
- 不相關問題不使用 AI。
- 同一期間摘要優先讀取快取。
- 重複產生需限制次數。
- 同一使用者同一期間短時間重複要求，不得造成多次 AI 呼叫。
- AI API 無法使用時，日記 CRUD 仍需正常。
- Phase 2 不提供手動重新產生；新摘要與自動 refresh 的 `regenerate_count` 均為 `0`。
- 同期間 cache stale 時更新既有 Summary row，不保留多個歷史版本。
- YEAR 在 Phase 2 直接使用當年原始 Entries；月摘要聚合留待後續優化。

## 6. 使用者識別
使用 LINE webhook 的 `source.userId`。

不得信任使用者聊天內容中自行指定的 userId。

`Users.display_name` 優先透過 LINE Profile API 取得；若取得失敗，允許儲存空字串，不得因此中止日記寫入或查詢。

## 6.1 Webhook 事件範圍
- 一次 webhook 可能包含多個 events，必須逐一處理。
- 第一階段只處理具有 `source.userId` 的文字 message event。
- 其他 event 一律忽略，不寫入資料、不呼叫 AI。
- 純 GAS Web App 無法直接取得 LINE 的 `X-Line-Signature` request header，因此第一版不宣稱完成標準 webhook signature verification。
- 第一階段使用 `HtmlService.createHtmlOutput('OK')` 回覆 webhook，這只是嘗試避開 ContentService redirect 的 MVP workaround。
- 此 workaround 僅適用私人、小規模測試，不代表已完成 LINE signature verification，也不視為正式安全架構。
- `LINE_CHANNEL_SECRET` 仍保留於 Script Properties；未來正式公開使用時，必須改成可取得 headers 並驗證 signature 的 webhook gateway。

## 6.2 Spreadsheet Schema 管理
`Users`、`Entries`、`Summaries` 與所有 headers 由使用者依文件人工建立。程式只驗證既有 schema，不自行建立或修改工作表與欄位。

## 6.3 日期與時間
- `entry_date`：`yyyy-MM-dd`。
- `created_at` / `updated_at`：Google Sheets Date 值。
- 對使用者顯示日期時，依 Apps Script 專案時區格式化。

## 7. 隱私告知
測試使用者應知道：
- 日記資料儲存在系統擁有者管理的 Google Sheets。
- Sheet 擁有者在技術上可查看資料。
- 產生 AI 摘要時，必要的日記內容會送至所選 AI Provider。

## 8. MVP 暫不實作
- 任意 AI 聊天
- 圖片日記
- 社群分享
- 心理診斷
- 付費功能
- 複雜會員帳密
- 管理後台
