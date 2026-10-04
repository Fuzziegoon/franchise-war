import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { STAT_TABS, num, playerName, type Row } from '../lib/types';

export default function PlayerPage() {
  const { id } = useParams();
  const { players, teams, loadTab, season } = useLeague();
  const p = players.find((x) => x.PlayerID === id);
  const [stats, setStats] = useState<Record<string, Row | undefined> | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all(STAT_TABS.map((t) => loadTab(t).then((rows) => [t, rows.find((r) => r.PlayerID === id)] as const)))
      .then((pairs) => live && setStats(Object.fromEntries(pairs)))
      .catch(() => live && setStats({}));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p) return <p>Unknown player.</p>;
  const team = teams.find((t) => t.Abbr === p.Team);
  const lines = stats
    ? Object.entries(stats).filter(([, r]) => r && Object.entries(r).some(([k, v]) => !['PlayerID', 'Name', 'Pos', 'Team'].includes(k) && num(v) !== null))
    : [];

  return (
    <>
      <div className="small muted">
        {p.Position} · #{p.Jersey} ·{' '}
        {team ? <Link to={`/team/${team.Abbr}`}>{team.City} {team['Nickname (click)']}</Link> : p.Status === 'Draft' ? 'Draft prospect' : 'Free agent'}
      </div>
      <h1>{playerName(p)}</h1>
      <div className="grid grid-4" style={{ marginBottom: '1rem' }}>
        {[
          ['Overall', p.Overall],
          ['Age', p.Age],
          ['Height', num(p['Height (in)']) ? `${Math.floor(num(p['Height (in)'])! / 12)}'${num(p['Height (in)'])! % 12}"` : '—'],
          ['Health', p['Injury Status'] === 'Uninjured' || !p['Injury Status'] ? 'Healthy' : `${p['Injury Type'] || 'Injured'}`],
        ].map(([k, v]) => (
          <div key={String(k)} className="panel coach-card">
            <div className="muted small">{k}</div>
            <div className="big">{v as string}</div>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Season {season} stats</h2>
        {!stats && <p className="muted">Loading…</p>}
        {stats && lines.length === 0 && <p className="muted small">No stats entered yet this season.</p>}
        {lines.map(([tab, r]) => {
          const cols = Object.keys(r!).filter((k) => !['PlayerID', 'Name', 'Pos', 'Team'].includes(k));
          return (
            <div key={tab} className="table-wrap" style={{ marginBottom: '1rem' }}>
              <h3>{tab}</h3>
              <table>
                <thead>
                  <tr>{cols.map((c) => <th key={c} className="num">{c}</th>)}</tr>
                </thead>
                <tbody>
                  <tr>
                    {cols.map((c) => {
                      const n = num(r![c]);
                      return <td key={c} className="num">{n !== null && !Number.isInteger(n) ? n.toFixed(1) : (r![c] ?? '')}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </section>
    </>
  );
}
