import { Link, useParams } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { computeRecords, isFinal, recordText } from '../lib/standings';
import { num, playerName } from '../lib/types';

const POS_ORDER = ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'LE', 'RE', 'DT', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P', 'LS'];

export default function TeamPage() {
  const { abbr } = useParams();
  const { teams, players, games, season } = useLeague();
  const team = teams.find((t) => t.Abbr === abbr);
  if (!team) return <p>Unknown team.</p>;

  const rec = computeRecords(teams, games, season).get(team.Abbr)!;
  const roster = players
    .filter((p) => p.Team === team.Abbr && (p.Status === 'Signed' || p.Status === 'PracticeSquad'))
    .sort(
      (a, b) =>
        (a.Status === b.Status ? 0 : a.Status === 'Signed' ? -1 : 1) ||
        POS_ORDER.indexOf(a.Position) - POS_ORDER.indexOf(b.Position) ||
        (num(b.Overall) ?? 0) - (num(a.Overall) ?? 0),
    );
  const schedule = games
    .filter((g) => num(g.Season) === season && (g.Home === team.Abbr || g.Away === team.Abbr))
    .sort((a, b) => (num(a.Week) ?? 0) - (num(b.Week) ?? 0));

  return (
    <>
      <div className={`small conf-${team.Conference}`}>
        {team.Conference} {team.Division}
      </div>
      <h1>
        {team.City} {team['Nickname (click)']}
      </h1>
      <p className="muted">
        Season {season}: {recordText(rec)} · Head coach {team['Head Coach'] || 'CPU'} · Super Bowl wins {team['Super Bowl Wins'] || 0}
      </p>
      <div className="grid grid-2">
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <h2>Roster <span className="small muted">{roster.length} players</span></h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Player</th><th>Pos</th><th className="num">OVR</th><th className="num">Age</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p.PlayerID}>
                    <td>{p.Jersey}</td>
                    <td><Link to={`/player/${p.PlayerID}`}>{playerName(p)}</Link></td>
                    <td>{p.Position}</td>
                    <td className="num">{p.Overall}</td>
                    <td className="num">{p.Age}</td>
                    <td className="small muted">
                      {p.Status === 'PracticeSquad' ? 'Practice squad' : ''}
                      {p['Injury Status'] && p['Injury Status'] !== 'Uninjured' ? ` Injured${p['Injury Type'] ? `: ${p['Injury Type']}` : ''}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Season {season} games</h2>
          {schedule.length === 0 && <p className="small muted">No games logged yet.</p>}
          {schedule.map((g) => {
            const home = g.Home === team.Abbr;
            const us = num(home ? g['Home Score'] : g['Away Score']);
            const them = num(home ? g['Away Score'] : g['Home Score']);
            const res = !isFinal(g) ? '' : us! > them! ? 'W' : us! < them! ? 'L' : 'T';
            return (
              <div key={g.GameID} className="score">
                <div>
                  {home ? 'vs' : '@'} <Link to={`/team/${home ? g.Away : g.Home}`}>{home ? g.Away : g.Home}</Link>
                </div>
                <div className={res === 'W' ? 'w' : res === 'L' ? 'l' : ''}>
                  {res} {isFinal(g) ? `${us}-${them}` : ''} <span className="small muted">{g.Stage === 'Regular' ? `W${g.Week}` : g.Stage}</span>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
