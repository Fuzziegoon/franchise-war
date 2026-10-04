/**
 * Franchise War API — Google Apps Script web app bound to the league Sheet.
 *
 * Reads:  GET  <url>?tabs=Teams,Players        -> { ok, meta, tabs: { Teams: [...], Players: [...] } }
 * Writes: POST <url>  body (text/plain JSON):
 *   { password, op: "verify" }
 *   { password, op: "append", tab: "Games", values: { Season: 1, Week: 1, ... } }
 *   { password, op: "update", tab: "Players", key: "P0001", values: { TeamIndex: 4 } }
 *
 * Setup: Extensions > Apps Script in the league Sheet, paste this file, then
 * Project Settings > Script properties > add ADMIN_PASSWORD. Deploy as a web app
 * (Execute as: Me, Who has access: Anyone). See README for the full walkthrough.
 *
 * Rules the writer follows so the Sheet's design stays intact:
 *  - Never overwrites a formula cell. Formula columns are copied down when a new row needs them.
 *  - Appends fill the first row whose first column is blank (the Sheet pre-fills formula rows).
 *  - Only whitelisted tabs and columns can be written.
 */

var CACHE_SECONDS = 120;
var CACHE_CHUNK = 90000; // CacheService values max out at 100KB

/** Tabs the app can read, and the row their headers sit on. */
var READ_TABS = {
  Teams: 1, Players: 1, Games: 1, Articles: 1, Moments: 1, Records: 1, Awards: 1,
  TeamHistory: 1, Transactions: 1,
  Passing: 4, Rushing: 4, Receiving: 4, Defense: 4, Kicking: 4,
  OffenseGames: 1, DefenseGames: 1, KickingGames: 1,
  PassingHistory: 1, RushingHistory: 1, ReceivingHistory: 1, DefenseHistory: 1, KickingHistory: 1
};

/** Tabs that accept new rows. */
var APPEND_TABS = {
  Games: 'G', Transactions: 'T', Articles: 'A', Moments: 'M', Records: null, Awards: null,
  OffenseGames: null, DefenseGames: null, KickingGames: null
};

/** Tabs that accept edits to existing rows: key column + editable columns. */
var UPDATE_TABS = {
  Players: { key: 'PlayerID', cols: ['TeamIndex', 'Status', 'Jersey', 'Injury Status', 'Injury Type', 'Injury Severity', 'Overall', 'Age'] },
  Teams: { key: 'Abbr', cols: ['Head Coach', 'Record', 'Super Bowl Wins'] },
  Articles: { key: 'ArticleID', cols: ['Headline', 'Summary', 'Key facts used', 'Status', 'Published', 'Subjects', 'Type'] },
  Games: { key: 'GameID', cols: ['Home Score', 'Away Score', 'Home Coach', 'Away Coach', 'Stage'] }
};

// ---------------------------------------------------------------- HTTP entry points

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var wanted = String((e && e.parameter && e.parameter.tabs) || 'Teams').split(',');
    var out = {};
    wanted.forEach(function (name) {
      name = name.trim();
      if (!READ_TABS[name]) throw new Error('Unknown tab: ' + name);
      out[name] = cachedRead_(ss, name);
    });
    return json_({ ok: true, meta: readMeta_(ss), tabs: out });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!checkPassword_(body.password)) {
      Utilities.sleep(1500); // slows down guessing
      return json_({ ok: false, error: 'Wrong league password' });
    }
    if (body.op === 'verify') return json_({ ok: true });

    lock.waitLock(20000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var result;
    if (body.op === 'append') result = appendRow_(ss, body.tab, body.values || {});
    else if (body.op === 'update') result = updateRow_(ss, body.tab, body.key, body.values || {});
    else throw new Error('Unknown op: ' + body.op);
    clearCache_(body.tab);
    return json_({ ok: true, result: result });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

// ---------------------------------------------------------------- reading

function readTab_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Missing tab: ' + name);
  var headerRow = READ_TABS[name];
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow <= headerRow) return [];
  var headers = sh.getRange(headerRow, 1, 1, lastCol).getValues()[0];
  var cols = usableColumns_(headers);
  var data = sh.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();
  var rows = [];
  for (var i = 0; i < data.length; i++) {
    var first = data[i][0];
    if (first === '' || first === null) continue;
    if (/^EXAMPLE/i.test(String(first))) continue;
    var obj = {}, filled = 0;
    for (var c = 0; c < cols.length; c++) {
      var v = data[i][cols[c].index];
      if (v instanceof Date) v = v.toISOString();
      obj[cols[c].name] = v;
      if (c > 0 && v !== '' && v !== null) filled++;
    }
    if (filled === 0 && cols.length > 1) continue; // legend/notes line under the table
    rows.push(obj);
  }
  return rows;
}

/** Drops blank headers (they start the legend/notes area) and helper columns. */
function usableColumns_(headers) {
  var cols = [];
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').trim();
    if (!h) break; // everything after the first blank header is notes
    if (/\(helper\)/i.test(h)) continue;
    cols.push({ name: h, index: i });
  }
  return cols;
}

function readMeta_(ss) {
  var meta = { currentSeason: null, sheetName: ss.getName(), readAt: new Date().toISOString() };
  var check = ss.getSheetByName('Check');
  if (check) {
    var vals = check.getRange(1, 1, Math.min(check.getLastRow(), 60), 2).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === 'Current season') meta.currentSeason = Number(vals[i][1]) || null;
    }
  }
  return meta;
}

function cachedRead_(ss, name) {
  var cache = CacheService.getScriptCache();
  var countStr = cache.get('tab:' + name + ':n');
  if (countStr) {
    var keys = [];
    for (var i = 0; i < Number(countStr); i++) keys.push('tab:' + name + ':' + i);
    var parts = cache.getAll(keys);
    if (Object.keys(parts).length === keys.length) {
      return JSON.parse(keys.map(function (k) { return parts[k]; }).join(''));
    }
  }
  var rows = readTab_(ss, name);
  var str = JSON.stringify(rows);
  var put = {};
  var n = Math.ceil(str.length / CACHE_CHUNK) || 1;
  for (var j = 0; j < n; j++) put['tab:' + name + ':' + j] = str.substr(j * CACHE_CHUNK, CACHE_CHUNK);
  put['tab:' + name + ':n'] = String(n);
  try { cache.putAll(put, CACHE_SECONDS); } catch (ignore) {}
  return rows;
}

function clearCache_(tab) {
  var cache = CacheService.getScriptCache();
  // Writes to Players/Teams/Games change derived views, so clear everything that is cheap to clear.
  Object.keys(READ_TABS).forEach(function (t) { cache.remove('tab:' + t + ':n'); });
  if (tab) cache.remove('tab:' + tab + ':n');
}

// ---------------------------------------------------------------- writing

function appendRow_(ss, tab, values) {
  if (!(tab in APPEND_TABS)) throw new Error('Rows cannot be added to ' + tab);
  var sh = ss.getSheetByName(tab);
  var headerRow = READ_TABS[tab] || 1;
  var lastCol = sh.getLastColumn();
  var cols = usableColumns_(sh.getRange(headerRow, 1, 1, lastCol).getValues()[0]);
  var byName = {};
  cols.forEach(function (c) { byName[c.name] = c.index; });
  Object.keys(values).forEach(function (k) {
    if (!(k in byName)) throw new Error('Unknown column on ' + tab + ': ' + k);
  });

  // First column auto-ID (GameID, TxnID, ArticleID, MomentID) when the caller left it out.
  var idCol = cols[0].name;
  var prefix = APPEND_TABS[tab];
  if (prefix && /ID$/.test(idCol) && !values[idCol]) {
    values[idCol] = prefix + Utilities.formatDate(new Date(), 'UTC', 'yyMMddHHmmss') +
      Math.floor(Math.random() * 90 + 10);
  }

  // Find the first row whose first column is blank.
  var lastRow = Math.max(sh.getLastRow(), headerRow);
  var colA = lastRow > headerRow ? sh.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getValues() : [];
  var target = headerRow + 1 + colA.length;
  for (var i = 0; i < colA.length; i++) {
    if (colA[i][0] === '' || colA[i][0] === null) { target = headerRow + 1 + i; break; }
  }

  var width = cols[cols.length - 1].index + 1;
  var rowRange = sh.getRange(target, 1, 1, width);
  var formulas = rowRange.getFormulas()[0];
  var skipped = [];
  Object.keys(values).forEach(function (k) {
    var ci = byName[k];
    if (formulas[ci]) { skipped.push(k); return; }
    sh.getRange(target, ci + 1).setValue(values[k]);
  });

  // Carry formula columns down if this row is past the pre-filled ones.
  if (target > headerRow + 1) {
    var above = sh.getRange(target - 1, 1, 1, width).getFormulasR1C1()[0];
    for (var c = 0; c < width; c++) {
      if (above[c] && !formulas[c]) sh.getRange(target, c + 1).setFormulaR1C1(above[c]);
    }
  }
  return { tab: tab, row: target, id: values[idCol], skippedFormulaColumns: skipped };
}

function updateRow_(ss, tab, key, values) {
  var spec = UPDATE_TABS[tab];
  if (!spec) throw new Error(tab + ' cannot be edited from the app');
  if (!key) throw new Error('Missing key');
  var sh = ss.getSheetByName(tab);
  var headerRow = READ_TABS[tab] || 1;
  var lastCol = sh.getLastColumn();
  var cols = usableColumns_(sh.getRange(headerRow, 1, 1, lastCol).getValues()[0]);
  var byName = {};
  cols.forEach(function (c) { byName[c.name] = c.index; });
  Object.keys(values).forEach(function (k) {
    if (spec.cols.indexOf(k) < 0) throw new Error('Column ' + k + ' on ' + tab + ' is not editable from the app');
    if (!(k in byName)) throw new Error('Unknown column on ' + tab + ': ' + k);
  });
  var keyIdx = byName[spec.key];
  var lastRow = sh.getLastRow();
  var keysCol = sh.getRange(headerRow + 1, keyIdx + 1, lastRow - headerRow, 1).getValues();
  var target = -1;
  for (var i = 0; i < keysCol.length; i++) {
    if (String(keysCol[i][0]) === String(key)) { target = headerRow + 1 + i; break; }
  }
  if (target < 0) throw new Error(spec.key + ' not found on ' + tab + ': ' + key);
  var formulas = sh.getRange(target, 1, 1, cols[cols.length - 1].index + 1).getFormulas()[0];
  var changed = [];
  Object.keys(values).forEach(function (k) {
    if (formulas[byName[k]]) throw new Error(k + ' on ' + tab + ' is a formula column');
    sh.getRange(target, byName[k] + 1).setValue(values[k]);
    changed.push(k);
  });
  return { tab: tab, row: target, key: key, changed: changed };
}

// ---------------------------------------------------------------- helpers

function checkPassword_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!expected) throw new Error('ADMIN_PASSWORD is not set in Script properties');
  if (typeof given !== 'string' || given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to confirm the script can read every tab. */
function selfTest() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(READ_TABS).forEach(function (t) {
    Logger.log(t + ': ' + readTab_(ss, t).length + ' rows');
  });
  Logger.log(JSON.stringify(readMeta_(ss)));
}
