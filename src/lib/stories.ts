import { makeRng, type Rng } from './rng';
import { G_CONTEXT, G_OUTLOOK, L_CONTEXT, L_OUTLOOK, P_CONTEXT, P_OUTLOOK, T_CONTEXT, T_OUTLOOK, type Para } from './articleData';
import { computeRecords, isFinal, type TeamRecord } from './standings';
import {
  ACCOUNTS, HIGHLIGHTS, HUMANS, LEAKERS, NEWS, OUTLETS, RECAPS, REPORTERS, TWEETS,
  type Account, type NewsTpl, type TweetTpl, type Who,
} from './storyData';
import { num, playerName, type Game, type Player, type Team } from './types';

export interface LeagueData {
  teams: Team[];
  players: Player[];
  games: Game[];
  season: number;
  week: number;
}

export interface NewsItem {
  id: string;
  cat: string;
  headline: string;
  body: string;
  reporter: string;
  outlet: string;
  teams: string[];
  playerId?: string;
  coachStory: boolean;
}

export interface TweetItem {
  id: string;
  cat: string;
  handle: string;
  name: string;
  verified: boolean;
  text: string;
  minsAgo: number;
  likes: number;
  rts: number;
  replies: number;
  teams: string[];
  playerId?: string;
  /** Hate mail is addressed to a player. */
  replyTo?: string;
  /** Label for Leaker accounts. */
  badge?: string;
  /** coach = involves a human coach's team; highlight = around-the-league game result */
  scope: 'coach' | 'league' | 'highlight';
}

// ------------------------------------------------------------------ tags

const GROUP: Record<string, string> = {
  QB: 'qb', HB: 'rb', FB: 'rb', WR: 'wr', TE: 'te',
  LT: 'ol', LG: 'ol', C: 'ol', RG: 'ol', RT: 'ol',
  LE: 'dl', RE: 'dl', DT: 'dl', LOLB: 'lb', MLB: 'lb', ROLB: 'lb',
  CB: 'db', FS: 'db', SS: 'db', K: 'st', P: 'st', LS: 'st',
};

export function playerTags(p: Player): Set<string> {
  const ovr = num(p.Overall) ?? 0;
  const age = num(p.Age) ?? 26;
  const cap = num(p['Cap Salary (raw)']); // roughly $10K units, e.g. 2150 = $21.5M
  const tags = new Set<string>(['any']);
  const g = GROUP[String(p.Position)];
  if (g) tags.add(g);
  const injured = p['Injury Status'] && p['Injury Status'] !== 'Uninjured';
  tags.add(injured ? 'injured' : 'healthy');
  if (ovr >= 90) tags.add('star');
  if (ovr >= 80) tags.add('good');
  if (age <= 22) tags.add('rookie');
  if (age <= 24) tags.add('young');
  if (age >= 31) tags.add('vet');
  if (age >= 34) tags.add('ancient');
  // The Sheet has no contract years yet, so "payday" is a heuristic: good player on a small deal, or a young star.
  if ((ovr >= 80 && cap !== null && cap < 900) || (age <= 24 && ovr >= 86)) tags.add('payday');
  if (cap !== null && cap >= 1800) tags.add('paid');
  return tags;
}

const hasAll = (tags: Set<string>, need: string) =>
  need.split('+').filter(Boolean).every((t) => t === 'any' || tags.has(t));

const humanize = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

// ------------------------------------------------------------------ league index

interface TeamCtx {
  team: Team;
  abbr: string;
  roster: Player[];
  coach: string | null;
  star: Player | null;
  qb: Player | null;
  rec: TeamRecord;
  tags: Set<string>;
  avgOvr: number;
}

export interface Index {
  teams: Map<string, TeamCtx>;
  playerTags: Map<string, Set<string>>;
  coachTeams: TeamCtx[];
  skillPlayers: Map<string, Player[]>;
}

const isHuman = (c: unknown) => typeof c === 'string' && c.trim() !== '' && c.trim().toUpperCase() !== 'CPU';

export function buildIndex(d: LeagueData): Index {
  const recs = computeRecords(d.teams, d.games, d.season);
  const byTeam = new Map<string, Player[]>();
  for (const p of d.players) {
    if (p.Status !== 'Signed') continue;
    const k = String(p.Team);
    if (!byTeam.has(k)) byTeam.set(k, []);
    byTeam.get(k)!.push(p);
  }
  const playerTagMap = new Map<string, Set<string>>();
  for (const p of d.players) if (p.Status === 'Signed') playerTagMap.set(p.PlayerID, playerTags(p));

  // division leaders
  const leaders = new Map<string, string>();
  const divGroups = new Map<string, Team[]>();
  for (const t of d.teams) {
    const k = `${t.Conference} ${t.Division}`;
    divGroups.set(k, [...(divGroups.get(k) ?? []), t]);
  }
  for (const [k, ts] of divGroups) {
    const sorted = [...ts].sort((a, b) => {
      const ra = recs.get(a.Abbr)!;
      const rb = recs.get(b.Abbr)!;
      return rb.w - ra.w || ra.l - rb.l;
    });
    const top = recs.get(sorted[0].Abbr)!;
    if (top.w > 0) leaders.set(k, sorted[0].Abbr);
  }

  const teams = new Map<string, TeamCtx>();
  for (const t of d.teams) {
    const roster = (byTeam.get(t.Abbr) ?? []).sort((a, b) => (num(b.Overall) ?? 0) - (num(a.Overall) ?? 0));
    const rec = recs.get(t.Abbr)!;
    const coach = isHuman(t['Head Coach']) ? String(t['Head Coach']).trim() : null;
    const tags = new Set<string>(['any', coach ? 'coach' : 'cpu']);
    const streak = rec.streak;
    if (streak && streak[0] === 'W' && Number(streak.slice(1)) >= 2) tags.add('hot');
    if (streak && streak[0] === 'L' && Number(streak.slice(1)) >= 2) tags.add('cold');
    if (rec.w === 0 && rec.l >= 2) tags.add('winless');
    if (leaders.get(`${t.Conference} ${t.Division}`) === t.Abbr) tags.add('top');
    const ovrs = roster.slice(0, 22).map((p) => num(p.Overall) ?? 0);
    teams.set(t.Abbr, {
      team: t,
      abbr: t.Abbr,
      roster,
      coach,
      star: roster[0] ?? null,
      qb: roster.find((p) => p.Position === 'QB') ?? null,
      rec,
      tags,
      avgOvr: ovrs.length ? ovrs.reduce((a, b) => a + b, 0) / ovrs.length : 0,
    });
  }
  const coachTeams = [...teams.values()].filter((t) => t.coach);
  if (coachTeams.length > 1) for (const t of coachTeams) t.tags.add('rivalry');

  const skillPlayers = new Map<string, Player[]>();
  for (const [abbr, ps] of byTeam) {
    skillPlayers.set(
      abbr,
      ps.filter((p) => ['qb', 'rb', 'wr', 'te', 'dl', 'lb', 'db'].includes(GROUP[String(p.Position)] ?? '')).slice(0, 4),
    );
  }
  return { teams, playerTags: playerTagMap, coachTeams, skillPlayers };
}

// ------------------------------------------------------------------ slots

type Slots = Record<string, string | number>;

export const fill = (tpl: string, slots: Slots) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in slots ? String(slots[k]) : `{${k}}`));

function teamSlots(tc: TeamCtx, idx: Index): Slots {
  const t = tc.team;
  let rival = 'the rest of the league';
  let rivalt = 'the rest of the league';
  if (tc.coach) {
    const other = idx.coachTeams.find((x) => x.coach && x.abbr !== tc.abbr);
    if (other) {
      rival = other.coach!;
      rivalt = String(other.team['Nickname (click)']);
    }
  }
  return {
    t: String(t['Nickname (click)']),
    tc: String(t.City),
    tf: `${t.City} ${t['Nickname (click)']}`,
    coach: tc.coach ?? 'the head coach',
    qb: tc.qb ? playerName(tc.qb) : 'the quarterback',
    star: tc.star ? playerName(tc.star) : 'the star',
    rival,
    rivalt,
    rec: `${tc.rec.w}-${tc.rec.l}${tc.rec.t ? `-${tc.rec.t}` : ''}`,
  };
}

function playerSlots(p: Player, tc: TeamCtx, idx: Index, rng: Rng): Slots {
  const mates = tc.roster.filter((m) => m.PlayerID !== p.PlayerID && (num(m.Overall) ?? 0) >= 75);
  const mate = mates.length ? rng.pick(mates) : null;
  const inj = humanize(String(p['Injury Type'] || 'injury'));
  return {
    ...teamSlots(tc, idx),
    p: playerName(p),
    pf: String(p['First Name']),
    pl: String(p['Last Name']),
    pos: String(p.Position),
    age: num(p.Age) ?? '',
    ovr: num(p.Overall) ?? '',
    inj,
    p2: mate ? playerName(mate) : 'a teammate',
  };
}

// ------------------------------------------------------------------ subject picking

interface Used {
  templates: Set<number>;
  players: Set<string>;
  teams: Map<string, number>;
  cats: Map<string, number>;
}
const newUsed = (): Used => ({ templates: new Set(), players: new Set(), teams: new Map(), cats: new Map() });

const inWeek = (wk: [number, number] | undefined, week: number) => !wk || (week >= wk[0] && week <= wk[1]);

function pickPlayer(_d: LeagueData, idx: Index, rng: Rng, need: string, used: Used, coachOnly: boolean, teamCap: number) {
  const pool: { p: Player; tc: TeamCtx }[] = [];
  for (const tc of idx.teams.values()) {
    if (coachOnly && !tc.coach) continue;
    if ((used.teams.get(tc.abbr) ?? 0) >= teamCap) continue;
    for (const p of tc.roster) {
      if (used.players.has(p.PlayerID)) continue;
      const tags = idx.playerTags.get(p.PlayerID);
      if (!tags || !hasAll(tags, need.replace(/\+?mate/, '') || 'any')) continue;
      if (need.includes('mate') && tc.roster.filter((m) => (num(m.Overall) ?? 0) >= 75).length < 2) continue;
      pool.push({ p, tc });
    }
  }
  if (!pool.length) return null;
  return rng.weighted(pool, ({ p, tc }) => Math.pow(Math.max(1, (num(p.Overall) ?? 60) - 55), 1.6) * (tc.coach ? 3 : 1));
}

function pickTeam(idx: Index, rng: Rng, need: string, used: Used, coachOnly: boolean, teamCap: number) {
  const pool = [...idx.teams.values()].filter(
    (tc) => (!coachOnly || tc.coach) && (used.teams.get(tc.abbr) ?? 0) < teamCap && hasAll(tc.tags, need),
  );
  if (!pool.length) return null;
  return rng.weighted(pool, (tc) => (tc.coach ? 3 : 1));
}

// ------------------------------------------------------------------ news

function pickReporter(rng: Rng) {
  return { reporter: rng.pick(REPORTERS), outlet: rng.pick(OUTLETS) };
}

export function generateNews(d: LeagueData, idx: Index, count = 8): NewsItem[] {
  const rng = makeRng(`news|${d.season}|${d.week}`);
  const used = newUsed();
  const out: NewsItem[] = [];
  const catCap = Math.max(2, Math.ceil(count / 3));
  const pool = rng.shuffle(NEWS.map((t, i) => ({ t, i }))).filter(({ t }) => inWeek(t.wk, d.week));

  const attempt = (coachOnly: boolean) => {
    for (const { t, i } of pool) {
      if (out.length >= count) return;
      if (used.templates.has(i)) continue;
      if ((used.cats.get(t.cat) ?? 0) >= catCap) continue;
      const item = build(t, i, coachOnly);
      if (item) out.push(item);
    }
  };

  const build = (t: NewsTpl, i: number, coachOnly: boolean): NewsItem | null => {
    let slots: Slots | null = null;
    let teams: string[] = [];
    let playerId: string | undefined;
    let isCoach = false;
    if (t.who === 'P') {
      const pick = pickPlayer(d, idx, rng, t.need, used, coachOnly, 2);
      if (!pick) return null;
      slots = playerSlots(pick.p, pick.tc, idx, rng);
      teams = [pick.tc.abbr];
      playerId = pick.p.PlayerID;
      used.players.add(pick.p.PlayerID);
      used.teams.set(pick.tc.abbr, (used.teams.get(pick.tc.abbr) ?? 0) + 1);
      isCoach = !!pick.tc.coach;
    } else if (t.who === 'T' || t.who === 'C') {
      const pick = pickTeam(idx, rng, t.need, used, coachOnly || t.who === 'C', 2);
      if (!pick) return null;
      slots = teamSlots(pick, idx);
      teams = [pick.abbr];
      used.teams.set(pick.abbr, (used.teams.get(pick.abbr) ?? 0) + 1);
      isCoach = !!pick.coach;
    } else if (t.who === 'L') {
      if (coachOnly) return null;
      slots = { wk: d.week, season: d.season };
    }
    if (!slots) return null;
    used.templates.add(i);
    used.cats.set(t.cat, (used.cats.get(t.cat) ?? 0) + 1);
    return {
      id: `n-${d.season}-${d.week}-${i}`,
      cat: t.cat,
      headline: fill(t.h, slots),
      body: fill(t.b, slots),
      ...pickReporter(rng),
      teams,
      playerId,
      coachStory: isCoach,
    };
  };

  // first make sure the coaches' teams get a healthy share of the coverage, then fill with everyone else
  const coachShare = idx.coachTeams.length ? Math.max(2, Math.round(count * 0.4)) : 0;
  const saved = count;
  count = coachShare;
  attempt(true);
  count = saved;
  attempt(false);
  return out;
}

// ------------------------------------------------------------------ games

interface GameCtx {
  g: Game;
  w: TeamCtx;
  l: TeamCtx;
  ws: number;
  ls: number;
  tags: Set<string>;
  h2h: boolean;
  involvesCoach: boolean;
}

export function gamesForWeek(d: LeagueData, idx: Index): GameCtx[] {
  const out: GameCtx[] = [];
  for (const g of d.games) {
    if (num(g.Season) !== d.season || num(g.Week) !== d.week || !isFinal(g) || g.Stage === 'Preseason') continue;
    const hs = num(g['Home Score'])!;
    const as = num(g['Away Score'])!;
    if (hs === as) continue;
    const home = idx.teams.get(g.Home);
    const away = idx.teams.get(g.Away);
    if (!home || !away) continue;
    const [w, l, ws, ls] = hs > as ? [home, away, hs, as] : [away, home, as, hs];
    const tags = new Set<string>(['any']);
    if (ws - ls >= 17) tags.add('blowout');
    if (ws - ls <= 3) tags.add('close');
    if (ls === 0) tags.add('shutout');
    if (w.avgOvr && l.avgOvr && l.avgOvr - w.avgOvr >= 3) tags.add('upset');
    const h2h = !!(w.coach && l.coach);
    if (h2h) tags.add('h2h');
    out.push({ g, w, l, ws, ls, tags, h2h, involvesCoach: !!(w.coach || l.coach) });
  }
  return out;
}

function gameSlots(gc: GameCtx, d: LeagueData, idx: Index, rng: Rng): Slots {
  const skill = idx.skillPlayers.get(gc.w.abbr) ?? [];
  const star = skill.length ? rng.pick(skill) : gc.w.star;
  return {
    w: String(gc.w.team['Nickname (click)']),
    l: String(gc.l.team['Nickname (click)']),
    wc: String(gc.w.team.City),
    lc: String(gc.l.team.City),
    wf: `${gc.w.team.City} ${gc.w.team['Nickname (click)']}`,
    lf: `${gc.l.team.City} ${gc.l.team['Nickname (click)']}`,
    ws: gc.ws,
    ls: gc.ls,
    wcoach: gc.w.coach ?? 'CPU',
    lcoach: gc.l.coach ?? 'CPU',
    margin: gc.ws - gc.ls,
    wk: d.week,
    star: star ? playerName(star) : 'the star',
  };
}

const PRIORITY = ['shutout', 'upset', 'blowout', 'close'];

function pickGameTpl<T extends { who: Who; need: string }>(list: T[], gc: GameCtx, rng: Rng): T | null {
  const who: Who = gc.h2h ? 'R' : 'G';
  const cands = list.filter((t) => t.who === who && hasAll(gc.tags, t.need));
  if (!cands.length) return null;
  for (const tag of ['h2h+close', 'h2h+blowout', ...PRIORITY]) {
    const tagged = cands.filter((c) => c.need === tag);
    if (tagged.length && hasAll(gc.tags, tag)) return rng.pick(tagged);
  }
  const specific = cands.filter((c) => c.need !== 'any');
  return rng.pick(specific.length && rng.next() < 0.7 ? specific : cands);
}

export function generateRecaps(d: LeagueData, idx: Index, limit = 4): NewsItem[] {
  const rng = makeRng(`recap|${d.season}|${d.week}`);
  const games = gamesForWeek(d, idx).sort((a, b) => Number(b.h2h) - Number(a.h2h) || Number(b.involvesCoach) - Number(a.involvesCoach));
  const out: NewsItem[] = [];
  for (const gc of games.filter((g) => g.involvesCoach).slice(0, limit)) {
    const tpl = pickGameTpl(RECAPS, gc, rng);
    if (!tpl) continue;
    const slots = gameSlots(gc, d, idx, rng);
    out.push({
      id: `r-${gc.g.GameID}`,
      cat: 'recap',
      headline: fill(tpl.h, slots),
      body: fill(tpl.b, slots),
      ...pickReporter(rng),
      teams: [gc.w.abbr, gc.l.abbr],
      coachStory: true,
    });
  }
  return out;
}

// ------------------------------------------------------------------ twatter

const INSIDER_CATS = new Set(['contract', 'rumor']);
const FAN_CATS = new Set(['fan']);

function pickAccount(cat: string, teamAbbr: string | undefined, idx: Index, rng: Rng): Account {
  const beat = (abbr: string): Account => {
    const t = idx.teams.get(abbr)!.team;
    return { handle: `${String(t['Nickname (click)']).replace(/\W/g, '')}Beat`, name: `${t.City} Beat`, kind: 'insider', verified: true };
  };
  if (LEAKERS[cat]) return LEAKERS[cat];
  if (cat === 'hatemail' || cat === 'hottake') return rng.pick(HUMANS);
  if (INSIDER_CATS.has(cat)) return rng.pick(ACCOUNTS.filter((a) => a.kind === 'insider'));
  if (FAN_CATS.has(cat)) return rng.pick(ACCOUNTS.filter((a) => a.kind === 'fan' || a.kind === 'comic'));
  if (cat === 'highlight') return rng.pick(ACCOUNTS.filter((a) => a.kind === 'stats' || a.kind === 'insider'));
  if (teamAbbr && rng.next() < 0.6) return beat(teamAbbr);
  return rng.pick(ACCOUNTS);
}

function engagement(rng: Rng, acct: Account, boost: number) {
  const base = rng.int(8, 260) * (acct.verified ? 5 : 1) * boost;
  const likes = Math.round(base);
  return { likes, rts: Math.round(likes * (0.06 + rng.next() * 0.2)), replies: Math.round(likes * (0.03 + rng.next() * 0.1)) };
}

export function generateTweets(d: LeagueData, idx: Index, count = 24): TweetItem[] {
  const rng = makeRng(`tweets|${d.season}|${d.week}`);
  const used = newUsed();
  const out: TweetItem[] = [];
  const catCap = Math.max(3, Math.ceil(count / 3));
  const pool = rng.shuffle(TWEETS.map((t, i) => ({ t, i }))).filter(({ t }) => inWeek(t.wk, d.week));

  const make = (t: TweetTpl, i: number, coachOnly: boolean): TweetItem | null => {
    let slots: Slots | null = null;
    let teams: string[] = [];
    let playerId: string | undefined;
    let boost = 1;
    let isCoach = false;
    if (t.who === 'P') {
      const pick = pickPlayer(d, idx, rng, t.need, used, coachOnly, 3);
      if (!pick) return null;
      slots = playerSlots(pick.p, pick.tc, idx, rng);
      teams = [pick.tc.abbr];
      playerId = pick.p.PlayerID;
      boost = 1 + Math.max(0, (num(pick.p.Overall) ?? 70) - 70) / 12;
      used.players.add(pick.p.PlayerID);
      used.teams.set(pick.tc.abbr, (used.teams.get(pick.tc.abbr) ?? 0) + 1);
      isCoach = !!pick.tc.coach;
    } else if (t.who === 'T' || t.who === 'C') {
      const pick = pickTeam(idx, rng, t.need, used, coachOnly || t.who === 'C', 3);
      if (!pick) return null;
      slots = teamSlots(pick, idx);
      teams = [pick.abbr];
      used.teams.set(pick.abbr, (used.teams.get(pick.abbr) ?? 0) + 1);
      isCoach = !!pick.coach;
    } else if (t.who === 'L') {
      if (coachOnly) return null;
      slots = { wk: d.week, season: d.season };
    }
    if (!slots) return null;
    used.templates.add(i);
    used.cats.set(t.cat, (used.cats.get(t.cat) ?? 0) + 1);
    const acct = pickAccount(t.cat, teams[0], idx, rng);
    return {
      id: `t-${d.season}-${d.week}-${i}`,
      cat: t.cat,
      handle: acct.handle,
      name: acct.name,
      verified: !!acct.verified,
      text: fill(t.t, slots),
      minsAgo: 0,
      ...engagement(rng, acct, boost * (acct.kind === 'leaker' ? 3 : 1)),
      badge: acct.badge,
      replyTo: t.cat === 'hatemail' && playerId ? String(slots.p) : undefined,
      teams,
      playerId,
      scope: isCoach ? 'coach' : 'league',
    };
  };

  const run = (target: number, coachOnly: boolean) => {
    for (const { t, i } of pool) {
      if (out.length >= target) return;
      if (used.templates.has(i)) continue;
      if ((used.cats.get(t.cat) ?? 0) >= catCap) continue;
      const item = make(t, i, coachOnly);
      if (item) out.push(item);
    }
  };
  if (idx.coachTeams.length) run(Math.round(count * 0.4), true);
  run(count, false);

  // around-the-league highlights from the week's logged games
  const rng2 = makeRng(`highlights|${d.season}|${d.week}`);
  const games = gamesForWeek(d, idx);
  for (const gc of games.slice(0, 14)) {
    const tpl = pickGameTpl(HIGHLIGHTS, gc, rng2);
    if (!tpl) continue;
    const acct = pickAccount('highlight', gc.w.abbr, idx, rng2);
    out.push({
      id: `h-${gc.g.GameID}`,
      cat: 'highlight',
      handle: acct.handle,
      name: acct.name,
      verified: !!acct.verified,
      text: fill(tpl.t, gameSlots(gc, d, idx, rng2)),
      minsAgo: 0,
      ...engagement(rng2, acct, gc.h2h ? 4 : 1.5),
      teams: [gc.w.abbr, gc.l.abbr],
      scope: gc.involvesCoach ? 'coach' : 'highlight',
    });
  }

  // newest first, with highlights near the top of the timeline
  const mix = makeRng(`order|${d.season}|${d.week}`);
  const highlights = out.filter((t) => t.cat === 'highlight');
  const rest = mix.shuffle(out.filter((t) => t.cat !== 'highlight'));
  const merged: TweetItem[] = [];
  let hi = 0;
  let ri = 0;
  while (hi < highlights.length || ri < rest.length) {
    if (hi < highlights.length && (ri >= rest.length || merged.length % 3 === 0)) merged.push(highlights[hi++]);
    else merged.push(rest[ri++]);
  }
  let mins = 2;
  for (const t of merged) {
    mins += mix.int(3, 38);
    t.minsAgo = mins;
  }
  return merged;
}


// ------------------------------------------------------------------ full articles

/** The news column for a week: coach recaps first, then generated stories. Home and the article page both use this. */
export function weekNews(d: LeagueData, idx: Index): NewsItem[] {
  return [...generateRecaps(d, idx), ...generateNews(d, idx, 8)];
}

export interface Article2 {
  paragraphs: string[];
  facts: [string, string][];
  leaker: { name: string; handle: string; badge?: string; text: string } | null;
}

const ordinalRank = (i: number) => (i === 0 ? 'the best player' : i === 1 ? 'the second-best player' : i === 2 ? 'the third-best player' : `the #${i + 1} player`);

const formLine = (tc: TeamCtx) => {
  const r = tc.rec;
  const rec = `${r.w}-${r.l}${r.t ? `-${r.t}` : ''}`;
  if (r.w + r.l + r.t === 0) return `The ${tc.team['Nickname (click)']} have yet to play, so the story is still being written.`;
  const st = r.streak;
  const run = st && Number(st.slice(1)) >= 2 ? (st[0] === 'W' ? ` and have won ${st.slice(1)} straight` : ` and have dropped ${st.slice(1)} in a row`) : '';
  return `The ${tc.team['Nickname (click)']} are ${rec}${run}.`;
};

const eligible = (list: Para[], tags: Set<string>) => list.filter((p) => hasAll(tags, p.need));

function assemble(rng: Rng, tags: Set<string>, ctx: Para[], outlook: Para[], slots: Slots, ctxCount: number): string[] {
  const out: string[] = [];
  const first = ctx.find((p) => p.need === 'any');
  const pool = rng.shuffle(eligible(ctx, tags).filter((p) => p !== first));
  if (first) out.push(fill(first.t, slots));
  for (const p of pool.slice(0, ctxCount)) out.push(fill(p.t, slots));
  const o = eligible(outlook, tags);
  if (o.length) out.push(fill(rng.pick(o).t, slots));
  return out;
}

export function composeArticle(item: NewsItem, d: LeagueData, idx: Index): Article2 {
  const rng = makeRng(`article|${item.id}`);
  const wkSlots = { wk: d.week, season: d.season };
  let paragraphs: string[] = [item.body];
  const facts: [string, string][] = [];
  let leakerKind: Who = 'L';
  let tags = new Set<string>(['any']);
  let slots: Slots = { ...wkSlots };

  const player = item.playerId ? d.players.find((p) => p.PlayerID === item.playerId) : undefined;
  const tc = item.teams[0] ? idx.teams.get(item.teams[0]) : undefined;

  if (item.id.startsWith('r-')) {
    const gc = gamesForWeek(d, idx).find((g) => `r-${g.g.GameID}` === item.id);
    if (gc) {
      const rec = (t: TeamCtx) => `${t.rec.w}-${t.rec.l}${t.rec.t ? `-${t.rec.t}` : ''}`;
      slots = { ...gameSlots(gc, d, idx, rng), wrec: rec(gc.w), lrec: rec(gc.l) };
      tags = gc.tags;
      paragraphs = [item.body, ...assemble(rng, tags, G_CONTEXT, G_OUTLOOK, slots, 3)];
      facts.push(['Final', `${slots.wc} ${slots.ws}, ${slots.lc} ${slots.ls}`], ['Margin', String(slots.margin)], ['Week', String(d.week)]);
      if (gc.h2h) facts.push(['Coaches', `${gc.w.coach} def. ${gc.l.coach}`]);
    }
    leakerKind = 'L';
  } else if (player && tc) {
    const rank = Math.max(0, tc.roster.findIndex((m) => m.PlayerID === player.PlayerID));
    slots = { ...playerSlots(player, tc, idx, rng), ...wkSlots, rank: ordinalRank(rank), form: formLine(tc) };
    tags = new Set(idx.playerTags.get(player.PlayerID) ?? ['any']);
    if (tc.roster.filter((m) => m.PlayerID !== player.PlayerID && (num(m.Overall) ?? 0) >= 75).length) tags.add('mate');
    const ol = P_OUTLOOK[item.cat] ?? P_OUTLOOK.default;
    paragraphs = [item.body, ...assemble(rng, tags, P_CONTEXT, ol, slots, 3)];
    facts.push(['Player', playerName(player)], ['Position', String(player.Position)], ['Age', String(player.Age)], ['Overall', String(player.Overall)], ['Team', tc.abbr]);
    if (player['Injury Status'] && player['Injury Status'] !== 'Uninjured') facts.push(['Injury', slots.inj as string]);
    leakerKind = 'P';
  } else if (tc) {
    slots = { ...teamSlots(tc, idx), ...wkSlots, form: formLine(tc) };
    tags = tc.tags;
    paragraphs = [item.body, ...assemble(rng, tags, T_CONTEXT, T_OUTLOOK, slots, 3)];
    facts.push(['Team', `${tc.team.City} ${tc.team['Nickname (click)']}`], ['Record', slots.rec as string]);
    if (tc.coach) facts.push(['Head coach', tc.coach]);
    leakerKind = 'T';
  } else {
    const all = [...idx.teams.values()];
    const played = all.filter((t) => t.rec.w + t.rec.l > 0);
    const top = [...played].sort((a, b) => b.rec.w - a.rec.w || a.rec.l - b.rec.l)[0];
    const cold = [...played].sort((a, b) => b.rec.l - a.rec.l || a.rec.w - b.rec.w)[0];
    const best = d.players.filter((p) => p.Status === 'Signed').sort((a, b) => (num(b.Overall) ?? 0) - (num(a.Overall) ?? 0))[0];
    const bestTeam = best ? idx.teams.get(String(best.Team)) : undefined;
    const rival = idx.coachTeams.length > 1
      ? `The coach rivalry is still the series\u2019 main event, with ${idx.coachTeams[0].coach} and ${idx.coachTeams[1].coach} each wanting the last word.`
      : 'The league is wide open, and nobody has a lock on anything.';
    const r = (t?: TeamCtx) => (t ? `${t.rec.w}-${t.rec.l}` : '0-0');
    slots = {
      ...wkSlots,
      topt: top ? String(top.team['Nickname (click)']) : 'the leaders',
      topr: r(top),
      coldt: cold ? String(cold.team['Nickname (click)']) : 'the strugglers',
      coldr: r(cold),
      starp: best ? playerName(best) : 'the best player',
      startm: bestTeam ? String(bestTeam.team['Nickname (click)']) : 'league',
      starovr: best ? String(best.Overall) : '99',
      rivalry: rival,
    };
    paragraphs = [item.body, ...assemble(rng, tags, L_CONTEXT, L_OUTLOOK, slots, 2)];
    facts.push(['Season', String(d.season)], ['Week', String(d.week)]);
    leakerKind = 'L';
  }

  // closing take from a Leaker, matched to the story subject
  const picks = TWEETS.filter((t) => LEAKERS[t.cat] && t.who === leakerKind && hasAll(tags, t.need) && inWeek(t.wk, d.week));
  let leaker: Article2['leaker'] = null;
  if (picks.length) {
    const t = rng.pick(picks);
    const a = LEAKERS[t.cat];
    leaker = { name: a.name, handle: a.handle, badge: a.badge, text: fill(t.t, slots) };
  }
  return { paragraphs, facts, leaker };
}
