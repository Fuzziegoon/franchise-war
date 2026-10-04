/** Rows come back from the Sheet keyed by the exact header text. */
export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

export interface Team extends Row {
  'TeamIndex (save ID)': number | string;
  City: string;
  'Nickname (click)': string;
  Abbr: string;
  Conference: 'AFC' | 'NFC' | string;
  Division: string;
  'Head Coach': string;
  Record: string;
  'Super Bowl Wins': number | string;
}

export interface Player extends Row {
  PlayerID: string;
  'First Name': string;
  'Last Name': string;
  Position: string;
  Age: number | string;
  Overall: number | string;
  TeamIndex: number | string;
  Team: string;
  Status: 'Signed' | 'PracticeSquad' | 'FreeAgent' | 'Draft' | string;
  Jersey: number | string;
  'Injury Status': string;
}

export type Stage = 'Preseason' | 'Regular' | 'WildCard' | 'Divisional' | 'Conference' | 'SuperBowl';

export interface Game extends Row {
  GameID: string;
  Season: number | string;
  Week: number | string;
  Stage: Stage | string;
  Home: string;
  Away: string;
  'Home Score': number | string;
  'Away Score': number | string;
  'Home Coach': string;
  'Away Coach': string;
  Winner: string;
  Margin: number | string;
  '1v1?': string;
}

export interface Article extends Row {
  ArticleID: string;
  Season: number | string;
  Week: number | string;
  Type: string;
  Subjects: string;
  Headline: string;
  Summary: string;
  'Key facts used': string;
  Status: 'Draft' | 'Published' | string;
  Published: string;
}

export interface Meta {
  currentSeason: number | null;
  sheetName?: string;
  readAt?: string;
}

export const STAT_TABS = ['Passing', 'Rushing', 'Receiving', 'Defense', 'Kicking'] as const;
export type StatTab = (typeof STAT_TABS)[number];

export const STAGES: Stage[] = ['Preseason', 'Regular', 'WildCard', 'Divisional', 'Conference', 'SuperBowl'];

export const num = (v: Cell | undefined): number | null => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const playerName = (p: Pick<Player, 'First Name' | 'Last Name'>) =>
  `${p['First Name']} ${p['Last Name']}`.trim();

export const teamName = (t: Team) => `${t.City} ${t['Nickname (click)']}`;
