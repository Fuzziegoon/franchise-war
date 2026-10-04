/**
 * Franchise War API — Google Apps Script web app bound to the league Sheet.
 *
 * Reads:  GET  <url>?tabs=Teams,Players        -> { ok, meta, tabs: { Teams: [...], Players: [...] } }
 * Writes: POST <url>  body (text/plain JSON):
 *   { password, op: "verify" }
 *   { password, op: "append", tab: "Games", values: { Season: 1, Week: 1, ... } }
 *   { password, op: "update", tab: "Players", key: "P0001", values: { TeamIndex: 4 } }
 *   { password, op: "scanMilestones" }               finds streaks, career milestones and big games and logs them on Moments
 *   { password, op: "backup" }                       copies every app-editable tab into "BK <time> <Tab>" tabs
 *   { password, op: "factoryReset", confirm: "RESET", snapshot: {...} }
 *                                                     backs up first, clears rows the app added, restores Teams/Players
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
    else if (body.op === 'backup') result = backupTabs_(ss);
    else if (body.op === 'scanMilestones') result = scanMilestones_(ss);
    else if (body.op === 'autoScanStatus') result = autoScanStatus_();
    else if (body.op === 'factoryReset') {
      if (body.confirm !== 'RESET') throw new Error('Type RESET to confirm');
      result = factoryReset_(ss, body.snapshot);
    }
    else throw new Error('Unknown op: ' + body.op);
    // Edits made by the API don't fire the Sheet's change trigger, so flag stat edits for the automatic scan.
    if ((body.op === 'append' || body.op === 'update') && STAT_TABS_[body.tab] && autoScanOn_()) markSheetDirty_();
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

// ---------------------------------------------------------------- milestones

/**
 * Milestone rules. Edit the numbers here and re-run the scan; nothing else needs to change.
 *  CAREER: crossing a step this season (history tabs + this season's totals). `season`/`hist`/`game` = [tab, column].
 *  STREAKS: `min` consecutive game-log rows (ordered by season, week) meeting the test. One moment per game once it reaches min.
 *  SINGLE: one-game performances.
 */
var CAREER_RULES = [
  { key: 'REC_YDS', label: 'receiving yards', season: ['Receiving', 'Yds'], hist: ['ReceivingHistory', 'Yds'], game: ['OffenseGames', 'Rec Yds'], steps: [1000, 2500, 5000, 10000] },
  { key: 'REC_TD', label: 'receiving touchdowns', season: ['Receiving', 'TD'], hist: ['ReceivingHistory', 'TD'], game: ['OffenseGames', 'Rec TD'], steps: [10, 25, 50, 100, 200] },
  { key: 'REC', label: 'receptions', season: ['Receiving', 'Rec'], hist: ['ReceivingHistory', 'Rec'], game: ['OffenseGames', 'Rec'], steps: [100, 250, 500, 1000] },
  { key: 'RUSH_YDS', label: 'rushing yards', season: ['Rushing', 'Yds'], hist: ['RushingHistory', 'Yds'], game: ['OffenseGames', 'Rush Yds'], steps: [1000, 2500, 5000, 10000] },
  { key: 'RUSH_TD', label: 'rushing touchdowns', season: ['Rushing', 'TD'], hist: ['RushingHistory', 'TD'], game: ['OffenseGames', 'Rush TD'], steps: [10, 25, 50, 100, 200] },
  { key: 'PASS_YDS', label: 'passing yards', season: ['Passing', 'Yds'], hist: ['PassingHistory', 'Yds'], game: ['OffenseGames', 'Pass Yds'], steps: [5000, 10000, 25000, 50000] },
  { key: 'PASS_TD', label: 'passing touchdowns', season: ['Passing', 'TD'], hist: ['PassingHistory', 'TD'], game: ['OffenseGames', 'Pass TD'], steps: [25, 50, 100, 250, 500] },
  { key: 'SACKS', label: 'sacks', season: ['Defense', 'Sacks'], hist: ['DefenseHistory', 'Sacks'], game: ['DefenseGames', 'Sacks'], steps: [10, 25, 50, 100] },
  { key: 'INT', label: 'interceptions', season: ['Defense', 'INT'], hist: ['DefenseHistory', 'INT'], game: ['DefenseGames', 'INT'], steps: [5, 10, 25, 50] },
  { key: 'TACKLES', label: 'tackles', season: ['Defense', 'Tackles'], hist: ['DefenseHistory', 'Tackles'], game: ['DefenseGames', 'Tackles'], steps: [100, 250, 500, 1000] },
  { key: 'TFL', label: 'tackles for loss', season: ['Defense', 'TFL'], hist: ['DefenseHistory', 'TFL'], game: ['DefenseGames', 'TFL'], steps: [10, 25, 50, 100] },
  { key: 'FF', label: 'forced fumbles', season: ['Defense', 'Forced Fum'], hist: ['DefenseHistory', 'Forced Fum'], game: ['DefenseGames', 'Forced Fum'], steps: [5, 10, 25, 50] },
  { key: 'FR', label: 'fumble recoveries', season: ['Defense', 'Fum Rec'], hist: ['DefenseHistory', 'Fum Rec'], game: ['DefenseGames', 'Fum Rec'], steps: [5, 10, 25] },
  { key: 'PD', label: 'passes defended', season: ['Defense', 'Pass Def'], hist: ['DefenseHistory', 'Pass Def'], game: ['DefenseGames', 'Pass Def'], steps: [10, 25, 50, 100] },
  { key: 'INT_TD', label: 'interception returns for touchdowns', season: ['Defense', 'INT TD'], hist: ['DefenseHistory', 'INT TD'], game: ['DefenseGames', 'INT TD'], steps: [1, 3, 5, 10] },
  { key: 'FGM', label: 'field goals made', season: ['Kicking', 'FGM'], hist: ['KickingHistory', 'FGM'], game: ['KickingGames', 'FGM'], steps: [25, 50, 100, 250] },
  { key: 'FG50', label: 'field goals of 50+ yards', season: ['Kicking', 'FG 50+'], hist: ['KickingHistory', 'FG 50+'], game: ['KickingGames', 'FG 50+'], steps: [5, 10, 25, 50] },
  { key: 'XPM', label: 'extra points made', season: ['Kicking', 'XPM'], hist: ['KickingHistory', 'XPM'], game: ['KickingGames', 'XPM'], steps: [50, 100, 250, 500] },
  { key: 'PUNT_YDS', label: 'punting yards', season: ['Kicking', 'Punt Yds'], hist: ['KickingHistory', 'Punt Yds'], game: ['KickingGames', 'Punt Yds'], steps: [2500, 5000, 10000, 25000] },
  { key: 'PUNT_IN20', label: 'punts inside the 20', season: ['Kicking', 'Inside 20'], hist: ['KickingHistory', 'Inside 20'], game: ['KickingGames', 'Inside 20'], steps: [10, 25, 50, 100] }
];

var STREAK_RULES = [
  { key: 'REC_100', tab: 'OffenseGames', col: 'Rec Yds', atLeast: 100, min: 3, phrase: 'at least 100 receiving yards' },
  { key: 'RUSH_100', tab: 'OffenseGames', col: 'Rush Yds', atLeast: 100, min: 3, phrase: 'at least 100 rushing yards' },
  { key: 'PASS_300', tab: 'OffenseGames', col: 'Pass Yds', atLeast: 300, min: 3, phrase: 'at least 300 passing yards' },
  { key: 'REC_TD', tab: 'OffenseGames', col: 'Rec TD', atLeast: 1, min: 3, phrase: 'a receiving touchdown' },
  { key: 'RUSH_TD', tab: 'OffenseGames', col: 'Rush TD', atLeast: 1, min: 3, phrase: 'a rushing touchdown' },
  { key: 'PASS_2TD', tab: 'OffenseGames', col: 'Pass TD', atLeast: 2, min: 3, phrase: 'two or more passing touchdowns' },
  { key: 'SACK', tab: 'DefenseGames', col: 'Sacks', atLeast: 1, min: 3, phrase: 'a sack' },
  { key: 'INT', tab: 'DefenseGames', col: 'INT', atLeast: 1, min: 2, phrase: 'an interception' },
  { key: 'TFL', tab: 'DefenseGames', col: 'TFL', atLeast: 1, min: 3, phrase: 'a tackle for loss' },
  { key: 'FF', tab: 'DefenseGames', col: 'Forced Fum', atLeast: 1, min: 3, phrase: 'a forced fumble' },
  { key: 'FG_GAME', tab: 'KickingGames', col: 'FGM', atLeast: 1, min: 5, phrase: 'a made field goal' },
  { key: 'FG_PERFECT', tab: 'KickingGames', min: 3, phrase: 'perfect field-goal kicking', test: function (r) { return n_(r.FGA) > 0 && n_(r.FGM) >= n_(r.FGA); } },
  { key: 'PUNT_IN20', tab: 'KickingGames', col: 'Inside 20', atLeast: 2, min: 3, phrase: 'two or more punts inside the 20' }
];

var SINGLE_RULES = [
  { type: 'BIG_RECEIVING_DAY', tab: 'OffenseGames', col: 'Rec Yds', atLeast: 150, phrase: 'receiving yards' },
  { type: 'BIG_RUSHING_DAY', tab: 'OffenseGames', col: 'Rush Yds', atLeast: 150, phrase: 'rushing yards' },
  { type: 'BIG_PASSING_DAY', tab: 'OffenseGames', col: 'Pass Yds', atLeast: 400, phrase: 'passing yards' },
  { type: 'BIG_SACK_DAY', tab: 'DefenseGames', col: 'Sacks', atLeast: 3, phrase: 'sacks' },
  { type: 'MULTI_INT_GAME', tab: 'DefenseGames', col: 'INT', atLeast: 2, phrase: 'interceptions' },
  { type: 'BIG_TACKLE_DAY', tab: 'DefenseGames', col: 'Tackles', atLeast: 12, phrase: 'tackles' },
  { type: 'PICK_SIX', tab: 'DefenseGames', col: 'INT TD', atLeast: 1, phrase: 'interception return touchdown(s)' },
  { type: 'BIG_FUMBLE_DAY', tab: 'DefenseGames', col: 'Forced Fum', atLeast: 3, phrase: 'forced fumbles' },
  { type: 'LONG_FG', tab: 'KickingGames', col: 'FG Long', atLeast: 55, phrase: '-yard field goal', lead: true },
  { type: 'BIG_FG_DAY', tab: 'KickingGames', col: 'FGM', atLeast: 5, phrase: 'field goals' },
  { type: 'LONG_PUNT', tab: 'KickingGames', col: 'Punt Long', atLeast: 65, phrase: '-yard punt', lead: true },
  { type: 'BIG_PUNT_DAY', tab: 'KickingGames', col: 'Inside 20', atLeast: 5, phrase: 'punts inside the 20' }
];

function n_(v) { var x = Number(v); return v === '' || v === null || v === undefined || isNaN(x) ? 0 : x; }
function has_(v) { return !(v === '' || v === null || v === undefined || isNaN(Number(v))); }
function gameOrder_(a, b) { return n_(a.Season) - n_(b.Season) || n_(a.Week) - n_(b.Week); }

/**
 * Pure: finds milestones that are not in `data.existing` yet.
 * data = { season, latestWeek, names: {PlayerID: name}, teams: {PlayerID: abbr}, tabs: {TabName: [row objects]}, existing: {MomentID: true} }
 */
function detectMilestones_(data) {
  var out = [];
  var tabs = data.tabs;
  function add(m) {
    if (data.existing[m.MomentID]) return;
    data.existing[m.MomentID] = true;
    out.push(m);
  }
  function who(pid) { return data.names[pid] || pid; }
  function tm(pid) { return data.teams[pid] || ''; }

  // ----- career steps crossed this season
  CAREER_RULES.forEach(function (rule) {
    var before = {}, now = {}, seen = {};
    (tabs[rule.hist[0]] || []).forEach(function (r) {
      var pid = r.PlayerID; if (!pid) return;
      before[pid] = (before[pid] || 0) + n_(r[rule.hist[1]]);
    });
    (tabs[rule.season[0]] || []).forEach(function (r) {
      var pid = r.PlayerID; if (!pid) return;
      if (has_(r[rule.season[1]])) { now[pid] = n_(r[rule.season[1]]); seen[pid] = true; }
    });
    // players without a season-total row: add up this season's game logs instead
    (tabs[rule.game[0]] || []).forEach(function (r) {
      var pid = r.PlayerID; if (!pid || seen[pid] || n_(r.Season) !== n_(data.season)) return;
      now[pid] = (now[pid] || 0) + n_(r[rule.game[1]]);
    });
    Object.keys(now).forEach(function (pid) {
      var b = before[pid] || 0, total = b + now[pid];
      rule.steps.forEach(function (step) {
        if (b < step && total >= step) {
          add({
            MomentID: 'MS-' + pid + '-C-' + rule.key + '-' + step, Season: data.season, Week: data.latestWeek, PlayerID: pid, Team: tm(pid),
            Type: 'CAREER_MILESTONE', Detail: who(pid) + ' has reached ' + step + ' career ' + rule.label + ' (now at ' + total + ')',
            Value: step, 'Source game': ''
          });
        }
      });
    });
  });

  // ----- streaks of consecutive game-log rows
  STREAK_RULES.forEach(function (rule) {
    var byPlayer = {};
    (tabs[rule.tab] || []).forEach(function (r) {
      if (!r.PlayerID || /^EXAMPLE/i.test(String(r.PlayerID))) return;
      (byPlayer[r.PlayerID] = byPlayer[r.PlayerID] || []).push(r);
    });
    Object.keys(byPlayer).forEach(function (pid) {
      var rows = byPlayer[pid].slice().sort(gameOrder_);
      var run = [];
      rows.forEach(function (r) {
        if (rule.test ? rule.test(r) : n_(r[rule.col]) >= rule.atLeast) run.push(r); else run = [];
        if (run.length >= rule.min && n_(r.Season) === n_(data.season)) {
          var first = run[0];
          add({
            MomentID: 'MS-' + pid + '-S-' + rule.key + '-' + n_(first.Season) + 'W' + n_(first.Week) + '-' + run.length,
            Season: r.Season, Week: r.Week, PlayerID: pid, Team: r.Team || tm(pid), Type: 'STREAK',
            Detail: who(pid) + ' has posted ' + rule.phrase + ' in ' + run.length + ' straight games (Week ' + n_(first.Week) + ' to Week ' + n_(r.Week) + ')',
            Value: run.length, 'Source game': ''
          });
        }
      });
    });
  });

  // ----- single-game performances (this season only)
  SINGLE_RULES.forEach(function (rule) {
    (tabs[rule.tab] || []).forEach(function (r) {
      if (!r.PlayerID || /^EXAMPLE/i.test(String(r.PlayerID)) || n_(r.Season) !== n_(data.season)) return;
      if (n_(r[rule.col]) >= rule.atLeast) {
        add({
          MomentID: 'MS-' + r.PlayerID + '-G-' + rule.type + '-' + n_(r.Season) + 'W' + n_(r.Week), Season: r.Season, Week: r.Week,
          PlayerID: r.PlayerID, Team: r.Team || tm(r.PlayerID), Type: rule.type,
          Detail: who(r.PlayerID) + (rule.lead ? ' kicked a ' + n_(r[rule.col]) + rule.phrase : ' had ' + n_(r[rule.col]) + ' ' + rule.phrase) + (r.Opp ? ' against ' + r.Opp : '') + ' in Week ' + n_(r.Week),
          Value: n_(r[rule.col]), 'Source game': ''
        });
      }
    });
  });
  (tabs.OffenseGames || []).forEach(function (r) {
    if (!r.PlayerID || /^EXAMPLE/i.test(String(r.PlayerID)) || n_(r.Season) !== n_(data.season)) return;
    var td = n_(r['Pass TD']) + n_(r['Rush TD']) + n_(r['Rec TD']);
    if (td >= 4) {
      add({
        MomentID: 'MS-' + r.PlayerID + '-G-FOUR_TD_GAME-' + n_(r.Season) + 'W' + n_(r.Week), Season: r.Season, Week: r.Week, PlayerID: r.PlayerID,
        Team: r.Team || tm(r.PlayerID), Type: 'FOUR_TD_GAME',
        Detail: who(r.PlayerID) + ' accounted for ' + td + ' touchdowns' + (r.Opp ? ' against ' + r.Opp : '') + ' in Week ' + n_(r.Week), Value: td, 'Source game': ''
      });
    }
  });
  return out;
}

/** Reads the Sheet, finds new milestones, and logs them on the Moments tab. Safe to run as often as you like. */
function scanMilestones_(ss) {
  var meta = readMeta_(ss);
  var season = meta.currentSeason || 1;
  var need = {};
  CAREER_RULES.forEach(function (r) { need[r.hist[0]] = 1; need[r.season[0]] = 1; need[r.game[0]] = 1; });
  STREAK_RULES.concat(SINGLE_RULES).forEach(function (r) { need[r.tab] = 1; });
  var tabs = {};
  Object.keys(need).forEach(function (t) { tabs[t] = ss.getSheetByName(t) ? readTab_(ss, t) : []; });

  var names = {}, teams = {};
  readTab_(ss, 'Players').forEach(function (p) {
    names[p.PlayerID] = (String(p['First Name'] || '') + ' ' + String(p['Last Name'] || '')).trim();
    teams[p.PlayerID] = p.Team || '';
  });
  var existing = {};
  readTab_(ss, 'Moments').forEach(function (m) { existing[m.MomentID] = true; });
  var latest = 0;
  ['OffenseGames', 'DefenseGames', 'KickingGames'].forEach(function (t) {
    (tabs[t] || []).forEach(function (r) { if (n_(r.Season) === n_(season)) latest = Math.max(latest, n_(r.Week)); });
  });
  if (!latest) readTab_(ss, 'Games').forEach(function (g) { if (n_(g.Season) === n_(season)) latest = Math.max(latest, n_(g.Week)); });

  var found = detectMilestones_({ season: season, latestWeek: latest, names: names, teams: teams, tabs: tabs, existing: existing });
  found.forEach(function (m) { appendRow_(ss, 'Moments', m); });
  return { season: season, added: found.length, moments: found.map(function (m) { return m.Detail; }) };
}

/** Adds a "League tools" menu to the Sheet. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('League tools')
    .addItem('Scan for milestones now', 'scanMilestonesMenu')
    .addSeparator()
    .addItem('Turn on automatic scan', 'installAutoScanMenu')
    .addItem('Turn off automatic scan', 'removeAutoScanMenu')
    .addToUi();
}

function scanMilestonesMenu() {
  var r = scanMilestones_(SpreadsheetApp.getActiveSpreadsheet());
  clearCache_('Moments');
  SpreadsheetApp.getUi().alert(r.added ? ('Logged ' + r.added + ' new milestone(s) on the Moments tab:\n\n' + r.moments.slice(0, 15).join('\n')) : 'No new milestones.');
}

// ---------------------------------------------------------------- automatic scan

/**
 * Turn on with League tools > Turn on automatic scan (or run installAutoScan once from the editor).
 * Any edit to the Sheet sets a flag; a timer checks the flag every 5 minutes and, if stats were touched, scans once.
 * Typing a whole week of stats therefore causes one scan a few minutes later, not one per cell.
 */
function installAutoScan() {
  removeAutoScan();
  ScriptApp.newTrigger('markSheetDirty_').forSpreadsheet(SpreadsheetApp.getActive()).onChange().create();
  ScriptApp.newTrigger('autoScan_').timeBased().everyMinutes(5).create();
  return 'Automatic scan is on.';
}

function removeAutoScan() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'markSheetDirty_' || h === 'autoScan_') ScriptApp.deleteTrigger(t);
  });
  return 'Automatic scan is off.';
}

var STAT_TABS_ = { OffenseGames: 1, DefenseGames: 1, KickingGames: 1, Games: 1, Passing: 1, Rushing: 1, Receiving: 1, Defense: 1, Kicking: 1 };

function autoScanOn_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'autoScan_'; });
}

/** Cheap: runs on every change, just notes that something changed. */
function markSheetDirty_() {
  PropertiesService.getScriptProperties().setProperty('SCAN_DIRTY', String(Date.now()));
}

/** Runs every 5 minutes. Scans only if something changed since last time. Never overlaps an API write. */
function autoScan_() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SCAN_DIRTY')) return 'idle';
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return 'busy';
  try {
    props.deleteProperty('SCAN_DIRTY'); // clear first so edits during the scan trigger another pass
    var r = scanMilestones_(SpreadsheetApp.getActiveSpreadsheet());
    if (r.added) clearCache_('Moments');
    props.setProperty('SCAN_LAST', JSON.stringify({ at: new Date().toISOString(), added: r.added }));
    return r;
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function autoScanStatus_() {
  var last = PropertiesService.getScriptProperties().getProperty('SCAN_LAST');
  return { on: autoScanOn_(), last: last ? JSON.parse(last) : null };
}

function installAutoScanMenu() { SpreadsheetApp.getUi().alert(installAutoScan() + ' It checks for new stats every 5 minutes after you edit the Sheet.'); }
function removeAutoScanMenu() { SpreadsheetApp.getUi().alert(removeAutoScan()); }

// ---------------------------------------------------------------- backup + factory reset

var BACKUP_TABS = ['Teams', 'Players', 'Games', 'Articles', 'Moments', 'Transactions', 'Records', 'Awards',
  'OffenseGames', 'DefenseGames', 'KickingGames'];
var KEEP_BACKUPS = 3; // newest backup sets to keep; older "BK" tabs are removed

/** Copies each app-editable tab (values and formulas) into a new "BK <stamp> <Tab>" tab. */
function backupTabs_(ss) {
  var stamp = Utilities.formatDate(new Date(), 'UTC', 'MMdd-HHmm');
  var made = [];
  BACKUP_TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var copy = sh.copyTo(ss);
    copy.setName(('BK ' + stamp + ' ' + name).substr(0, 99));
    made.push(copy.getName());
  });
  pruneBackups_(ss);
  return { stamp: stamp, tabs: made };
}

function pruneBackups_(ss) {
  var sets = {};
  ss.getSheets().forEach(function (sh) {
    var m = /^BK (\d{4}-\d{4}) /.exec(sh.getName());
    if (m) (sets[m[1]] = sets[m[1]] || []).push(sh);
  });
  var stamps = Object.keys(sets).sort();
  while (stamps.length > KEEP_BACKUPS) {
    sets[stamps.shift()].forEach(function (sh) { ss.deleteSheet(sh); });
  }
}

/** Is this a sample row ("EXAMPLE" in one of its first columns)? Those stay. */
function isExampleRow_(row) {
  for (var i = 0; i < Math.min(row.length, 3); i++) if (/^EXAMPLE/i.test(String(row[i]))) return true;
  return false;
}

/** Clears the input cells of every row the app (or you) added to an append tab. Formula columns and EXAMPLE rows stay; returns how many cells held data. */
function clearAppendTab_(ss, tab) {
  var sh = ss.getSheetByName(tab);
  if (!sh) return 0;
  var headerRow = READ_TABS[tab] || 1;
  var lastRow = sh.getLastRow();
  if (lastRow <= headerRow) return 0;
  var cols = usableColumns_(sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getValues()[0]);
  var n = lastRow - headerRow;
  var width = cols[cols.length - 1].index + 1;
  var vals = sh.getRange(headerRow + 1, 1, n, width).getValues();
  var forms = sh.getRange(headerRow + 1, 1, n, width).getFormulas();
  var cleared = 0, runs = [], start = -1;
  for (var i = 0; i <= n; i++) {
    var keep = i === n || isExampleRow_(vals[i]);
    if (!keep) {
      if (start < 0) start = i;
      cols.forEach(function (c) { if (!forms[i][c.index] && vals[i][c.index] !== '' && vals[i][c.index] !== null) cleared++; });
    } else if (start >= 0) { runs.push([start, i - start]); start = -1; }
  }
  // Clear each input column over each run of rows. A column that has any formula in the run is a formula column: skip it.
  runs.forEach(function (run) {
    cols.forEach(function (c) {
      for (var r = run[0]; r < run[0] + run[1]; r++) if (forms[r][c.index]) return;
      sh.getRange(headerRow + 1 + run[0], c.index + 1, run[1], 1).clearContent();
    });
  });
  return cleared;
}

/** Writes the snapshot's values into the editable columns of a tab, matched on the key column. Formula columns are skipped. */
function restoreTab_(ss, tab, snap) {
  if (!snap || !snap.rows) return 0;
  var sh = ss.getSheetByName(tab);
  if (!sh) return 0;
  var headerRow = READ_TABS[tab] || 1;
  var lastRow = sh.getLastRow();
  var cols = usableColumns_(sh.getRange(headerRow, 1, 1, sh.getLastColumn()).getValues()[0]);
  var byName = {};
  cols.forEach(function (c) { byName[c.name] = c.index; });
  var spec = UPDATE_TABS[tab];
  if (!spec || spec.key !== snap.key) throw new Error('Snapshot does not match ' + tab);
  var n = lastRow - headerRow;
  var width = cols[cols.length - 1].index + 1;
  var keys = sh.getRange(headerRow + 1, byName[snap.key] + 1, n, 1).getValues();
  var forms = sh.getRange(headerRow + 1, 1, n, width).getFormulas();
  var rowOf = {};
  for (var i = 0; i < n; i++) rowOf[String(keys[i][0])] = i;
  var restored = 0;
  snap.cols.forEach(function (colName, ci) {
    if (spec.cols.indexOf(colName) < 0) return; // only columns the app is allowed to edit
    if (!(colName in byName)) return;
    var idx = byName[colName];
    var out = [], any = false;
    var cur = sh.getRange(headerRow + 1, idx + 1, n, 1).getValues();
    for (var r = 0; r < n; r++) out.push([cur[r][0]]);
    snap.rows.forEach(function (row) {
      var at = rowOf[String(row[0])];
      if (at === undefined || forms[at][idx]) return; // unknown row or formula cell: leave alone
      out[at][0] = row[ci + 1];
      any = true;
    });
    if (any) { sh.getRange(headerRow + 1, idx + 1, n, 1).setValues(out); restored++; }
  });
  return restored;
}

/**
 * Back up, clear everything the league added (games, stories, tweets, videos, moves, stats rows), then put
 * Teams and Players back to the snapshot. The Sheet's own formulas, headers and EXAMPLE rows are never touched.
 */
function factoryReset_(ss, snapshot) {
  if (!snapshot || !snapshot.Teams || !snapshot.Players) throw new Error('Missing factory snapshot');
  var backup = backupTabs_(ss);
  var cleared = {};
  Object.keys(APPEND_TABS).forEach(function (tab) { cleared[tab] = clearAppendTab_(ss, tab); });
  var restored = { Teams: restoreTab_(ss, 'Teams', snapshot.Teams), Players: restoreTab_(ss, 'Players', snapshot.Players) };
  Object.keys(READ_TABS).forEach(function (t) { CacheService.getScriptCache().remove('tab:' + t + ':n'); });
  return { backup: backup, clearedRows: cleared, restoredColumns: restored, snapshotTakenAt: snapshot.takenAt || null };
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
