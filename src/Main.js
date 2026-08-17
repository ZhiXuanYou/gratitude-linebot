function doPost(e) {
  var payload = parseWebhookPayload(e);
  var events = Array.isArray(payload.events) ? payload.events : [];

  Config.validatePhaseOne();

  events.forEach(function (event) {
    if (!isSupportedTextMessageEvent(event)) {
      return;
    }
    var responseText = CommandService.route(event.source.userId, event.message.text);
    LineService.replyText(event.replyToken, responseText);
  });

  return HtmlService.createHtmlOutput('OK');
}

function parseWebhookPayload(e) {
  if (!e || !e.postData || typeof e.postData.contents !== 'string') {
    throw new Error('Invalid webhook payload');
  }
  return JSON.parse(e.postData.contents);
}

function isSupportedTextMessageEvent(event) {
  return Boolean(
    event &&
    event.type === 'message' &&
    event.message &&
    event.message.type === 'text' &&
    event.source &&
    typeof event.source.userId === 'string' &&
    event.source.userId &&
    typeof event.replyToken === 'string' &&
    event.replyToken
  );
}
