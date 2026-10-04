import { useState, type FormEvent, type ReactNode } from 'react';
import { appendRow, updateRow } from '../lib/api';
import { useLeague } from '../lib/league';
import { STAGES, playerName, type Player, type Row, type Team } from '../lib/types';
import { VIDEO_KINDS, draftVideoStory, videoType, youtubeId, type VideoKind, type VideoSubject } from '../lib/video';

type Status = { kind: 'idle' | 'busy' | 'ok' | 'err'; msg?: string };

function useSaver() {
  const { reload } = useLeague();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const run = async (fn: () => Promise<string>) => {
    setStatus({ kind: 'busy' });
    try {
      const msg = await fn();
      setStatus({ kind: 'ok', msg });
      await reload();
    } catch (e) {
      setStatus({ kind: 'err', msg: (e as Error).message });
    }
  };
  const view: ReactNode =
    status.kind === 'ok' ? <p className="ok small">{status.msg}</p> : status.kind === 'err' ? <p className="error small">{status.msg}</p> : null;
  return { run, busy: status.kind === 'busy', view };
}

const coachOf = (teams: Team[], abbr: string) => {
  const c = teams.find((t) => t.Abbr === abbr)?.['Head Coach'];
  return c ? String(c) : 'CPU';
};

function TeamSelect({ value, onChange, teams, label }: { value: string; onChange: (v: string) => void; teams: Team[]; label: string }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">—</option>
        {[...teams].sort((a, b) => a.Abbr.localeCompare(b.Abbr)).map((t) => (
          <option key={t.Abbr} value={t.Abbr}>{t.Abbr} · {t['Nickname (click)']}</option>
        ))}
      </select>
    </label>
  );
}

function LogGame({ pw }: { pw: string }) {
  const { teams, season } = useLeague();
  const { run, busy, view } = useSaver();
  const [f, setF] = useState({ Season: season, Week: 1, Stage: 'Regular', Home: '', Away: '', hs: '', as: '' });
  const set = (k: keyof typeof f) => (v: string | number) => setF({ ...f, [k]: v });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (f.Home === f.Away) return;
    const values: Row = {
      Season: Number(f.Season),
      Week: Number(f.Week),
      Stage: f.Stage,
      Home: f.Home,
      Away: f.Away,
      'Home Score': Number(f.hs),
      'Away Score': Number(f.as),
      'Home Coach': coachOf(teams, f.Home),
      'Away Coach': coachOf(teams, f.Away),
      GameID: `S${f.Season}${f.Stage === 'Regular' ? `W${f.Week}` : f.Stage}-${f.Away}-${f.Home}`,
    };
    void run(async () => {
      const r = await appendRow(pw, 'Games', values);
      setF({ ...f, Home: '', Away: '', hs: '', as: '' });
      return `Saved ${r.id} on row ${r.row}.`;
    });
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="row">
        <label>Season<input type="number" min={1} value={f.Season} onChange={(e) => set('Season')(e.target.value)} /></label>
        <label>Week<input type="number" min={0} max={23} value={f.Week} onChange={(e) => set('Week')(e.target.value)} /></label>
        <label>Stage<select value={f.Stage} onChange={(e) => set('Stage')(e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="row">
        <TeamSelect label="Away team" teams={teams} value={f.Away} onChange={set('Away')} />
        <label>Away score<input type="number" min={0} required value={f.as} onChange={(e) => set('as')(e.target.value)} /></label>
        <TeamSelect label="Home team" teams={teams} value={f.Home} onChange={set('Home')} />
        <label>Home score<input type="number" min={0} required value={f.hs} onChange={(e) => set('hs')(e.target.value)} /></label>
      </div>
      {f.Home && f.Away && (
        <p className="small muted">
          Coaches: {coachOf(teams, f.Away)} @ {coachOf(teams, f.Home)} {f.Home === f.Away && <span className="error">— pick two different teams</span>}
        </p>
      )}
      <div><button disabled={busy}>{busy ? 'Saving…' : 'Save game'}</button></div>
      {view}
    </form>
  );
}

function SetCoach({ pw }: { pw: string }) {
  const { teams } = useLeague();
  const { run, busy, view } = useSaver();
  const [abbr, setAbbr] = useState('');
  const [coach, setCoach] = useState('');
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await updateRow(pw, 'Teams', abbr, { 'Head Coach': coach.trim() || 'CPU' });
          return `${abbr} head coach is now ${coach.trim() || 'CPU'}.`;
        });
      }}
    >
      <div className="row">
        <TeamSelect label="Team" teams={teams} value={abbr} onChange={(v) => { setAbbr(v); setCoach(coachOf(teams, v)); }} />
        <label>Head coach (or CPU)<input value={coach} onChange={(e) => setCoach(e.target.value)} placeholder="CPU" /></label>
      </div>
      <div><button disabled={busy || !abbr}>{busy ? 'Saving…' : 'Save coach'}</button></div>
      {view}
    </form>
  );
}

function LogMove({ pw }: { pw: string }) {
  const { teams, players, season } = useLeague();
  const { run, busy, view } = useSaver();
  const [f, setF] = useState({ Week: 1, Type: 'Signing', From: '', To: '', PlayerID: '', Details: '', apply: true });
  const [q, setQ] = useState('');
  const matches = q.length < 2 ? [] : players.filter((p) => `${playerName(p)} ${p.PlayerID}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  const picked = players.find((p) => p.PlayerID === f.PlayerID);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await appendRow(pw, 'Transactions', {
        Season: season, Week: Number(f.Week), Type: f.Type,
        'From Team (abbr)': f.From, 'To Team (abbr)': f.To, 'PlayerID or Pick': f.PlayerID, Details: f.Details,
      });
      let extra = '';
      if (f.apply && picked) {
        const to = teams.find((t) => t.Abbr === f.To);
        const values: Row =
          f.Type === 'Release' ? { TeamIndex: 32, Status: 'FreeAgent' }
          : to ? { TeamIndex: Number(to['TeamIndex (save ID)']), Status: 'Signed' } : {};
        if (Object.keys(values).length) {
          await updateRow(pw, 'Players', picked.PlayerID, values);
          extra = ` ${playerName(picked)} moved on the Players tab.`;
        }
      }
      return `Logged ${r.id}.${extra}`;
    });
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="row">
        <label>Week<input type="number" min={0} value={f.Week} onChange={(e) => setF({ ...f, Week: Number(e.target.value) })} /></label>
        <label>Type<select value={f.Type} onChange={(e) => setF({ ...f, Type: e.target.value })}>{['Trade', 'Signing', 'Release', 'Draft', 'Extension'].map((t) => <option key={t}>{t}</option>)}</select></label>
        <TeamSelect label="From team" teams={teams} value={f.From} onChange={(v) => setF({ ...f, From: v })} />
        <TeamSelect label="To team" teams={teams} value={f.To} onChange={(v) => setF({ ...f, To: v })} />
      </div>
      <label>
        Player (search name or ID)
        <input value={picked ? `${playerName(picked)} · ${picked.Position} · ${picked.Team} (${picked.PlayerID})` : q} onChange={(e) => { setQ(e.target.value); setF({ ...f, PlayerID: '' }); }} />
      </label>
      {!picked && matches.length > 0 && (
        <div className="small">
          {matches.map((p) => (
            <button type="button" key={p.PlayerID} className="ghost" style={{ margin: 2 }} onClick={() => setF({ ...f, PlayerID: p.PlayerID, From: f.From || p.Team })}>
              {playerName(p)} · {p.Position} · {p.Team}
            </button>
          ))}
        </div>
      )}
      <label>Details<input value={f.Details} onChange={(e) => setF({ ...f, Details: e.target.value })} placeholder="e.g. 3 yrs / $24M, or the full trade" /></label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={f.apply} onChange={(e) => setF({ ...f, apply: e.target.checked })} />
        Also move the player on the Players tab
      </label>
      <div><button disabled={busy || !f.PlayerID}>{busy ? 'Saving…' : 'Log move'}</button></div>
      {view}
    </form>
  );
}

function WriteArticle({ pw }: { pw: string }) {
  const { season } = useLeague();
  const { run, busy, view } = useSaver();
  const blank = { Week: 1, Type: 'Recap', Subjects: '', Headline: '', Summary: '', 'Key facts used': '', Status: 'Published' };
  const [f, setF] = useState(blank);
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const r = await appendRow(pw, 'Articles', {
            ...f, Season: season, Week: Number(f.Week),
            Published: f.Status === 'Published' ? new Date().toISOString().slice(0, 10) : '',
          });
          setF(blank);
          return `Saved article ${r.id}.`;
        });
      }}
    >
      <div className="row">
        <label>Week<input type="number" min={0} value={f.Week} onChange={(e) => setF({ ...f, Week: Number(e.target.value) })} /></label>
        <label>Type<select value={f.Type} onChange={(e) => setF({ ...f, Type: e.target.value })}>{['Recap', 'Feature', 'Rumor', 'Power Rankings', 'Feed Post', 'Milestone'].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Status<select value={f.Status} onChange={(e) => setF({ ...f, Status: e.target.value })}><option>Published</option><option>Draft</option></select></label>
      </div>
      <label>Headline<input required value={f.Headline} onChange={(e) => setF({ ...f, Headline: e.target.value })} /></label>
      <label>Story<textarea required value={f.Summary} onChange={(e) => setF({ ...f, Summary: e.target.value })} /></label>
      <label>Subjects (PlayerIDs, team abbrs, coach names; separated by ;)<input value={f.Subjects} onChange={(e) => setF({ ...f, Subjects: e.target.value })} /></label>
      <div><button disabled={busy}>{busy ? 'Saving…' : 'Save article'}</button></div>
      {view}
    </form>
  );
}


function PublishVideo({ pw }: { pw: string }) {
  const { season, teams, players } = useLeague();
  const { run, busy, view } = useSaver();
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState<VideoKind>('Game Highlights');
  const [week, setWeek] = useState(1);
  const [subj, setSubj] = useState<'none' | 'team' | 'player' | 'coach'>('none');
  const [teamAbbr, setTeamAbbr] = useState('');
  const [coach, setCoach] = useState('');
  const [query, setQuery] = useState('');
  const [player, setPlayer] = useState<Player | null>(null);
  const [variant, setVariant] = useState(0);
  const [edit, setEdit] = useState<{ h: string; b: string } | null>(null);

  const coaches = Array.from(new Set(teams.map((t) => String(t['Head Coach'] ?? '')).filter((c) => c && c.toUpperCase() !== 'CPU')));
  const matches = query.length >= 2 ? players.filter((p) => playerName(p).toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];
  const teamBy = (abbr: string) => teams.find((t) => t.Abbr === abbr);

  const subject: VideoSubject = {};
  const team = teamBy(teamAbbr);
  if (subj === 'team' && team) subject.team = { name: team.Abbr, city: String(team.City), nick: String(team['Nickname (click)']) };
  if (subj === 'coach' && coach) subject.coach = coach;
  if (subj === 'player' && player) {
    const pt = teams.find((t) => String(t['TeamIndex (save ID)']) === String(player.TeamIndex));
    subject.player = {
      name: playerName(player), first: String(player['First Name']), last: String(player['Last Name']),
      team: pt?.Abbr ?? '', teamCity: String(pt?.City ?? ''), teamNick: String(pt?.['Nickname (click)'] ?? 'team'),
    };
  }
  const draft = draftVideoStory(kind, subject, week, season, variant);
  const text = edit ?? { h: draft.headline, b: draft.blurb };
  const id = youtubeId(url);
  const subjects = [subject.team?.name, subject.player?.team, player?.PlayerID, subject.coach].filter(Boolean).join(';');

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!id) return;
        void run(async () => {
          const r = await appendRow(pw, 'Articles', {
            Season: season, Week: week, Type: videoType(kind), Subjects: subjects, Headline: text.h,
            Summary: `${text.b}\nhttps://youtu.be/${id}`, 'Key facts used': '', Status: 'Published',
            Published: new Date().toISOString().slice(0, 10),
          });
          setUrl(''); setEdit(null); setVariant(0);
          return `Posted video ${r.id}. It will show on the home page.`;
        });
      }}
    >
      <label>YouTube link<input required placeholder="https://youtu.be/..." value={url} onChange={(e) => setUrl(e.target.value)} /></label>
      {url && !id && <p className="error small">That doesn't look like a YouTube link.</p>}
      <div className="row">
        <label>Kind<select value={kind} onChange={(e) => { setKind(e.target.value as VideoKind); setEdit(null); }}>{VIDEO_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label>Week<input type="number" min={0} value={week} onChange={(e) => { setWeek(Number(e.target.value)); setEdit(null); }} /></label>
        <label>Featuring
          <select value={subj} onChange={(e) => { setSubj(e.target.value as typeof subj); setEdit(null); }}>
            <option value="none">Whole league</option><option value="team">A team</option><option value="player">A player</option><option value="coach">A coach</option>
          </select>
        </label>
      </div>
      {subj === 'team' && (
        <label>Team<select value={teamAbbr} onChange={(e) => { setTeamAbbr(e.target.value); setEdit(null); }}>
          <option value="">Pick…</option>{teams.map((t) => <option key={t.Abbr} value={t.Abbr}>{t.City} {t['Nickname (click)']}</option>)}
        </select></label>
      )}
      {subj === 'coach' && (
        <label>Coach<select value={coach} onChange={(e) => { setCoach(e.target.value); setEdit(null); }}>
          <option value="">Pick…</option>{coaches.map((c) => <option key={c}>{c}</option>)}
        </select></label>
      )}
      {subj === 'player' && (
        <div>
          <label>Player (type a name)<input value={player ? playerName(player) : query} onChange={(e) => { setPlayer(null); setQuery(e.target.value); setEdit(null); }} /></label>
          {!player && matches.map((p) => <button type="button" className="ghost match" key={p.PlayerID} onClick={() => setPlayer(p)}>{playerName(p)} · {p.Position} · {p.Team}</button>)}
        </div>
      )}
      <label>Headline<input required value={text.h} onChange={(e) => setEdit({ ...text, h: e.target.value })} /></label>
      <label>Blurb<textarea required value={text.b} onChange={(e) => setEdit({ ...text, b: e.target.value })} /></label>
      <div className="row">
        <button type="button" className="ghost" onClick={() => { setVariant(variant + 1); setEdit(null); }}>Write me another</button>
        <button disabled={busy || !id}>{busy ? 'Posting…' : 'Post video'}</button>
      </div>
      {view}
    </form>
  );
}

export default function Admin() {
  const { admin, sample } = useLeague();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!admin.password) {
    return (
      <section className="panel" style={{ maxWidth: 420 }}>
        <h2>League admin</h2>
        <p className="small muted">Enter the league password to log games, moves and stories. Everyone else sees the site read-only.</p>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              await admin.unlock(pw);
            } catch (x) {
              setErr((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>League password<input type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
          <div><button disabled={busy || !pw}>{busy ? 'Checking…' : 'Unlock'}</button></div>
          {err && <p className="error small">{err}</p>}
          {sample && <p className="small muted">Sample mode: any password opens the admin screens, but nothing can be saved.</p>}
        </form>
      </section>
    );
  }

  const p = admin.password;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>League admin</h1>
        <button className="ghost" onClick={admin.lock}>Lock</button>
      </div>
      <div className="grid grid-2">
        <section className="panel"><h2>Log a game</h2><LogGame pw={p} /></section>
        <section className="panel"><h2>Log a move</h2><LogMove pw={p} /></section>
        <section className="panel"><h2>Publish a story</h2><WriteArticle pw={p} /></section>
        <section className="panel"><h2>Post a video</h2><PublishVideo pw={p} /></section>
        <section className="panel"><h2>Head coaches</h2><SetCoach pw={p} /></section>
      </div>
    </>
  );
}
