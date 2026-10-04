import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { isFinal } from '../lib/standings';
import { num } from '../lib/types';

/** ESPN-style strip of the most recent week's final scores. */
export default function Ticker() {
  const { games, season } = useLeague();
  const { week, list } = useMemo(() => {
    const done = games.filter((g) => num(g.Season) === season && isFinal(g));
    const w = done.length ? Math.max(...done.map((g) => num(g.Week) ?? 0)) : 0;
    return { week: w, list: done.filter((g) => (num(g.Week) ?? 0) === w) };
  }, [games, season]);
  if (!list.length) return null;
  return (
    <div className="ticker" aria-label="Latest scores">
      <div className="ticker-inner">
        <div className="ticker-label"><span>NFL</span><small>Week {week}</small></div>
        {list.map((g) => {
          const hs = num(g['Home Score']) ?? 0, as = num(g['Away Score']) ?? 0;
          return (
            <div className="ticker-game" key={g.GameID}>
              <small>Final</small>
              <Link to={`/team/${g.Away}`} className={as > hs ? 'win' : ''}><span>{g.Away}</span><b>{as}</b></Link>
              <Link to={`/team/${g.Home}`} className={hs > as ? 'win' : ''}><span>{g.Home}</span><b>{hs}</b></Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
