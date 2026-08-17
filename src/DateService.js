var DateService = (function () {
  var DATE_FORMAT = 'yyyy-MM-dd';

  function formatDate(date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), DATE_FORMAT);
  }

  function formatEntryDate(value) {
    if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
      return formatDate(value);
    }
    var text = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }
    var parsedDate = new Date(value);
    return isNaN(parsedDate.getTime()) ? text : formatDate(parsedDate);
  }

  function getSummaryRange(summaryType, now) {
    var today = formatDate(now || new Date());
    var parts = today.split('-').map(Number);
    var year = parts[0];
    var month = parts[1];
    var day = parts[2];
    var startDate;

    if (summaryType === 'WEEK') {
      var calendarDate = new Date(Date.UTC(year, month - 1, day));
      var mondayOffset = (calendarDate.getUTCDay() + 6) % 7;
      calendarDate.setUTCDate(calendarDate.getUTCDate() - mondayOffset);
      startDate = formatUtcCalendarDate(calendarDate);
    } else if (summaryType === 'MONTH') {
      startDate = formatCalendarParts(year, month, 1);
    } else if (summaryType === 'YEAR') {
      startDate = formatCalendarParts(year, 1, 1);
    } else {
      throw new Error('Unsupported summary type: ' + summaryType);
    }
    return { startDate: startDate, endDate: today };
  }

  function formatUtcCalendarDate(date) {
    return formatCalendarParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  function formatCalendarParts(year, month, day) {
    return [year, padTwoDigits(month), padTwoDigits(day)].join('-');
  }

  function padTwoDigits(value) {
    return value < 10 ? '0' + value : String(value);
  }

  return {
    formatDate: formatDate,
    formatEntryDate: formatEntryDate,
    getSummaryRange: getSummaryRange
  };
}());
