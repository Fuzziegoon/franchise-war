import { Link } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { coachRecords, isFinal, pct, recordText } from '../lib/standings';
import { num } from '../lib/types';

export default function Home() {
  const { articles, games, teams } = useLeague();
  const coaches = coachRecords(games);
  const humanTeams = teams.filter((t) => t['Head Coach'] && String(t['Head Coach']).toUpperCase() !== 'CPU');

  const published = articles
    .filter((a) => a.Status === 'Published')
    .sort((a, b) => (num(b.Season)! - num(a.Season)!) || (num(b.Week)! - num(a.Week)!))
    .slice(0, 10);

  const recent = games
    .filter(isFinal)
    .sort((a, b) => (num(b.Season)! - num(a.Season)!) || (num(b.Week)! - num(a.Week)!))
    .slice(0, 8);

  return (
    <div className="grid grid-2">
      <section className="panel" style={{ gridColumn: '1 / -1' }}>
        <h2>The War</h2>
        {coaches.length === 0 ? (
          <p className="muted small">
            No coach games logged yet.{' '}
            {humanTeams.length > 0 && <>Coaching: {humanTeams.map((t) => `${t['Head Coach']} (${t.Abbr})`).join(', ')}.</>}
          </p>
        ) : (
          <div className="grid grid-4">
            {coaches.map((c) => (
              <div key={c.coach} className="coach-card">
                <div className="muted small">{c.coach}</div>
                <div className="big">{recordText(c)}</div>
                <div className="small muted">
                  {pct(c).toFixed(3).replace(/^0/, '')} · Head-to-head{' '}
                  {recordText({ w: c.h2hW, l: c.h2hL, t: c.h2hT })} · Titles {c.titles}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>League News</h2>
        {published.length === 0 && <p className="muted small">No stories published yet.</p>}
        {published.map((a) => (
          <article key={a.ArticleID} className="article">
            <div className="small muted">
              Season {a.Season} · Week {a.Week} · <span className="chip">{a.Type}</span>
            </div>
            <h3>{a.Headline}</h3>
            <p className="small">{a.Summary}</p>
          </article>
        ))}
      </section>

      <section className="panel">
        <h2>Latest Scores</h2>
        {recent.length === 0 && <p className="muted small">No games logged yet.</p>}
        {recent.map((g) => {
          const hs = num(g['Home Score'])!;
          const as = num(g['Away Score'])!;
          return (
            <div key={g.GameID} className="score">
              <div>
                <span className={as > hs ? 'w' : ''}>
                  <Link to={`/team/${g.Away}`}>{g.Away}</Link> {as}
                </span>{' '}
                @{' '}
                <span className={hs > as ? 'w' : ''}>
                  <Link to={`/team/${g.Home}`}>{g.Home}</Link> {hs}
                </span>
                {g['1v1?'] === 'Yes' && <span className="chip coach" style={{ marginLeft: 6 }}>1v1</span>}
              </div>
              <div className="small muted">
                S{g.Season} {g.Stage === 'Regular' ? `W${g.Week}` : g.Stage}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
