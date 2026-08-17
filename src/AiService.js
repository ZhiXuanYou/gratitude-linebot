var AiService = (function () {
  var API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var MAX_DIAGNOSTIC_MESSAGE_LENGTH = 300;
  var REQUIRED_HEADINGS = [
    '🌿 這段時間的感恩回顧',
    '【整體回顧】',
    '【常出現的感恩主題】',
    '【值得記住的事情】',
    '【正向觀察】',
    '【給下一段時間的自己】'
  ];

  function generateSummary(input) {
    var config = Config.getAiConfig();
    var response;

    try {
      response = UrlFetchApp.fetch(
        API_BASE_URL + encodeURIComponent(config.model) + ':generateContent',
        {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-goog-api-key': config.apiKey },
          payload: JSON.stringify(SummaryPrompt.buildRequest(input)),
          muteHttpExceptions: true
        }
      );
    } catch (error) {
      throw createDiagnosticError({
        model: config.model,
        message: error && error.message ? error.message : 'Network request failed'
      }, config.apiKey);
    }

    var statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      var providerError = parseProviderError(response.getContentText());
      throw createDiagnosticError({
        httpStatus: statusCode,
        providerStatus: providerError.status,
        model: config.model,
        message: providerError.message || 'Gemini request failed'
      }, config.apiKey);
    }

    var data;
    try {
      data = JSON.parse(response.getContentText());
    } catch (error) {
      throw createDiagnosticError({
        httpStatus: statusCode,
        model: config.model,
        message: 'Gemini returned invalid JSON'
      }, config.apiKey);
    }

    var text = extractText(data).trim();
    if (!text || !hasRequiredHeadings(text)) {
      throw createDiagnosticError({
        httpStatus: statusCode,
        model: config.model,
        message: 'Gemini returned an empty or unexpected response schema'
      }, config.apiKey);
    }
    return LineService.protectTextLength(text);
  }

  function extractText(data) {
    if (!data || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      return '';
    }
    var content = data.candidates[0].content;
    if (!content || !Array.isArray(content.parts)) {
      return '';
    }
    return content.parts.reduce(function (text, part) {
      return text + (part && typeof part.text === 'string' ? part.text : '');
    }, '');
  }

  function hasRequiredHeadings(text) {
    return REQUIRED_HEADINGS.every(function (heading) {
      return text.indexOf(heading) !== -1;
    });
  }

  function parseProviderError(responseText) {
    try {
      var data = JSON.parse(responseText);
      var error = data && data.error;
      return {
        status: error && typeof error.status === 'string' ? error.status : '',
        message: error && typeof error.message === 'string' ? error.message : ''
      };
    } catch (error) {
      return { status: '', message: '' };
    }
  }

  function createDiagnosticError(diagnostic, apiKey) {
    var error = new Error('Gemini request failed');
    error.geminiDiagnostic = {
      httpStatus: normalizeHttpStatus(diagnostic.httpStatus),
      providerStatus: sanitizeStatus(diagnostic.providerStatus),
      model: sanitizeModel(diagnostic.model),
      message: sanitizeMessage(diagnostic.message, apiKey)
    };
    return error;
  }

  function getSafeDiagnostic(error, fallbackModel) {
    var diagnostic = error && error.geminiDiagnostic ? error.geminiDiagnostic : {};
    return {
      httpStatus: normalizeHttpStatus(diagnostic.httpStatus),
      providerStatus: sanitizeStatus(diagnostic.providerStatus),
      model: sanitizeModel(diagnostic.model || fallbackModel),
      message: sanitizeMessage(diagnostic.message || 'Gemini request failed')
    };
  }

  function normalizeHttpStatus(value) {
    var status = Number(value);
    return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
  }

  function sanitizeStatus(value) {
    var status = String(value || '').trim();
    return /^[A-Z][A-Z0-9_]{0,63}$/.test(status) ? status : '';
  }

  function sanitizeModel(value) {
    var model = String(value || '').trim();
    return /^[a-zA-Z0-9._-]{1,100}$/.test(model) ? model : 'unknown';
  }

  function sanitizeMessage(value, apiKey) {
    var message = String(value || 'Gemini request failed');
    if (apiKey) {
      message = message.split(String(apiKey)).join('[REDACTED]');
    }
    message = message
      .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
      .replace(/(x-goog-api-key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1: [REDACTED]')
      .replace(/[\r\n\t\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!message) {
      message = 'Gemini request failed';
    }
    return message.slice(0, MAX_DIAGNOSTIC_MESSAGE_LENGTH);
  }

  return {
    generateSummary: generateSummary,
    getSafeDiagnostic: getSafeDiagnostic
  };
}());
