import { isFinal } from './standings';
import { num, type Game } from './types';

/** Final scores from the most recent finished week before the one being viewed. */
export function lastWeekScores(games: Game[], season: number, week: number): { week: number; list: Game[] } | null {
  const done = games.filter((g) => num(g.Season) === season && isFinal(g) && (num(g.Week) ?? 0) < week);
  if (!done.length) return null;
  const w = Math.max(...done.map((g) => num(g.Week) ?? 0));
  return { week: w, list: done.filter((g) => (num(g.Week) ?? 0) === w) };
}
