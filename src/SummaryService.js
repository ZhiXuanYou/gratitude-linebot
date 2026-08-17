var SummaryService = (function () {
  var AI_ERROR_RESPONSE = [
    'AI 回顧目前暫時無法使用，',
    '但你的日記都已保存。',
    '晚一點再試試看 🌱'
  ].join('\n');
  var NO_ENTRIES_RESPONSE = '🌱 這段時間還沒有感恩紀錄，先記下一些值得感謝的小事，再來看看回顧吧！';
  var SETTINGS = {
    WEEK: {
      minimumEntries: 2,
      insufficientResponse: '🌱 目前的感恩紀錄還不夠產生回顧。\n本週累積 2 篇後，就可以產生 AI 回顧囉！'
    },
    MONTH: {
      minimumEntries: 3,
      insufficientResponse: '🌱 目前的感恩紀錄還不夠產生回顧。\n本月累積 3 篇後，就可以產生 AI 回顧囉！'
    },
    YEAR: {
      minimumEntries: 6,
      insufficientResponse: '🌱 目前的感恩紀錄還不夠產生回顧。\n今年累積 6 篇後，就可以產生 AI 回顧囉！'
    }
  };

  function week(userId) {
    return getSummary(userId, 'WEEK');
  }

  function month(userId) {
    return getSummary(userId, 'MONTH');
  }

  function year(userId) {
    return getSummary(userId, 'YEAR');
  }

  function getSummary(userId, summaryType) {
    var settings = SETTINGS[summaryType];
    if (!settings) {
      return AI_ERROR_RESPONSE;
    }

    try {
      return executeSummary(userId, summaryType, settings, null);
    } catch (error) {
      return AI_ERROR_RESPONSE;
    }
  }

  function executeSummary(userId, summaryType, settings, diagnostic) {
      var range = DateService.getSummaryRange(summaryType, new Date());
      setDiagnosticRange(diagnostic, summaryType, range);
      setDiagnosticStage(diagnostic, 'ENTRY_QUERY');
      SheetService.validateSchema();
      var entries = findEntries(userId, range);
      setDiagnosticEntries(diagnostic, entries.length);
      setDiagnosticStage(diagnostic, 'MINIMUM_CHECK');
      var earlyResponse = getEarlyResponse(entries, settings);
      if (earlyResponse) {
        setDiagnosticStage(diagnostic, 'COMPLETE');
        return earlyResponse;
      }

      setDiagnosticStage(diagnostic, 'CACHE_READ');
      var cachedSummary = findCachedSummary(userId, summaryType, range);
      var cacheState = getCacheState(cachedSummary, entries);
      setDiagnosticCache(diagnostic, cacheState);
      if (cacheState === 'hit') {
        setDiagnosticStage(diagnostic, 'COMPLETE');
        return LineService.protectTextLength(cachedSummary.content);
      }

      return generateWithLock(userId, summaryType, range, settings, diagnostic);
  }

  function generateWithLock(userId, summaryType, range, settings, diagnostic) {
    var lock = LockService.getScriptLock();
    try {
      setDiagnosticStage(diagnostic, 'LOCK_WAIT');
      lock.waitLock(10000);

      setDiagnosticStage(diagnostic, 'ENTRY_QUERY');
      var entries = findEntries(userId, range);
      setDiagnosticEntries(diagnostic, entries.length);
      setDiagnosticStage(diagnostic, 'MINIMUM_CHECK');
      var earlyResponse = getEarlyResponse(entries, settings);
      if (earlyResponse) {
        setDiagnosticStage(diagnostic, 'COMPLETE');
        return earlyResponse;
      }

      setDiagnosticStage(diagnostic, 'CACHE_READ');
      var cachedSummary = findCachedSummary(userId, summaryType, range);
      var cacheState = getCacheState(cachedSummary, entries);
      setDiagnosticCache(diagnostic, cacheState);
      if (cacheState === 'hit') {
        setDiagnosticStage(diagnostic, 'COMPLETE');
        return LineService.protectTextLength(cachedSummary.content);
      }

      var aiInput = {
        summary_type: summaryType,
        start_date: range.startDate,
        end_date: range.endDate,
        entries: entries.map(function (entry) {
          return {
            date: DateService.formatEntryDate(entry.entry_date),
            content: String(entry.content)
          };
        })
      };
      setDiagnosticStage(diagnostic, 'AI_REQUEST');
      var content = AiService.generateSummary(aiInput);
      setDiagnosticStage(diagnostic, 'SUMMARY_WRITE');
      saveSummary(cachedSummary, userId, summaryType, range, content);
      setDiagnosticStage(diagnostic, 'COMPLETE');
      return LineService.protectTextLength(content);
    } finally {
      if (lock.hasLock()) {
        lock.releaseLock();
      }
    }
  }

  function findEntries(userId, range) {
    return SheetService.getRows('Entries')
      .filter(function (entry) {
        var entryDate = DateService.formatEntryDate(entry.entry_date);
        return String(entry.user_id) === userId &&
          entryDate >= range.startDate &&
          entryDate <= range.endDate;
      })
      .sort(function (left, right) {
        return DateService.formatEntryDate(left.entry_date)
          .localeCompare(DateService.formatEntryDate(right.entry_date));
      });
  }

  function findCachedSummary(userId, summaryType, range) {
    var matches = SheetService.getRows('Summaries')
      .filter(function (summary) {
        return String(summary.user_id) === userId &&
          String(summary.summary_type) === summaryType &&
          DateService.formatEntryDate(summary.start_date) === range.startDate &&
          DateService.formatEntryDate(summary.end_date) === range.endDate;
      })
      .sort(function (left, right) {
        return toTimestamp(right.generated_at) - toTimestamp(left.generated_at);
      });
    return matches.length > 0 ? matches[0] : null;
  }

  function getEarlyResponse(entries, settings) {
    if (entries.length === 0) {
      return NO_ENTRIES_RESPONSE;
    }
    if (entries.length < settings.minimumEntries) {
      return settings.insufficientResponse;
    }
    return '';
  }

  function isCacheValid(summary, entries) {
    if (!summary || !String(summary.content || '').trim()) {
      return false;
    }
    var generatedAt = toTimestamp(summary.generated_at);
    if (!generatedAt) {
      return false;
    }
    var latestEntryUpdate = entries.reduce(function (latest, entry) {
      return Math.max(latest, toTimestamp(entry.updated_at));
    }, 0);
    return latestEntryUpdate <= generatedAt;
  }

  function getCacheState(summary, entries) {
    if (!summary) {
      return 'miss';
    }
    return isCacheValid(summary, entries) ? 'hit' : 'stale';
  }

  function diagnose(userId, summaryType) {
    var diagnostic = {
      stage: 'ENTRY_QUERY',
      summaryType: summaryType,
      startDate: '',
      endDate: '',
      entriesCount: 0,
      cacheState: null
    };
    var settings = SETTINGS[summaryType];
    if (!settings) {
      return buildDiagnosticFailure(diagnostic, new Error('Unsupported summary type'));
    }
    try {
      executeSummary(userId, summaryType, settings, diagnostic);
      return {
        success: true,
        stage: 'COMPLETE',
        summaryType: diagnostic.summaryType,
        startDate: diagnostic.startDate,
        endDate: diagnostic.endDate,
        entriesCount: diagnostic.entriesCount,
        cacheState: diagnostic.cacheState
      };
    } catch (error) {
      return buildDiagnosticFailure(diagnostic, error);
    }
  }

  function buildDiagnosticFailure(diagnostic, error) {
    var aiDiagnostic = error && error.geminiDiagnostic
      ? AiService.getSafeDiagnostic(error, 'unknown')
      : null;
    return {
      success: false,
      stage: diagnostic.stage,
      summaryType: diagnostic.summaryType,
      startDate: diagnostic.startDate,
      endDate: diagnostic.endDate,
      entriesCount: diagnostic.entriesCount,
      cacheState: diagnostic.cacheState,
      exceptionType: sanitizeExceptionType(error && error.name),
      message: aiDiagnostic ? aiDiagnostic.message : sanitizeExceptionMessage(error),
      geminiHttpStatus: aiDiagnostic ? aiDiagnostic.httpStatus : null,
      geminiProviderStatus: aiDiagnostic ? aiDiagnostic.providerStatus : ''
    };
  }

  function sanitizeExceptionType(value) {
    var type = String(value || 'Error');
    return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(type) ? type : 'Error';
  }

  function sanitizeExceptionMessage(error) {
    var message = String(error && error.message ? error.message : 'Summary integration failed');
    try {
      var properties = PropertiesService.getScriptProperties();
      [
        'AI_API_KEY', 'LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET', 'SPREADSHEET_ID'
      ].forEach(function (name) {
        var secret = properties.getProperty(name);
        if (secret) {
          message = message.split(secret).join('[REDACTED]');
        }
      });
    } catch (ignored) {
      // Diagnostic sanitization must not replace the original failure.
    }
    return message
      .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
      .replace(/[\r\n\t\u0000-\u001F\u007F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300) || 'Summary integration failed';
  }

  function setDiagnosticStage(diagnostic, stage) {
    if (diagnostic) {
      diagnostic.stage = stage;
    }
  }

  function setDiagnosticRange(diagnostic, summaryType, range) {
    if (diagnostic) {
      diagnostic.summaryType = summaryType;
      diagnostic.startDate = range.startDate;
      diagnostic.endDate = range.endDate;
    }
  }

  function setDiagnosticEntries(diagnostic, entriesCount) {
    if (diagnostic) {
      diagnostic.entriesCount = entriesCount;
    }
  }

  function setDiagnosticCache(diagnostic, cacheState) {
    if (diagnostic) {
      diagnostic.cacheState = cacheState;
    }
  }

  function saveSummary(existingSummary, userId, summaryType, range, content) {
    var row = {
      id: existingSummary ? existingSummary.id : Utilities.getUuid(),
      user_id: userId,
      summary_type: summaryType,
      start_date: range.startDate,
      end_date: range.endDate,
      content: content,
      generated_at: new Date(),
      regenerate_count: 0
    };

    if (existingSummary) {
      SheetService.updateRow('Summaries', existingSummary._rowNumber, row);
    } else {
      SheetService.appendRow('Summaries', row);
    }
  }

  function toTimestamp(value) {
    var date = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  return { diagnose: diagnose, month: month, week: week, year: year };
}());
