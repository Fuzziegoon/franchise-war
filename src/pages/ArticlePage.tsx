import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { buildIndex, composeArticle, weekNews } from '../lib/stories';
import { isVideo } from '../lib/video';

const WEEK_LABELS: Record<number, string> = { 0: 'Preseason', 19: 'Wild Card', 20: 'Divisional', 21: 'Conference', 22: 'Super Bowl' };
const weekLabel = (w: number) => WEEK_LABELS[w] ?? `Week ${w}`;

/** Full read of a generated story: /story/:season/:week/:id */
export function StoryPage() {
  const { season: s, week: w, id } = useParams();
  const { teams, players, games } = useLeague();
  const season = Number(s), week = Number(w);
  const data = useMemo(() => ({ teams, players, games, season, week }), [teams, players, games, season, week]);
  const found = useMemo(() => {
    const idx = buildIndex(data);
    const all = weekNews(data, idx);
    const item = all.find((n) => n.id === id);
    return item ? { item, idx, more: all.filter((n) => n.id !== id).slice(0, 4), art: composeArticle(item, data, idx) } : null;
  }, [data, id]);

  if (!found) return <p>That story isn’t available anymore. <Link to="/">Back to the front page</Link>.</p>;
  const { item, more, art } = found;
  return (
    <article className="story">
      <Link to="/" className="back small">← News &amp; Twatter</Link>
      <div className="small muted kicker"><span className="chip hot">{item.cat}</span> {weekLabel(week)} · Season {season}</div>
      <h1 className="story-title">{item.headline}</h1>
      <div className="byline small muted">By <b>{item.reporter}</b> · {item.outlet}</div>
      <div className="story-grid">
        <div className="story-body">
          {art.paragraphs.map((p, i) => <p key={i} className={i === 0 ? 'lede' : ''}>{p}</p>)}
          {art.leaker && (
            <aside className="leaker-take">
              <div className="small muted">THE LEAKERS WEIGH IN</div>
              <p>{art.leaker.text}</p>
              <div className="small"><b>{art.leaker.name}</b> <span className="leaker-badge">{art.leaker.badge}</span> <span className="muted">@{art.leaker.handle}</span></div>
            </aside>
          )}
          <div className="subjects">
            {item.playerId && <Link to={`/player/${item.playerId}`} className="chip">Player page</Link>}
            {item.teams.map((t) => <Link key={t} to={`/team/${t}`} className="chip">{t}</Link>)}
          </div>
          <p className="small muted">Fictional league coverage. Reporters and outlets are made up.</p>
        </div>
        <aside className="story-side">
          <div className="panel">
            <h2>At a glance</h2>
            <dl className="facts">
              {art.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </div>
          <div className="panel">
            <h2>More from this week</h2>
            {more.map((m) => <p key={m.id} className="more"><Link to={`/story/${season}/${week}/${m.id}`}>{m.headline}</Link></p>)}
          </div>
        </aside>
      </div>
    </article>
  );
}

/** Full read of a story published from the Sheet: /article/:id */
export function WrittenPage() {
  const { id } = useParams();
  const { articles } = useLeague();
  const a = articles.find((x) => x.ArticleID === id);
  if (!a || a.Status !== 'Published') return <p>Story not found. <Link to="/">Back to the front page</Link>.</p>;
  const paras = String(a.Summary).split(/\n\s*\n|\n/).map((p) => p.trim()).filter((p) => p && !isVideo(a));
  return (
    <article className="story">
      <Link to="/" className="back small">← News &amp; Twatter</Link>
      <div className="small muted kicker"><span className="chip hot">{a.Type}</span> {weekLabel(Number(a.Week))} · Season {String(a.Season)}</div>
      <h1 className="story-title">{a.Headline}</h1>
      <div className="byline small muted">By <b>League Desk</b> · {String(a.Published)}</div>
      <div className="story-body single">{paras.map((p, i) => <p key={i} className={i === 0 ? 'lede' : ''}>{p}</p>)}</div>
    </article>
  );
}
