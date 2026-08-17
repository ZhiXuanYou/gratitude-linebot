var Config = (function () {
  var REQUIRED_PHASE_ONE_KEYS = [
    'SPREADSHEET_ID',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET'
  ];

  function getRequiredValue(key) {
    var value = PropertiesService.getScriptProperties().getProperty(key);
    if (!value) {
      throw new Error('Missing Script Property: ' + key);
    }
    return value;
  }

  function validatePhaseOne() {
    REQUIRED_PHASE_ONE_KEYS.forEach(function (key) {
      getRequiredValue(key);
    });
  }

  function getAiConfig() {
    var provider = getRequiredValue('AI_PROVIDER');
    var model = getRequiredValue('AI_MODEL');
    if (provider !== 'gemini') {
      throw new Error('Unsupported AI Provider');
    }
    return {
      apiKey: getRequiredValue('AI_API_KEY'),
      provider: provider,
      model: model
    };
  }

  return {
    getAiConfig: getAiConfig,
    getRequiredValue: getRequiredValue,
    validatePhaseOne: validatePhaseOne
  };
}());
