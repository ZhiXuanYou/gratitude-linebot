var SheetService = (function () {
  var SCHEMAS = {
    Users: ['user_id', 'display_name', 'created_at', 'is_active'],
    Entries: ['id', 'user_id', 'entry_date', 'content', 'created_at', 'updated_at'],
    Summaries: [
      'id', 'user_id', 'summary_type', 'start_date', 'end_date',
      'content', 'generated_at', 'regenerate_count'
    ]
  };

  function getSpreadsheet() {
    return SpreadsheetApp.openById(Config.getRequiredValue('SPREADSHEET_ID'));
  }

  function getSheet(name) {
    var expectedHeaders = SCHEMAS[name];
    if (!expectedHeaders) {
      throw new Error('Unknown spreadsheet schema: ' + name);
    }
    var sheet = getSpreadsheet().getSheetByName(name);
    if (!sheet) {
      throw new Error('Missing required sheet: ' + name);
    }
    validateHeaders(sheet, expectedHeaders);
    return sheet;
  }

  function validateHeaders(sheet, expectedHeaders) {
    if (sheet.getLastColumn() !== expectedHeaders.length || sheet.getLastRow() < 1) {
      throw new Error('Invalid headers for sheet: ' + sheet.getName());
    }
    var actualHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length)
      .getDisplayValues()[0]
      .map(function (header) { return String(header).trim(); });
    var isValid = expectedHeaders.every(function (header, index) {
      return actualHeaders[index] === header;
    });
    if (!isValid) {
      throw new Error('Invalid headers for sheet: ' + sheet.getName());
    }
  }

  function validateSchema() {
    Object.keys(SCHEMAS).forEach(function (name) { getSheet(name); });
  }

  function getRows(name) {
    var sheet = getSheet(name);
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }
    var headers = SCHEMAS[name];
    var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    return values.map(function (row, rowIndex) {
      var item = { _rowNumber: rowIndex + 2 };
      headers.forEach(function (header, columnIndex) { item[header] = row[columnIndex]; });
      return item;
    });
  }

  function appendRow(name, row) {
    var sheet = getSheet(name);
    var values = SCHEMAS[name].map(function (header) {
      return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    });
    sheet.appendRow(values);
  }

  function appendRows(name, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    var sheet = getSheet(name);
    var headers = SCHEMAS[name];
    var values = rows.map(function (row) {
      return headers.map(function (header) {
        return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
      });
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
  }

  function updateRow(name, rowNumber, row) {
    var sheet = getSheet(name);
    var headers = SCHEMAS[name];
    if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      throw new Error('Invalid row number for sheet: ' + name);
    }
    var values = headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(row, header) ? row[header] : '';
    });
    sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
  }

  return {
    appendRow: appendRow,
    appendRows: appendRows,
    getRows: getRows,
    getSheet: getSheet,
    updateRow: updateRow,
    validateSchema: validateSchema
  };
}());
