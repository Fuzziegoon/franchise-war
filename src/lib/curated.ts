import { hashString } from './rng';
import type { TweetItem } from './stories';
import { num, type Article, type Moment } from './types';

/**
 * Weekly content lives in the Sheet's Articles tab, written after each batch of stats goes in.
 *   Type "Tweet": Headline = the tweet text; Subjects = team abbrs and/or a PlayerID (separated by ;);
 *                 Key facts used = "handle|Display Name|Y or N (verified)|badge|reply-to name" (last two optional).
 *   Type "Video: <kind>": see video.ts.   Any other Type = a written story.
 * A week shows up in the picker once it has at least one Published row. Week 1 is always there.
 */
export const isTweet = (a: Article) => String(a.Type).trim().toLowerCase() === 'tweet';

const published = (articles: Article[], season: number) => articles.filter((a) => a.Status === 'Published' && num(a.Season) === season);

export function releasedWeeks(articles: Article[], season: number): number[] {
  const weeks = new Set<number>([1]);
  for (const a of published(articles, season)) {
    const w = num(a.Week);
    if (w !== null && w >= 0) weeks.add(w);
  }
  return [...weeks].sort((a, b) => a - b);
}

export function curatedTweets(articles: Article[], season: number, week: number): TweetItem[] {
  const rows = published(articles, season).filter((a) => isTweet(a) && num(a.Week) === week);
  return rows.map((a, i) => {
    const [handle = 'TheLeagueLeak', name = 'The League Leak', verified = 'N', badge = '', replyTo = ''] = String(a['Key facts used'] ?? '').split('|').map((x) => x.trim());
    const subs = String(a.Subjects ?? '').split(';').map((x) => x.trim()).filter(Boolean);
    const h = hashString(String(a.ArticleID));
    const likes = 20 + (h % 900) * (verified.toUpperCase() === 'Y' ? 4 : 1);
    return {
      id: `c-${a.ArticleID}`,
      cat: 'curated',
      handle: handle.replace(/^@/, ''),
      name,
      verified: verified.toUpperCase() === 'Y',
      text: String(a.Headline),
      minsAgo: 6 + i * 11 + (h % 7),
      likes,
      rts: Math.round(likes * (0.08 + ((h >> 3) % 20) / 100)),
      replies: Math.round(likes * (0.03 + ((h >> 5) % 10) / 100)),
      teams: subs.filter((s) => /^[A-Z]{2,3}$/.test(s)),
      playerId: subs.find((s) => /^P\d+/i.test(s)),
      badge: badge || undefined,
      replyTo: replyTo || undefined,
      scope: 'league' as const,
    };
  });
}

const MOMENT_LABEL: Record<string, string> = {
  CAREER_MILESTONE: 'MILESTONE',
  STREAK: 'STREAK ALERT',
  FOUR_TD_GAME: 'FOUR-TD GAME',
  BIG_RECEIVING_DAY: 'BIG DAY',
  BIG_RUSHING_DAY: 'BIG DAY',
  BIG_PASSING_DAY: 'BIG DAY',
  BIG_SACK_DAY: 'BIG DAY',
  MULTI_INT_GAME: 'BALLHAWK',
  BIG_TACKLE_DAY: 'BIG DAY',
  BIG_FUMBLE_DAY: 'BIG DAY',
  PICK_SIX: 'PICK-SIX',
  LONG_FG: 'LEG STRENGTH',
  BIG_FG_DAY: 'KICKER WATCH',
  LONG_PUNT: 'BOOM',
  BIG_PUNT_DAY: 'PUNTER WATCH',
};

/** Milestones the Sheet logged on Moments for the week, as Twatter posts from the Milestone Watch account. */
export function momentTweets(moments: Moment[], season: number, week: number): TweetItem[] {
  return moments
    .filter((m) => num(m.Season) === season && num(m.Week) === week && m.Detail && !/^EXAMPLE/i.test(String(m.MomentID)))
    .map((m, i) => {
      const h = hashString(String(m.MomentID));
      const likes = 120 + (h % 1800);
      return {
        id: `m-${m.MomentID}`,
        cat: 'milestone',
        handle: 'MilestoneWatch',
        name: 'Milestone Watch',
        verified: true,
        text: `${MOMENT_LABEL[String(m.Type)] ?? 'MILESTONE'}: ${m.Detail}.`,
        minsAgo: 3 + i * 9 + (h % 5),
        likes,
        rts: Math.round(likes * (0.12 + ((h >> 3) % 15) / 100)),
        replies: Math.round(likes * (0.04 + ((h >> 5) % 8) / 100)),
        teams: m.Team ? [String(m.Team)] : [],
        playerId: m.PlayerID ? String(m.PlayerID) : undefined,
        badge: 'Leaker \u00b7 Milestones',
        scope: 'league' as const,
      };
    });
}
