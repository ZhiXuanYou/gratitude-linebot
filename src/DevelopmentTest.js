/**
 * 手動執行的唯讀測試：驗證 SPREADSHEET_ID、Spreadsheet 連線與三張 Sheet schema。
 * 不由正式 webhook 流程呼叫，也不會寫入資料或修改 Spreadsheet schema。
 *
 * @return {{success: boolean, message: string, sheets: string[]}}
 */
function testSpreadsheetConnectionAndSchema() {
  Config.getRequiredValue('SPREADSHEET_ID');
  SheetService.validateSchema();

  return {
    success: true,
    message: 'Spreadsheet connection and schema validation succeeded.',
    sheets: ['Users', 'Entries', 'Summaries']
  };
}

/**
 * 手動執行的 Gemini smoke test：使用固定假資料走正式 SummaryPrompt 與 AiService。
 * 不讀取真實使用者資料、不存取 Google Sheets，也不由正式 webhook routing 呼叫。
 * 每次執行只會產生一次 Gemini API request。
 *
 * @return {{success: boolean, model: string, summary: string}}
 */
function testGeminiSummaryGeneration() {
  var model = 'unknown';
  try {
    var config = Config.getAiConfig();
    model = config.model;
    var summary = AiService.generateSummary({
      summary_type: 'WEEK',
      start_date: '2026-08-11',
      end_date: '2026-08-12',
      entries: [
        {
          date: '2026-08-11',
          content: '今天完成了一件拖很久的事情'
        },
        {
          date: '2026-08-12',
          content: '今天和朋友吃飯很開心'
        }
      ]
    });

    return {
      success: true,
      model: config.model,
      summary: summary
    };
  } catch (error) {
    var diagnostic = AiService.getSafeDiagnostic(error, model);
    var lines = ['Gemini request failed:'];
    if (diagnostic.httpStatus) {
      lines.push('HTTP ' + diagnostic.httpStatus);
    }
    if (diagnostic.providerStatus) {
      lines.push('status: ' + diagnostic.providerStatus);
    }
    lines.push('model: ' + diagnostic.model);
    lines.push('message: ' + diagnostic.message);
    throw new Error(lines.join('\n'));
  }
}

/**
 * Manually runs the production WEEK summary flow without LINE webhook/reply.
 * Set TEST_LINE_USER_ID before running. The returned object never contains the
 * user id, diary content, summary content, credentials, or provider response.
 *
 * @return {Object} safe SummaryService integration diagnostic
 */
function testWeeklySummaryIntegration() {
  var TEST_LINE_USER_ID = '';

  if (!String(TEST_LINE_USER_ID || '').trim()) {
    throw new Error('Set TEST_LINE_USER_ID before running this integration diagnostic.');
  }

  return SummaryService.diagnose(String(TEST_LINE_USER_ID).trim(), 'WEEK');
}
