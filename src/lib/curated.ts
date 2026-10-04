import { hashString } from './rng';
import type { TweetItem } from './stories';
import { num, type Article } from './types';

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
