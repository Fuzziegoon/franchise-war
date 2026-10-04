// Runs Code.gs in a sandbox against an in-memory fake of SpreadsheetApp.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

type Grid = { v: unknown[][]; f: string[][] };

class FakeRange {
  constructor(private g: Grid, private r: number, private c: number, private nr: number, private nc: number) {}
  private map<T>(fn: (r: number, c: number) => T): T[][] {
    return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => fn(this.r + i - 1, this.c + j - 1)));
  }
  getValues() { return this.map((r, c) => (this.g.f[r]?.[c] ? `=calc` : (this.g.v[r]?.[c] ?? ''))); }
  getFormulas() { return this.map((r, c) => this.g.f[r]?.[c] ?? ''); }
  getFormulasR1C1() { return this.getFormulas(); }
  setValue(x: unknown) { (this.g.v[this.r - 1] ??= [])[this.c - 1] = x; return this; }
  setValues(a: unknown[][]) { a.forEach((row, i) => row.forEach((x, j) => { (this.g.v[this.r - 1 + i] ??= [])[this.c - 1 + j] = x; })); return this; }
  clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) { (this.g.v[this.r - 1 + i] ??= [])[this.c - 1 + j] = ''; } return this; }
  setFormulaR1C1(x: string) { (this.g.f[this.r - 1] ??= [])[this.c - 1] = x; return this; }
}
class FakeSheet {
  constructor(public name: string, public g: Grid) {}
  getLastRow() {
    let last = 0;
    const n = Math.max(this.g.v.length, this.g.f.length);
    for (let r = 0; r < n; r++) if ((this.g.v[r] ?? []).some((x) => x !== '' && x != null) || (this.g.f[r] ?? []).some(Boolean)) last = r + 1;
    return last;
  }
  getLastColumn() { return Math.max(...this.g.v.map((r) => r?.length ?? 0), ...this.g.f.map((r) => r?.length ?? 0)); }
  getRange(r: number, c: number, nr = 1, nc = 1) { return new FakeRange(this.g, r, c, nr, nc); }
  getName() { return this.name; }
  setName(n: string) { this.name = n; return this; }
  copyTo() { const c = new FakeSheet('Copy of ' + this.name, { v: this.g.v.map((r) => [...(r ?? [])]), f: this.g.f.map((r) => [...(r ?? [])]) }); extra.push(c); return c; }
}

let sheets: Record<string, FakeSheet>;
let extra: FakeSheet[];
let ctx: Record<string, any>;
let props: Record<string, string> = {};
let triggers: any[] = [];

const gamesHeader = ['GameID', 'Season', 'Week', 'Stage', 'Home', 'Away', 'Home Score', 'Away Score', 'Home Coach', 'Away Coach', 'Winner', 'Margin', '1v1?', '', 'notes…'];
const F = ['', '', '', '', '', '', '', '', '', '', 'WINNER_F', 'MARGIN_F', 'H2H_F'];

beforeEach(() => {
  extra = [];
  sheets = {
    Games: new FakeSheet('Games', {
      v: [gamesHeader, ['EXAMPLE', 0, 0, 'Regular', 'LV', 'KC', 24, 21, 'CPU', 'CPU']],
      f: [[], F, F, F], // formulas pre-filled on rows 2-4
    }),
    Players: new FakeSheet('Players', {
      v: [['PlayerID', 'First Name', 'Last Name', 'TeamIndex', 'Team', 'Status', 'Sort score (helper)'], ['P0001', 'Joe', 'Thuney', 0, '', 'Signed', 5], ['Legend: notes under the table']],
      f: [[], ['', '', '', '', 'TEAM_F']],
    }),
    Articles: new FakeSheet('Articles', {
      v: [['ArticleID', 'Season', 'Week', 'Type', 'Headline', ''], ['EXAMPLE', 0, 0, 'Feature', 'Example headline'], ['A1', 1, 2, 'Tweet', 'hello'], ['A2', 1, 3, 'Recap', 'bye']],
      f: [],
    }),
    Check: new FakeSheet('Check', { v: [['Item', 'Count'], ['Current season', 3]], f: [] }),
  };
  const store = new Map<string, string>();
  ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({
      getSheetByName: (n: string) => sheets[n] ?? null,
      getName: () => 'Test',
      getSheets: () => [...Object.values(sheets), ...extra],
      deleteSheet: (sh: FakeSheet) => { extra = extra.filter((x) => x !== sh); },
    }) },
    CacheService: { getScriptCache: () => ({
      get: (k: string) => store.get(k) ?? null,
      getAll: (ks: string[]) => Object.fromEntries(ks.filter((k) => store.has(k)).map((k) => [k, store.get(k)])),
      putAll: (o: Record<string, string>) => Object.entries(o).forEach(([k, v]) => store.set(k, v)),
      remove: (k: string) => store.delete(k),
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => (k === 'ADMIN_PASSWORD' ? 'hunter2' : props[k] ?? null), setProperty: (k: string, v: string) => { props[k] = v; }, deleteProperty: (k: string) => { delete props[k]; } }) },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger: (t: any) => { triggers.splice(triggers.indexOf(t), 1); } },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    Utilities: { sleep() {}, formatDate: (_d: unknown, _z: string, f: string) => (f === 'MMdd-HHmm' ? '1004-1830' : '261004120000') },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s: string) => ({ setMimeType: () => JSON.parse(s) }) },
    Logger: { log() {} },
    Math, JSON, String, Number, Object, Date, Error,
  };
  runInNewContext(readFileSync(new URL('./Code.gs', import.meta.url), 'utf8'), ctx);
});

const post = (body: object) => ctx.doPost({ postData: { contents: JSON.stringify(body) } });

describe('doGet', () => {
  it('skips EXAMPLE rows, helper and notes columns, and reports the season', () => {
    const r = ctx.doGet({ parameter: { tabs: 'Games,Players' } });
    expect(r.ok).toBe(true);
    expect(r.meta.currentSeason).toBe(3);
    expect(r.tabs.Games).toEqual([]);
    expect(Object.keys(r.tabs.Players[0])).not.toContain('Sort score (helper)');
    expect(Object.keys(r.tabs.Players[0])).toHaveLength(6);
    expect(r.tabs.Players).toHaveLength(1); // legend line skipped
  });
  it('rejects unknown tabs', () => {
    expect(ctx.doGet({ parameter: { tabs: 'Secrets' } }).ok).toBe(false);
  });
});

describe('doPost', () => {
  const game = { GameID: 'S3W1-DET-CHI', Season: 3, Week: 1, Stage: 'Regular', Home: 'CHI', Away: 'DET', 'Home Score': 27, 'Away Score': 24 };

  it('refuses a wrong password', () => {
    expect(post({ password: 'nope', op: 'verify' })).toEqual({ ok: false, error: 'Wrong league password' });
    expect(post({ password: 'hunter2', op: 'verify' }).ok).toBe(true);
  });

  it('appends into the first blank row and keeps pre-filled formulas', () => {
    const r = post({ password: 'hunter2', op: 'append', tab: 'Games', values: game });
    expect(r.ok).toBe(true);
    expect(r.result.row).toBe(3);
    expect(sheets.Games.g.v[2][0]).toBe('S3W1-DET-CHI');
    expect(sheets.Games.g.f[2][10]).toBe('WINNER_F');
  });

  it('carries formulas down past the pre-filled rows', () => {
    for (let i = 0; i < 4; i++) post({ password: 'hunter2', op: 'append', tab: 'Games', values: { ...game, GameID: `G${i}` } });
    expect(sheets.Games.g.v[5][0]).toBe('G3'); // row 6
    expect(sheets.Games.g.f[5][11]).toBe('MARGIN_F');
    const read = ctx.doGet({ parameter: { tabs: 'Games' } });
    expect(read.tabs.Games.map((x: any) => x.GameID)).toEqual(['G0', 'G1', 'G2', 'G3']);
  });

  it('never writes formula columns or unknown columns', () => {
    const r = post({ password: 'hunter2', op: 'append', tab: 'Games', values: { ...game, Winner: 'CHI' } });
    expect(r.result.skippedFormulaColumns).toEqual(['Winner']);
    expect(post({ password: 'hunter2', op: 'append', tab: 'Games', values: { Bogus: 1 } }).error).toMatch(/Unknown column/);
    expect(post({ password: 'hunter2', op: 'append', tab: 'Players', values: {} }).error).toMatch(/cannot be added/);
  });

  it('updates whitelisted Player columns only', () => {
    const ok = post({ password: 'hunter2', op: 'update', tab: 'Players', key: 'P0001', values: { TeamIndex: 4, Status: 'Signed' } });
    expect(ok.ok).toBe(true);
    expect(sheets.Players.g.v[1][3]).toBe(4);
    expect(post({ password: 'hunter2', op: 'update', tab: 'Players', key: 'P0001', values: { 'Last Name': 'X' } }).error).toMatch(/not editable/);
    expect(post({ password: 'hunter2', op: 'update', tab: 'Players', key: 'P9999', values: { Status: 'Signed' } }).error).toMatch(/not found/);
  });
});


describe('backup and factory reset', () => {
  const snap = { takenAt: '2026-10-04', Teams: { key: 'Abbr', cols: ['Head Coach'], rows: [] }, Players: { key: 'PlayerID', cols: ['TeamIndex', 'Status'], rows: [['P0001', 0, 'Signed']] } };

  it('makes backup tabs and keeps only the newest sets', () => {
    const r = post({ password: 'hunter2', op: 'backup' });
    expect(r.ok).toBe(true);
    expect(r.result.tabs).toContain('BK 1004-1830 Games');
    expect(extra.every((x) => x.name.startsWith('BK '))).toBe(true);
  });

  it('refuses without the password or the word RESET', () => {
    expect(post({ password: 'nope', op: 'factoryReset', confirm: 'RESET', snapshot: snap }).ok).toBe(false);
    expect(post({ password: 'hunter2', op: 'factoryReset', snapshot: snap }).error).toMatch(/RESET/);
    expect(post({ password: 'hunter2', op: 'factoryReset', confirm: 'RESET' }).error).toMatch(/snapshot/);
  });

  it('clears added rows, keeps formulas, headers and EXAMPLE rows, and restores Players', () => {
    post({ password: 'hunter2', op: 'append', tab: 'Games', values: { Season: 3, Week: 1, Stage: 'Regular', Home: 'CHI', Away: 'DET', 'Home Score': 27, 'Away Score': 24 } });
    post({ password: 'hunter2', op: 'update', tab: 'Players', key: 'P0001', values: { TeamIndex: 9, Status: 'FreeAgent' } });
    const r = post({ password: 'hunter2', op: 'factoryReset', confirm: 'RESET', snapshot: snap });
    expect(r.error).toBeUndefined();
    expect(r.result.backup.tabs.length).toBeGreaterThan(0);
    // games gone, formulas and the EXAMPLE row still there
    expect(ctx.doGet({ parameter: { tabs: 'Games' } }).tabs.Games).toEqual([]);
    expect(sheets.Games.g.v[0][0]).toBe('GameID');
    expect(sheets.Games.g.v[1][0]).toBe('EXAMPLE');
    expect(sheets.Games.g.f[2][10]).toBe('WINNER_F');
    // articles cleared except header + example
    expect(sheets.Articles.g.v[0][0]).toBe('ArticleID');
    expect(sheets.Articles.g.v[1][0]).toBe('EXAMPLE');
    expect(ctx.doGet({ parameter: { tabs: 'Articles' } }).tabs.Articles).toEqual([]);
    // player put back; formula column untouched
    expect(sheets.Players.g.v[1][3]).toBe(0);
    expect(sheets.Players.g.v[1][5]).toBe('Signed');
    expect(sheets.Players.g.f[1][4]).toBe('TEAM_F');
  });
});

describe('milestone detection', () => {
  const run = (tabs: Record<string, any[]>, existing: Record<string, boolean> = {}, season = 2) =>
    JSON.parse(JSON.stringify(ctx.detectMilestones_({ season, latestWeek: 5, names: { P1: 'Ja\'Marr Chase', P2: 'Josh Allen' }, teams: { P1: 'CIN', P2: 'BUF' }, tabs, existing })));
  const g = (week: number, yds: number, extra: Record<string, number> = {}) => ({ Season: 2, Week: week, PlayerID: 'P1', Team: 'CIN', Opp: 'PIT', 'Rec Yds': yds, ...extra });

  it('flags three straight 100-yard receiving games, and each extra game', () => {
    let m = run({ OffenseGames: [g(1, 120), g(2, 101), g(3, 99), g(4, 110)] }).filter((x: any) => x.Type === 'STREAK');
    expect(m).toHaveLength(0);
    m = run({ OffenseGames: [g(1, 120), g(2, 101), g(3, 100)] }).filter((x: any) => x.Type === 'STREAK');
    expect(m).toHaveLength(1);
    expect(m[0].Detail).toContain('3 straight games');
    expect(m[0].Week).toBe(3);
    m = run({ OffenseGames: [g(1, 120), g(2, 101), g(3, 100), g(4, 130)] }).filter((x: any) => x.Type === 'STREAK');
    expect(m.map((x: any) => x.Value)).toEqual([3, 4]);
  });

  it('breaks a streak when a game falls short and starts a new one', () => {
    const rows = [g(1, 100), g(2, 100), g(3, 50), g(4, 100), g(5, 100), g(6, 100)];
    const m = run({ OffenseGames: rows }).filter((x: any) => x.Type === 'STREAK');
    expect(m).toHaveLength(1);
    expect(m[0].Detail).toContain('Week 4 to Week 6');
  });

  it('flags a career milestone only in the season it is crossed', () => {
    // 20 TDs in history + 6 this season = crosses 25 now
    let m = run({ ReceivingHistory: [{ Season: 1, PlayerID: 'P1', TD: 20 }], Receiving: [{ PlayerID: 'P1', TD: 6 }] }).filter((x: any) => x.Type === 'CAREER_MILESTONE');
    expect(m.map((x: any) => x.Value)).toEqual([25]);
    expect(m[0].Detail).toContain('25 career receiving touchdowns');
    // already past 25 before this season: nothing new at 25
    m = run({ ReceivingHistory: [{ Season: 1, PlayerID: 'P1', TD: 30 }], Receiving: [{ PlayerID: 'P1', TD: 6 }] }).filter((x: any) => x.Type === 'CAREER_MILESTONE');
    expect(m).toHaveLength(0);
  });

  it('adds up game logs when a player has no season-total row yet', () => {
    const m = run({ OffenseGames: [g(1, 0, { 'Rec TD': 2 }), g(2, 0, { 'Rec TD': 2 })], ReceivingHistory: [{ Season: 1, PlayerID: 'P1', TD: 8 }] }).filter((x: any) => x.Type === 'CAREER_MILESTONE');
    expect(m.map((x: any) => x.Value)).toEqual([10]);
  });

  it('never repeats a moment that is already logged', () => {
    const rows = { OffenseGames: [g(1, 100), g(2, 100), g(3, 100)] };
    const first = run(rows);
    const again = run(rows, Object.fromEntries(first.map((m: any) => [m.MomentID, true])));
    expect(first.length).toBeGreaterThan(0);
    expect(again).toHaveLength(0);
  });

  it('flags big single games and 4-touchdown games', () => {
    const m = run({ OffenseGames: [g(1, 160), { Season: 2, Week: 2, PlayerID: 'P2', Team: 'BUF', 'Pass TD': 3, 'Rush TD': 1 }] });
    expect(m.map((x: any) => x.Type).sort()).toEqual(['BIG_RECEIVING_DAY', 'FOUR_TD_GAME']);
  });

  it('ignores EXAMPLE rows and other seasons', () => {
    const m = run({ OffenseGames: [{ Season: 0, Week: 0, PlayerID: 'EXAMPLE', 'Rec Yds': 999 }, { ...g(1, 200), Season: 1 }] });
    expect(m).toHaveLength(0);
  });
});

describe('kicker, punter and defense milestones', () => {
  const run = (tabs: Record<string, any[]>) =>
    JSON.parse(JSON.stringify(ctx.detectMilestones_({ season: 2, latestWeek: 5, names: { K1: 'Evan McPherson', D1: 'Myles Garrett' }, teams: { K1: 'CIN', D1: 'CLE' }, tabs, existing: {} })));
  const k = (week: number, extra: Record<string, number>) => ({ Season: 2, Week: week, PlayerID: 'K1', Team: 'CIN', Opp: 'PIT', ...extra });
  const d = (week: number, extra: Record<string, number>) => ({ Season: 2, Week: week, PlayerID: 'D1', Team: 'CLE', Opp: 'PIT', ...extra });

  it('flags a 55+ yard field goal and a 5-FG day', () => {
    const m = run({ KickingGames: [k(1, { FGM: 5, FGA: 5, 'FG Long': 57 })] });
    expect(m.map((x: any) => x.Type)).toEqual(expect.arrayContaining(['LONG_FG', 'BIG_FG_DAY']));
    expect(m.find((x: any) => x.Type === 'LONG_FG').Detail).toContain('57-yard field goal');
  });

  it('flags a long punt and a punter day of 5 inside the 20', () => {
    const m = run({ KickingGames: [k(1, { 'Punt Long': 68, 'Inside 20': 5 })] });
    expect(m.map((x: any) => x.Type)).toEqual(expect.arrayContaining(['LONG_PUNT', 'BIG_PUNT_DAY']));
  });

  it('flags 5 straight games with a made field goal and 3 straight perfect games', () => {
    const rows = [1, 2, 3, 4, 5].map((w) => k(w, { FGM: 2, FGA: 2 }));
    const m = run({ KickingGames: rows }).filter((x: any) => x.Type === 'STREAK');
    expect(m.some((x: any) => x.Detail.includes('a made field goal'))).toBe(true);
    expect(m.some((x: any) => x.Detail.includes('perfect field-goal kicking'))).toBe(true);
  });

  it('flags career 50+ yard FGs, tackles for loss and passes defended', () => {
    const m = run({
      KickingHistory: [{ Season: 1, PlayerID: 'K1', 'FG 50+': 4 }], Kicking: [{ PlayerID: 'K1', 'FG 50+': 2 }],
      DefenseHistory: [{ Season: 1, PlayerID: 'D1', TFL: 8, 'Pass Def': 9 }], Defense: [{ PlayerID: 'D1', TFL: 3, 'Pass Def': 2 }],
    }).filter((x: any) => x.Type === 'CAREER_MILESTONE');
    expect(m.map((x: any) => x.Detail).join('|')).toMatch(/5 career field goals of 50\+ yards/);
    expect(m.map((x: any) => x.Detail).join('|')).toMatch(/10 career tackles for loss/);
    expect(m.map((x: any) => x.Detail).join('|')).toMatch(/10 career passes defended/);
  });

  it('flags a pick-six, a 12-tackle day, and 3 straight games with a TFL', () => {
    const m = run({ DefenseGames: [d(1, { Tackles: 12, TFL: 1, 'INT TD': 1 }), d(2, { TFL: 1 }), d(3, { TFL: 2 })] });
    const types = m.map((x: any) => x.Type);
    expect(types).toEqual(expect.arrayContaining(['PICK_SIX', 'BIG_TACKLE_DAY', 'STREAK']));
  });
});

describe('automatic scan', () => {
  it('installs and removes the triggers', () => {
    ctx.ScriptApp.newTrigger = (fn: string) => {
      const t: any = { getHandlerFunction: () => fn };
      const b: any = { forSpreadsheet: () => b, onChange: () => b, timeBased: () => b, everyMinutes: () => b, create: () => { triggers.push(t); return t; } };
      return b;
    };
    ctx.SpreadsheetApp.getActive = () => ({});
    ctx.installAutoScan();
    expect(triggers.map((t) => t.getHandlerFunction()).sort()).toEqual(['autoScan_', 'markSheetDirty_']);
    ctx.removeAutoScan();
    expect(triggers).toHaveLength(0);
  });

  it('does nothing when no stats changed, and scans once when they did', () => {
    props = {};
    expect(ctx.autoScan_()).toBe('idle');
    let scans = 0;
    ctx.scanMilestones_ = () => { scans++; return { added: 0 }; };
    ctx.markSheetDirty_();
    expect(props.SCAN_DIRTY).toBeTruthy();
    ctx.autoScan_();
    expect(props.SCAN_DIRTY).toBeUndefined();
    expect(scans).toBe(1);
    expect(JSON.parse(props.SCAN_LAST).added).toBeGreaterThanOrEqual(0);
  });
});
