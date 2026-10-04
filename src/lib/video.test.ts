import { describe, expect, it } from 'vitest';
import { VIDEO_KINDS, draftVideoStory, youtubeId } from './video';

describe('youtubeId', () => {
  it('reads common link shapes', () => {
    for (const u of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?t=5&v=dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'see https://youtu.be/dQw4w9WgXcQ now'])
      expect(youtubeId(u)).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://example.com')).toBeNull();
  });
});

describe('draftVideoStory', () => {
  it('fills every kind and subject with no leftover slots', () => {
    const subjects = [
      {}, { team: { name: 'CIN', city: 'Cincinnati', nick: 'Bengals' } }, { coach: 'Wes' },
      { player: { name: 'Joe Burrow', first: 'Joe', last: 'Burrow', team: 'CIN', teamCity: 'Cincinnati', teamNick: 'Bengals' } },
    ];
    for (const k of VIDEO_KINDS) for (const s of subjects) for (const v of [0, 1, 2]) {
      const d = draftVideoStory(k, s, 3, 1, v);
      expect(d.headline + d.blurb).not.toMatch(/[{}]|undefined/);
    }
  });
});
