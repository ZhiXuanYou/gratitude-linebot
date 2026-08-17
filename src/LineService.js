var LineService = (function () {
  var API_BASE_URL = 'https://api.line.me';
  var MAX_TEXT_LENGTH = 5000;

  function getAuthorizationHeaders() {
    return { Authorization: 'Bearer ' + Config.getRequiredValue('LINE_CHANNEL_ACCESS_TOKEN') };
  }

  function replyText(replyToken, text) {
    var safeText = protectTextLength(text);
    var response = UrlFetchApp.fetch(API_BASE_URL + '/v2/bot/message/reply', {
      method: 'post',
      contentType: 'application/json',
      headers: getAuthorizationHeaders(),
      payload: JSON.stringify({
        replyToken: replyToken,
        messages: [{ type: 'text', text: safeText }]
      }),
      muteHttpExceptions: true
    });
    if (!isSuccess(response)) {
      throw new Error('LINE Reply API request failed with status ' + response.getResponseCode());
    }
  }

  function getDisplayName(userId) {
    try {
      var response = UrlFetchApp.fetch(
        API_BASE_URL + '/v2/bot/profile/' + encodeURIComponent(userId),
        { method: 'get', headers: getAuthorizationHeaders(), muteHttpExceptions: true }
      );
      if (!isSuccess(response)) {
        return '';
      }
      var profile = JSON.parse(response.getContentText());
      return typeof profile.displayName === 'string' ? profile.displayName : '';
    } catch (error) {
      return '';
    }
  }

  function isSuccess(response) {
    var statusCode = response.getResponseCode();
    return statusCode >= 200 && statusCode < 300;
  }

  function protectTextLength(text) {
    var value = String(text || '');
    if (value.length <= MAX_TEXT_LENGTH) {
      return value;
    }
    var truncated = value.slice(0, MAX_TEXT_LENGTH - 3);
    if (/[\uD800-\uDBFF]$/.test(truncated)) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  return {
    getDisplayName: getDisplayName,
    protectTextLength: protectTextLength,
    replyText: replyText
  };
}());
