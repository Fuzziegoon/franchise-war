import { num, type Game, type Team } from './types';

export interface TeamRecord {
  abbr: string;
  w: number;
  l: number;
  t: number;
  pf: number;
  pa: number;
  divW: number;
  divL: number;
  divT: number;
  streak: string;
}

export const pct = (r: { w: number; l: number; t: number }) => {
  const gp = r.w + r.l + r.t;
  return gp === 0 ? 0 : (r.w + r.t / 2) / gp;
};

export const recordText = (r: { w: number; l: number; t: number }) =>
  r.t ? `${r.w}-${r.l}-${r.t}` : `${r.w}-${r.l}`;

/** A game counts once both scores are in. */
export const isFinal = (g: Game) => num(g['Home Score']) !== null && num(g['Away Score']) !== null;

/** Regular-season records for one season, computed from Games (the Sheet's Record column is not trusted). */
export function computeRecords(teams: Team[], games: Game[], season: number): Map<string, TeamRecord> {
  const div = new Map(teams.map((t) => [t.Abbr, `${t.Conference} ${t.Division}`]));
  const recs = new Map<string, TeamRecord>(
    teams.map((t) => [t.Abbr, { abbr: t.Abbr, w: 0, l: 0, t: 0, pf: 0, pa: 0, divW: 0, divL: 0, divT: 0, streak: '' }]),
  );
  const ordered = games
    .filter((g) => num(g.Season) === season && g.Stage === 'Regular' && isFinal(g))
    .sort((a, b) => (num(a.Week) ?? 0) - (num(b.Week) ?? 0));

  for (const g of ordered) {
    const hs = num(g['Home Score'])!;
    const as = num(g['Away Score'])!;
    const sameDiv = div.get(g.Home) !== undefined && div.get(g.Home) === div.get(g.Away);
    const apply = (abbr: string, pf: number, pa: number) => {
      const r = recs.get(abbr);
      if (!r) return;
      r.pf += pf;
      r.pa += pa;
      const res = pf > pa ? 'W' : pf < pa ? 'L' : 'T';
      if (res === 'W') r.w++;
      else if (res === 'L') r.l++;
      else r.t++;
      if (sameDiv) {
        if (res === 'W') r.divW++;
        else if (res === 'L') r.divL++;
        else r.divT++;
      }
      const [last, n] = r.streak ? [r.streak[0], Number(r.streak.slice(1))] : ['', 0];
      r.streak = last === res ? `${res}${n + 1}` : `${res}1`;
    };
    apply(g.Home, hs, as);
    apply(g.Away, as, hs);
  }
  return recs;
}

export const sortRecords = (a: TeamRecord, b: TeamRecord) =>
  pct(b) - pct(a) || pct({ w: b.divW, l: b.divL, t: b.divT }) - pct({ w: a.divW, l: a.divL, t: a.divT }) ||
  (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf;

export interface DivisionTable {
  conference: string;
  division: string;
  rows: (TeamRecord & { team: Team })[];
}

export function divisionTables(teams: Team[], recs: Map<string, TeamRecord>): DivisionTable[] {
  const groups = new Map<string, DivisionTable>();
  for (const t of teams) {
    const key = `${t.Conference} ${t.Division}`;
    if (!groups.has(key)) groups.set(key, { conference: t.Conference, division: t.Division, rows: [] });
    groups.get(key)!.rows.push({ ...recs.get(t.Abbr)!, team: t });
  }
  for (const g of groups.values()) g.rows.sort(sortRecords);
  return [...groups.values()];
}

export interface CoachRecord {
  coach: string;
  w: number;
  l: number;
  t: number;
  h2hW: number;
  h2hL: number;
  h2hT: number;
  playoffW: number;
  playoffL: number;
  titles: number;
}

const isCoach = (c: unknown) => typeof c === 'string' && c.trim() !== '' && c.trim().toUpperCase() !== 'CPU';

/** Career records for every human coach across all seasons. Includes playoffs separately. */
export function coachRecords(games: Game[]): CoachRecord[] {
  const map = new Map<string, CoachRecord>();
  const get = (c: string) => {
    if (!map.has(c)) map.set(c, { coach: c, w: 0, l: 0, t: 0, h2hW: 0, h2hL: 0, h2hT: 0, playoffW: 0, playoffL: 0, titles: 0 });
    return map.get(c)!;
  };
  for (const g of games) {
    if (!isFinal(g) || g.Stage === 'Preseason') continue;
    const hs = num(g['Home Score'])!;
    const as = num(g['Away Score'])!;
    const hc = String(g['Home Coach'] ?? '').trim();
    const ac = String(g['Away Coach'] ?? '').trim();
    const h2h = isCoach(hc) && isCoach(ac);
    const playoff = g.Stage !== 'Regular';
    const side = (coach: string, pf: number, pa: number) => {
      if (!isCoach(coach)) return;
      const r = get(coach);
      const res = pf > pa ? 'W' : pf < pa ? 'L' : 'T';
      if (playoff) {
        if (res === 'W') r.playoffW++;
        if (res === 'L') r.playoffL++;
        if (res === 'W' && g.Stage === 'SuperBowl') r.titles++;
      } else {
        if (res === 'W') r.w++;
        else if (res === 'L') r.l++;
        else r.t++;
      }
      if (h2h) {
        if (res === 'W') r.h2hW++;
        else if (res === 'L') r.h2hL++;
        else r.h2hT++;
      }
    };
    side(hc, hs, as);
    side(ac, as, hs);
  }
  return [...map.values()].sort((a, b) => b.titles - a.titles || pct(b) - pct(a));
}
