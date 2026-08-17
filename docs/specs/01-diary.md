# Spec 01 - Gratitude Diary

## 1. 新增日記

### Input
```text
感恩 今天和朋友一起吃飯很開心
```

亦可在同一則 LINE text message 傳送多篇：

```text
感恩今天成功把 LINE Bot 串接起來了2
感恩 今天成功把 LINE Bot 串接起來了3
感恩今天成功把 LINE Bot 串接起來了4
```

### Processing
1. 從 LINE webhook 取得 `source.userId`。
2. 以 `\n`、`\r\n` 或 `\r` 換行切分完整訊息。
3. 每一行先 trim；trim 後只要以 `感恩` 開頭，就視為一篇日記候選。
4. 同時支援 `感恩內容` 與 `感恩 內容`。
5. 移除每行開頭的 `感恩` 後再次 trim；內容非空才新增。
6. 非 `感恩` 開頭的行忽略，不併入前後日記。
7. 若 Users 無該 userId，優先透過 LINE Profile API 取得 display name 後建立使用者。
8. 若 LINE Profile API 失敗，`display_name` 使用空字串，且不得中止日記功能。
9. 同一則 LINE message 的有效內容視為一個批次。
10. 建立一個共同 `now`，所有 Entries 共用該時間。
11. `entry_date` 由共同 `now` 依 Apps Script 時區產生；`created_at`、`updated_at` 都使用相同的共同 `now`。
12. 每個有效內容各建立一筆 Entries row，且各自產生獨立 UUID。
13. 先建立完整 rows，再以單次 `setValues()` 批次寫入；不得逐筆使用 `appendRow()`。
14. 單篇新增也沿用相同批次介面。
15. 單次批次寫入用於避免逐筆寫入造成部分成功，但不得宣稱 Google Sheets 提供真正的 database transaction。

### Users
- user_id: webhook userId
- display_name: LINE Profile API 顯示名稱；取得失敗時為空字串
- created_at: Google Sheets Date 值
- is_active: `true`

### Entries
- id: UUID
- user_id: webhook userId
- entry_date: 依 Apps Script 專案時區產生的 `yyyy-MM-dd`
- content: 日記內容
- created_at: Google Sheets Date 值
- updated_at: Google Sheets Date 值

### Success Response
成功新增一篇：

```text
🌱 已幫你記下今天的感恩。
```

同一則訊息成功新增多篇時，回覆實際新增篇數，例如：

```text
🌱 已幫你記下 3 篇感恩。
```

### Empty Response
訊息包含 `感恩` 開頭行，但移除指令後沒有任何非空內容時：

```text
想記下什麼呢？
例如：感恩 今天和朋友一起吃飯很開心
```

### Write Failure Response
批次寫入失敗時，本次新增視為失敗，不得回覆成功篇數。若流程仍可正常回覆 LINE：

```text
剛剛的感恩紀錄沒有成功儲存，請稍後再試一次 🌱
```

## 2. 查看近期紀錄

### Input
```text
查看紀錄
```

### Processing
1. 使用 webhook userId。
2. 從 Entries 找同 userId。
3. 依日期 / 建立時間由新到舊。
4. 回傳最近 5 筆。
5. 日期依 Apps Script 專案時區格式化為 `yyyy-MM-dd`。
6. 只顯示日期，不顯示時間。

### Output Format
```text
🌿 最近的感恩紀錄

1. 2026-08-12
今天和朋友一起吃飯很開心
```

### No Data
```text
目前還沒有感恩紀錄。
可以傳「感恩 + 內容」開始第一篇 🌱
```

## 3. Security
- userId 一律取自 LINE webhook。
- 不接受聊天內容指定 userId。
- 查詢一定包含 userId。
- 本功能不呼叫 AI。

## 4. Spreadsheet Schema
- `Users`、`Entries`、`Summaries` 與 headers 由使用者依文件人工建立。
- 程式只驗證需要的 Sheet 與 headers，不自行建立或修改 Spreadsheet schema。
