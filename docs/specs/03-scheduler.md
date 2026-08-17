# Spec 03 - Scheduled Summaries

## Scope
此功能放在手動摘要功能穩定後。

## Weekly
1. 取得 is_active = true Users。
2. 逐一取得該使用者本週資料。
3. 若 Entries 不足則略過。
4. 若已有摘要則不重產。
5. 必要時產生摘要。
6. 使用 LINE Push Message 傳給 userId。

## Monthly
同上，日期區間為當月。

## Yearly
年度摘要優先使用月摘要。

## Safety
- 單一使用者失敗不得中止整批。
- AI 無法使用時不影響日記功能。
- 不在 Log 寫完整日記。
- 避免重複建立 Trigger。
- 避免同期間重複推播。
