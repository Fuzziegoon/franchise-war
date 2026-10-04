import { describe, expect, it } from 'vitest';
import { lastWeekScores } from '../lib/scores';
import type { Game } from '../lib/types';

const g = (id: string, week: number, hs: number | string, as: number | string): Game =>
  ({ GameID: id, Season: 1, Week: week, Stage: 'Regular', Home: 'CIN', Away: 'PIT', 'Home Score': hs, 'Away Score': as, 'Home Coach': 'Wes', 'Away Coach': 'CPU', Winner: '', Margin: '', '1v1?': '' }) as Game;

describe('lastWeekScores', () => {
  const games = [g('a', 1, 24, 17), g('b', 1, 10, 13), g('c', 2, 30, 3), g('d', 3, '', '')];
  it('shows the finished week before the one being viewed', () => {
    expect(lastWeekScores(games, 1, 3)?.week).toBe(2);
    expect(lastWeekScores(games, 1, 2)?.list.map((x) => x.GameID)).toEqual(['a', 'b']);
  });
  it('shows nothing for week 1', () => {
    expect(lastWeekScores(games, 1, 1)).toBeNull();
  });
});
