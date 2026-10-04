import { describe, expect, it } from 'vitest';
import { sampleGames, sampleTeams } from './sample';
import { coachRecords, computeRecords, divisionTables, recordText } from './standings';
import type { Game } from './types';

const g = (o: Partial<Game>): Game =>
  ({ GameID: 'x', Season: 1, Week: 1, Stage: 'Regular', Home: '', Away: '', 'Home Score': '', 'Away Score': '', 'Home Coach': 'CPU', 'Away Coach': 'CPU', ...o }) as Game;

describe('computeRecords', () => {
  it('counts sample games', () => {
    const r = computeRecords(sampleTeams, sampleGames, 1);
    expect(recordText(r.get('CHI')!)).toBe('1-1');
    expect(recordText(r.get('CIN')!)).toBe('1-1');
    expect(recordText(r.get('PIT')!)).toBe('1-0');
    expect(r.get('CHI')!.streak).toBe('L1');
    expect(r.get('PIT')!.divW).toBe(1); // CIN-PIT is an AFC North game
  });

  it('ignores unscored, other-season and playoff games; handles ties', () => {
    const games = [
      g({ Home: 'KC', Away: 'LV', 'Home Score': 20, 'Away Score': 20 }),
      g({ Home: 'KC', Away: 'DEN' }),
      g({ Home: 'KC', Away: 'DEN', Season: 2, 'Home Score': 3, 'Away Score': 0 }),
      g({ Home: 'KC', Away: 'BUF', Stage: 'WildCard', 'Home Score': 3, 'Away Score': 0 }),
    ];
    const r = computeRecords(sampleTeams, games, 1);
    expect(recordText(r.get('KC')!)).toBe('0-0-1');
    expect(r.get('KC')!.divT).toBe(1);
  });

  it('groups 8 divisions of 4', () => {
    const t = divisionTables(sampleTeams, computeRecords(sampleTeams, sampleGames, 1));
    expect(t).toHaveLength(8);
    expect(t.every((d) => d.rows.length === 4)).toBe(true);
    expect(t.find((d) => d.conference === 'AFC' && d.division === 'North')!.rows[0].abbr).toBe('PIT');
  });
});

describe('coachRecords', () => {
  it('tracks overall, head-to-head and titles, skipping CPU', () => {
    const games = [
      ...sampleGames,
      g({ Stage: 'SuperBowl', Home: 'CHI', Away: 'CIN', 'Home Score': 30, 'Away Score': 10, 'Home Coach': 'Wes', 'Away Coach': 'Christian' }),
    ];
    const c = Object.fromEntries(coachRecords(games).map((x) => [x.coach, x]));
    expect(Object.keys(c).sort()).toEqual(['Christian', 'Wes']);
    expect(recordText(c.Wes)).toBe('1-1');
    expect(c.Wes.titles).toBe(1);
    expect(c.Wes.h2hW).toBe(1);
    expect(c.Wes.h2hL).toBe(1);
    expect(c.Christian.playoffL).toBe(1);
  });
});
