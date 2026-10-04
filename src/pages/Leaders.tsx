import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { num, STAT_TABS, type Row, type StatTab } from '../lib/types';

const DEFAULT_SORT: Record<StatTab, string> = {
  Passing: 'Yds',
  Rushing: 'Yds',
  Receiving: 'Yds',
  Defense: 'Sacks',
  Kicking: 'FGM',
};

export default function Leaders() {
  const { loadTab, season } = useLeague();
  const [tab, setTab] = useState<StatTab>('Passing');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sort, setSort] = useState(DEFAULT_SORT.Passing);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setRows(null);
    setErr(null);
    loadTab(tab).then(
      (r) => live && setRows(r),
      (e: Error) => live && setErr(e.message),
    );
    return () => {
      live = false;
    };
    // loadTab identity changes as tabs cache; tab is the real trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const withStats = (rows ?? []).filter((r) => num(r[sort]) !== null);
  const sorted = [...withStats].sort((a, b) => (num(b[sort]) ?? 0) - (num(a[sort]) ?? 0)).slice(0, 25);
  const cols = rows && rows[0] ? Object.keys(rows[0]).filter((c) => !['PlayerID', 'Name', 'Pos', 'Team'].includes(c)) : [];

  return (
    <>
      <h1>Season {season} Leaders</h1>
      <div className="tabs">
        {STAT_TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? 'on' : ''}
            onClick={() => {
              setTab(t);
              setSort(DEFAULT_SORT[t]);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <section className="panel">
        {err && <p className="error">{err}</p>}
        {!rows && !err && <p className="muted">Loading…</p>}
        {rows && sorted.length === 0 && (
          <p className="muted small">No {tab.toLowerCase()} totals entered for this season yet.</p>
        )}
        {sorted.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Team</th>
                  {cols.map((c) => (
                    <th key={c} className="num" style={{ cursor: 'pointer', color: c === sort ? 'var(--accent)' : undefined }} onClick={() => setSort(c)}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={String(r.PlayerID)}>
                    <td>{i + 1}</td>
                    <td>
                      <Link to={`/player/${r.PlayerID}`}>{r.Name}</Link> <span className="small muted">{r.Pos}</span>
                    </td>
                    <td>{r.Team}</td>
                    {cols.map((c) => {
                      const v = r[c];
                      const n = num(v);
                      return (
                        <td key={c} className="num">
                          {n !== null && !Number.isInteger(n) ? n.toFixed(1) : (v ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
