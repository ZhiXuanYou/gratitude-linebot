var DiaryService = (function () {
  var RECENT_LIMIT = 5;
  var WRITE_FAILURE_RESPONSE = '剛剛的感恩紀錄沒有成功儲存，請稍後再試一次 🌱';

  function hasGratitudeLine(messageText) {
    return splitLines(messageText).some(function (line) {
      return line.trim().indexOf('感恩') === 0;
    });
  }

  function addFromMessage(userId, messageText) {
    var contents = extractContents(messageText);
    if (contents.length === 0) {
      return '想記下什麼呢？\n例如：感恩 今天和朋友一起吃飯很開心';
    }

    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      SheetService.validateSchema();
      UserService.findOrCreate(userId);
      var now = new Date();
      var entryDate = DateService.formatDate(now);
      var rows = contents.map(function (content) {
        return {
          id: Utilities.getUuid(),
          user_id: userId,
          entry_date: entryDate,
          content: content,
          created_at: now,
          updated_at: now
        };
      });
      SheetService.appendRows('Entries', rows);
    } catch (error) {
      return WRITE_FAILURE_RESPONSE;
    } finally {
      lock.releaseLock();
    }
    if (contents.length === 1) {
      return '🌱 已幫你記下今天的感恩。';
    }
    return '🌱 已幫你記下 ' + contents.length + ' 篇感恩。';
  }

  function extractContents(messageText) {
    return splitLines(messageText).reduce(function (contents, line) {
      var trimmedLine = line.trim();
      if (trimmedLine.indexOf('感恩') !== 0) {
        return contents;
      }
      var content = trimmedLine.substring(2).trim();
      if (content) {
        contents.push(content);
      }
      return contents;
    }, []);
  }

  function splitLines(messageText) {
    return String(messageText || '').split(/\r\n|\n|\r/);
  }

  function getRecent(userId) {
    SheetService.validateSchema();
    var entries = SheetService.getRows('Entries')
      .filter(function (entry) { return String(entry.user_id) === userId; })
      .sort(compareEntriesNewestFirst)
      .slice(0, RECENT_LIMIT);

    if (entries.length === 0) {
      return '目前還沒有感恩紀錄。\n可以傳「感恩 + 內容」開始第一篇 🌱';
    }

    var lines = ['🌿 最近的感恩紀錄', ''];
    entries.forEach(function (entry, index) {
      lines.push((index + 1) + '. ' + DateService.formatEntryDate(entry.entry_date));
      lines.push(String(entry.content));
      if (index < entries.length - 1) {
        lines.push('');
      }
    });
    return lines.join('\n');
  }

  function compareEntriesNewestFirst(left, right) {
    var leftDate = DateService.formatEntryDate(left.entry_date);
    var rightDate = DateService.formatEntryDate(right.entry_date);
    if (leftDate !== rightDate) {
      return leftDate < rightDate ? 1 : -1;
    }
    return toTimestamp(right.created_at) - toTimestamp(left.created_at);
  }

  function toTimestamp(value) {
    var date = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(value);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  return {
    addFromMessage: addFromMessage,
    getRecent: getRecent,
    hasGratitudeLine: hasGratitudeLine
  };
}());
