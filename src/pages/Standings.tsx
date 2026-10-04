import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { computeRecords, divisionTables, recordText } from '../lib/standings';
import { num } from '../lib/types';

export default function Standings() {
  const { teams, games, season: current } = useLeague();
  const seasons = [...new Set(games.map((g) => num(g.Season)).filter((s): s is number => s !== null && s > 0))];
  if (!seasons.includes(current)) seasons.push(current);
  seasons.sort((a, b) => b - a);
  const [season, setSeason] = useState(current);

  const tables = divisionTables(teams, computeRecords(teams, games, season));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <h1>Standings</h1>
        <label style={{ width: 140 }}>
          Season
          <select value={season} onChange={(e) => setSeason(Number(e.target.value))}>
            {seasons.map((s) => (
              <option key={s} value={s}>Season {s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-2">
        {tables.map((d) => (
          <section key={`${d.conference}${d.division}`} className="panel">
            <h2 className={`conf-${d.conference}`}>
              {d.conference} {d.division}
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th className="num">W-L</th>
                    <th className="num">Div</th>
                    <th className="num">PF</th>
                    <th className="num">PA</th>
                    <th className="num">Strk</th>
                  </tr>
                </thead>
                <tbody>
                  {d.rows.map((r) => (
                    <tr key={r.abbr}>
                      <td>
                        <Link to={`/team/${r.abbr}`}>{r.team.City} {r.team['Nickname (click)']}</Link>{' '}
                        {String(r.team['Head Coach']).toUpperCase() !== 'CPU' && r.team['Head Coach'] && (
                          <span className="chip coach">{r.team['Head Coach']}</span>
                        )}
                      </td>
                      <td className="num">{recordText(r)}</td>
                      <td className="num">{recordText({ w: r.divW, l: r.divL, t: r.divT })}</td>
                      <td className="num">{r.pf}</td>
                      <td className="num">{r.pa}</td>
                      <td className="num">{r.streak || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      <p className="small muted">Regular-season games only, computed from the Games tab.</p>
    </>
  );
}
