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
}

let sheets: Record<string, FakeSheet>;
let ctx: Record<string, any>;

const gamesHeader = ['GameID', 'Season', 'Week', 'Stage', 'Home', 'Away', 'Home Score', 'Away Score', 'Home Coach', 'Away Coach', 'Winner', 'Margin', '1v1?', '', 'notes…'];
const F = ['', '', '', '', '', '', '', '', '', '', 'WINNER_F', 'MARGIN_F', 'H2H_F'];

beforeEach(() => {
  sheets = {
    Games: new FakeSheet('Games', {
      v: [gamesHeader, ['EXAMPLE', 0, 0, 'Regular', 'LV', 'KC', 24, 21, 'CPU', 'CPU']],
      f: [[], F, F, F], // formulas pre-filled on rows 2-4
    }),
    Players: new FakeSheet('Players', {
      v: [['PlayerID', 'First Name', 'Last Name', 'TeamIndex', 'Team', 'Status', 'Sort score (helper)'], ['P0001', 'Joe', 'Thuney', 0, '', 'Signed', 5], ['Legend: notes under the table']],
      f: [[], ['', '', '', '', 'TEAM_F']],
    }),
    Check: new FakeSheet('Check', { v: [['Item', 'Count'], ['Current season', 3]], f: [] }),
  };
  const store = new Map<string, string>();
  ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n: string) => sheets[n] ?? null, getName: () => 'Test' }) },
    CacheService: { getScriptCache: () => ({
      get: (k: string) => store.get(k) ?? null,
      getAll: (ks: string[]) => Object.fromEntries(ks.filter((k) => store.has(k)).map((k) => [k, store.get(k)])),
      putAll: (o: Record<string, string>) => Object.entries(o).forEach(([k, v]) => store.set(k, v)),
      remove: (k: string) => store.delete(k),
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'hunter2' }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { sleep() {}, formatDate: () => '261004120000' },
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
