var CommandService = (function () {
  var HELP_TEXT = [
    '目前我是感恩日記小幫手 🌱',
    '',
    '你可以使用：',
    '・感恩 + 內容',
    '・查看紀錄',
    '・本週回顧',
    '・本月回顧',
    '・年度回顧'
  ].join('\n');
  var HELP_COMMANDS = ['幫助', '使用說明'];

  function route(userId, messageText) {
    var text = String(messageText || '').trim();
    if (text === '查看紀錄') {
      return DiaryService.getRecent(userId);
    }
    if (HELP_COMMANDS.indexOf(text) !== -1) {
      return HELP_TEXT;
    }
    if (text === '本週回顧') {
      return SummaryService.week(userId);
    }
    if (text === '本月回顧') {
      return SummaryService.month(userId);
    }
    if (text === '年度回顧') {
      return SummaryService.year(userId);
    }
    if (DiaryService.hasGratitudeLine(text)) {
      return DiaryService.addFromMessage(userId, text);
    }
    return HELP_TEXT;
  }

  return { route: route };
}());
