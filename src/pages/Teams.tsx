import { Link } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { computeRecords, recordText } from '../lib/standings';
import { num } from '../lib/types';

export default function Teams() {
  const { teams, players, games, season } = useLeague();
  const recs = computeRecords(teams, games, season);
  return (
    <>
      <h1>Teams</h1>
      <div className="grid grid-4">
        {teams.map((t) => {
          const roster = players.filter((p) => p.Team === t.Abbr && p.Status === 'Signed');
          const ovr = roster.map((p) => num(p.Overall) ?? 0);
          const avg = ovr.length ? (ovr.reduce((a, b) => a + b, 0) / ovr.length).toFixed(1) : '—';
          const human = t['Head Coach'] && String(t['Head Coach']).toUpperCase() !== 'CPU';
          return (
            <Link key={t.Abbr} to={`/team/${t.Abbr}`} className="panel team-tile">
              <div className={`small conf-${t.Conference}`}>
                {t.Conference} {t.Division}
              </div>
              <h3>
                {t.City} {t['Nickname (click)']}
              </h3>
              <div className="small muted">
                {recordText(recs.get(t.Abbr)!)} · Avg OVR {avg} · {roster.length} signed
              </div>
              <div style={{ marginTop: 6 }}>
                <span className={human ? 'chip coach' : 'chip'}>{human ? t['Head Coach'] : 'CPU'}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
