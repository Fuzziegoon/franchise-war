import { describe, expect, it } from 'vitest';
import { curatedTweets, isTweet, releasedWeeks } from './curated';
import type { Article } from './types';

const a = (o: Partial<Article>): Article => ({ ArticleID: 'A1', Season: 1, Week: 2, Type: 'Recap', Subjects: '', Headline: 'h', Summary: 's', 'Key facts used': '', Status: 'Published', Published: '2026-10-04', ...o }) as Article;

describe('released weeks', () => {
  it('always has week 1 and adds a week only once it has a published row', () => {
    expect(releasedWeeks([], 1)).toEqual([1]);
    expect(releasedWeeks([a({ Week: 2 }), a({ Week: 3, Status: 'Draft' }), a({ Week: 4, Season: 2 })], 1)).toEqual([1, 2]);
    expect(releasedWeeks([a({ Week: 3 }), a({ Week: 2 })], 1)).toEqual([1, 2, 3]);
  });
});

describe('curated tweets', () => {
  it('parses handle, name, verified, badge and reply-to from the Sheet row', () => {
    const rows = [
      a({ ArticleID: 'T1', Type: 'Tweet', Headline: 'Big win.', Subjects: 'CIN; P0123', 'Key facts used': '@Lou|League Insider Lou|Y|Leaker|Joe Burrow' }),
      a({ ArticleID: 'T2', Type: 'Recap' }),
      a({ ArticleID: 'T3', Type: 'tweet', Week: 3 }),
    ];
    expect(isTweet(rows[1])).toBe(false);
    const t = curatedTweets(rows, 1, 2);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ handle: 'Lou', name: 'League Insider Lou', verified: true, badge: 'Leaker', replyTo: 'Joe Burrow', text: 'Big win.', teams: ['CIN'], playerId: 'P0123' });
  });
});
