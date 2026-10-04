import { describe, expect, it } from 'vitest';
import { sampleGames, samplePlayers, sampleTeams } from './sample';
import { buildIndex, generateNews, generateRecaps, generateTweets, playerTags, type LeagueData } from './stories';
import { HIGHLIGHTS, NEWS, RECAPS, TWEETS, type Who } from './storyData';

const ALLOWED: Record<Who, string[]> = {
  P: ['p', 'pf', 'pl', 'pos', 'age', 'ovr', 'inj', 'p2', 't', 'tc', 'tf', 'coach', 'qb', 'star'],
  T: ['t', 'tc', 'tf', 'coach', 'qb', 'star', 'rival', 'rivalt', 'rec'],
  C: ['t', 'tc', 'tf', 'coach', 'qb', 'star', 'rival', 'rivalt', 'rec'],
  L: ['wk', 'season'],
  G: ['w', 'l', 'wc', 'lc', 'wf', 'lf', 'ws', 'ls', 'wcoach', 'lcoach', 'margin', 'wk', 'star'],
  R: ['w', 'l', 'wc', 'lc', 'wf', 'lf', 'ws', 'ls', 'wcoach', 'lcoach', 'margin', 'wk', 'star'],
};
const slotsOf = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

const data = (week: number): LeagueData => ({ teams: sampleTeams, players: samplePlayers, games: sampleGames, season: 1, week });

describe('template bank', () => {
  it('only uses slots allowed for its subject type', () => {
    const bad: string[] = [];
    for (const t of NEWS) for (const k of [...slotsOf(t.h), ...slotsOf(t.b)]) if (!ALLOWED[t.who].includes(k)) bad.push(`${t.h} {${k}}`);
    for (const t of RECAPS) for (const k of [...slotsOf(t.h), ...slotsOf(t.b)]) if (!ALLOWED[t.who].includes(k)) bad.push(`${t.h} {${k}}`);
    for (const t of [...TWEETS, ...HIGHLIGHTS]) for (const k of slotsOf(t.t)) if (!ALLOWED[t.who].includes(k)) bad.push(`${t.t} {${k}}`);
    expect(bad).toEqual([]);
  });
  it('has a large bank including week-1 stories', () => {
    expect(NEWS.length).toBeGreaterThan(80);
    expect(TWEETS.length).toBeGreaterThan(60);
    expect(NEWS.filter((n) => !n.wk || (n.wk[0] <= 1 && n.wk[1] >= 1)).length).toBeGreaterThan(40);
  });
});

describe('generators', () => {
  it('are deterministic and fully filled in', () => {
    for (const wk of [0, 1, 2, 9]) {
      const d = data(wk);
      const a = generateNews(d, buildIndex(d));
      const b = generateNews(d, buildIndex(d));
      expect(a).toEqual(b);
      const ta = generateTweets(d, buildIndex(d));
      expect(ta).toEqual(generateTweets(d, buildIndex(d)));
      for (const n of [...a, ...generateRecaps(d, buildIndex(d))]) expect(n.headline + n.body).not.toMatch(/[{}]|undefined|NaN/);
      for (const t of ta) expect(t.text).not.toMatch(/[{}]|undefined|NaN/);
    }
  });
  it('produces unique stories and enough of them for week 1', () => {
    const d = data(1);
    const idx = buildIndex(d);
    const news = generateNews(d, idx, 8);
    expect(news.length).toBeGreaterThanOrEqual(6);
    expect(new Set(news.map((n) => n.headline)).size).toBe(news.length);
    const tw = generateTweets(d, idx, 24);
    expect(tw.length).toBeGreaterThanOrEqual(15);
    expect(new Set(tw.map((t) => t.text)).size).toBe(tw.length);
  });
  it('changes with the week', () => {
    const h = (w: number) => generateNews(data(w), buildIndex(data(w))).map((n) => n.headline).join('|');
    expect(h(1)).not.toBe(h(2));
  });
  it('only features injured players in injury stories', () => {
    const d = data(1);
    const idx = buildIndex(d);
    const byId = new Map(samplePlayers.map((p) => [p.PlayerID, p]));
    for (const n of generateNews(d, idx, 12).filter((x) => x.cat === 'Injury' && x.playerId)) {
      expect(playerTags(byId.get(n.playerId!)!).has('injured')).toBe(true);
    }
  });
  it('recaps only exist for logged games of the selected week', () => {
    const d = data(1);
    const recaps = generateRecaps(d, buildIndex(d));
    const n = sampleGames.filter((g) => Number(g.Week) === 1 && g['Home Score'] !== '').length;
    expect(recaps.length).toBeLessThanOrEqual(n);
    expect(generateRecaps(data(15), buildIndex(data(15)))).toEqual([]);
  });
});

import { composeArticle, weekNews } from './stories';
import { LEAKERS } from './storyData';

describe('articles', () => {
  it('compose full, fully-filled articles for every story of several weeks', () => {
    for (const wk of [0, 1, 2, 5, 12]) {
      const d = data(wk);
      const idx = buildIndex(d);
      for (const n of weekNews(d, idx)) {
        const a = composeArticle(n, d, idx);
        expect(a.paragraphs.length).toBeGreaterThanOrEqual(3);
        expect(a.paragraphs.join(' ') + (a.leaker?.text ?? '') + a.facts.join(' ')).not.toMatch(/[{}]|undefined|NaN/);
        expect(new Set(a.paragraphs).size).toBe(a.paragraphs.length);
      }
    }
  });
  it('gives hate mail a recipient and Leakers a badge', () => {
    let hate = 0, leak = 0;
    for (const wk of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      const d = data(wk);
      for (const t of generateTweets(d, buildIndex(d), 60)) {
        if (t.cat === 'hatemail') { hate++; expect(t.replyTo).toBeTruthy(); }
        if (LEAKERS[t.cat]) { leak++; expect(t.badge).toBeTruthy(); }
      }
    }
    expect(hate).toBeGreaterThan(0);
    expect(leak).toBeGreaterThan(0);
  });
});
