import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/league';
import { buildIndex, generateNews, generateRecaps, generateTweets, type NewsItem, type TweetItem } from '../lib/stories';
import { coachRecords, pct, recordText } from '../lib/standings';
import { num, type Article } from '../lib/types';
import { embedUrl, isVideo, thumbUrl, videoBlurb, videoIdOf, videoKindOf } from '../lib/video';

const WEEK_LABELS: Record<number, string> = { 0: 'Preseason', 19: 'Wild Card', 20: 'Divisional', 21: 'Conference', 22: 'Super Bowl' };
const weekLabel = (w: number) => WEEK_LABELS[w] ?? `Week ${w}`;

const colorFor = (s: string) => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 45%)`;
};
const ago = (m: number) => (m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`);
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

type Filter = 'all' | 'coach' | 'league';

export default function Home() {
  const { articles, games, teams, players, season, loading } = useLeague();

  const latestWeek = useMemo(() => {
    const weeks = games.filter((g) => num(g.Season) === season && num(g['Home Score']) !== null).map((g) => num(g.Week) ?? 0);
    return weeks.length ? Math.max(...weeks) : 1;
  }, [games, season]);
  const [picked, setPicked] = useState<number | null>(null);
  const week = picked ?? latestWeek;
  const [filter, setFilter] = useState<Filter>('all');

  const published = articles
    .filter((a) => a.Status === 'Published' && num(a.Season) === season)
    .sort((a, b) => String(b.Published).localeCompare(String(a.Published)) || (num(b.Week) ?? 0) - (num(a.Week) ?? 0));
  const videos = published.filter(isVideo);
  const written = published.filter((a) => !isVideo(a) && num(a.Week) === week);
  const featured = videos[0];

  const data = useMemo(() => ({ teams, players, games, season, week }), [teams, players, games, season, week]);
  const idx = useMemo(() => buildIndex(data), [data]);
  const recaps = useMemo(() => generateRecaps(data, idx), [data, idx]);
  const news = useMemo(() => [...recaps, ...generateNews(data, idx, 8)], [data, idx, recaps]);
  const tweets = useMemo(() => {
    const base = generateTweets(data, idx, 26);
    const v = videos[0];
    if (!v) return base;
    const vt: TweetItem = {
      id: `video-${v.ArticleID}`, cat: 'video', handle: 'TheLeagueLeak', name: 'The League Leak', verified: true,
      text: `NEW VIDEO: ${v.Headline}`, minsAgo: 4, likes: 640, rts: 190, replies: 58, teams: [], scope: 'league',
    };
    return [vt, ...base];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, idx, videos[0]?.ArticleID]);

  const coaches = coachRecords(games);
  const humanTeams = teams.filter((t) => t['Head Coach'] && String(t['Head Coach']).toUpperCase() !== 'CPU');

  const shownTweets = tweets.filter((t) => filter === 'all' || (filter === 'coach' ? t.scope === 'coach' : t.scope !== 'coach'));
  const weeks = Array.from({ length: 23 }, (_, i) => i);

  return (
    <>
      <div className="page-head">
        <h1>News &amp; Twatter</h1>
        <label className="week-pick">
          Season {season}
          <select value={week} onChange={(e) => setPicked(Number(e.target.value))}>
            {weeks.map((w) => (
              <option key={w} value={w}>{weekLabel(w)}</option>
            ))}
          </select>
        </label>
      </div>

      {featured && (
        <section className="hero">
          <VideoPlayer a={featured} big />
          <div className="hero-side">
            <h2>Latest videos</h2>
            {videos.slice(1, 5).map((v) => <VideoRow key={v.ArticleID} a={v} />)}
            {videos.length < 2 && <p className="muted small">More videos show up here as they are posted.</p>}
          </div>
        </section>
      )}

      <section className="panel war">
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
                  {pct(c).toFixed(3).replace(/^0/, '')} · Head-to-head {recordText({ w: c.h2hW, l: c.h2hL, t: c.h2hT })} · Titles {c.titles}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {loading && !players.length ? <p className="muted">Loading the league…</p> : (
        <div className="split">
          <section className="panel">
            <h2>League News <span className="small muted">{weekLabel(week)}</span></h2>
            {written.map((a) => <WrittenCard key={a.ArticleID} a={a} />)}
            {news.length === 0 && written.length === 0 && <p className="muted small">No stories yet for this week.</p>}
            {news.map((n) => <NewsCard key={n.id} n={n} />)}
          </section>

          <section className="panel feed">
            <div className="feed-head">
              <h2>Twatter</h2>
              <div className="chips">
                {([['all', 'All'], ['coach', 'Coaches'], ['league', 'Around the League']] as [Filter, string][]).map(([k, label]) => (
                  <button key={k} className={filter === k ? 'chip-btn on' : 'chip-btn'} onClick={() => setFilter(k)}>{label}</button>
                ))}
              </div>
            </div>
            {shownTweets.length === 0 && <p className="muted small">Nothing trending here yet.</p>}
            {shownTweets.map((t) => <Tweet key={t.id} t={t} />)}
          </section>
        </div>
      )}
      <p className="small muted disclaimer">
        Fictional league coverage for The League Leak. Reporters, outlets and accounts are made up; stories fill in
        names from your roster, injuries and games.
      </p>
    </>
  );
}

function Subjects({ teams, playerId }: { teams: string[]; playerId?: string }) {
  return (
    <div className="subjects">
      {playerId && <Link to={`/player/${playerId}`} className="chip">Player page</Link>}
      {teams.map((t) => <Link key={t} to={`/team/${t}`} className="chip">{t}</Link>)}
    </div>
  );
}

function NewsCard({ n }: { n: NewsItem }) {
  return (
    <article className="article">
      <div className="small muted">
        <span className="chip">{n.cat}</span> {n.outlet} · {n.reporter}
        {n.coachStory && <span className="chip coach" style={{ marginLeft: 6 }}>Coach team</span>}
      </div>
      <h3>{n.headline}</h3>
      <p className="small">{n.body}</p>
      <Subjects teams={n.teams} playerId={n.playerId} />
    </article>
  );
}

function WrittenCard({ a }: { a: Article }) {
  return (
    <article className="article">
      <div className="small muted"><span className="chip">{a.Type}</span> League Desk</div>
      <h3>{a.Headline}</h3>
      <p className="small">{a.Summary}</p>
    </article>
  );
}

function Tweet({ t }: { t: TweetItem }) {
  return (
    <div className="tweet">
      <div className="avatar" style={{ background: colorFor(t.handle) }} aria-hidden>{t.name.slice(0, 1)}</div>
      <div className="tweet-body">
        <div className="tweet-top">
          <b>{t.name}</b>
          {t.verified && <span className="check" title="Verified (fictional)">✓</span>}
          <span className="muted"> @{t.handle} · {ago(t.minsAgo)}</span>
        </div>
        <div className="tweet-text">{t.text}</div>
        <div className="tweet-meta small muted">
          <span>💬 {compact(t.replies)}</span>
          <span>🔁 {compact(t.rts)}</span>
          <span>❤️ {compact(t.likes)}</span>
          {t.teams.map((a) => <Link key={a} to={`/team/${a}`} className="tag">#{a}</Link>)}
          {t.playerId && <Link to={`/player/${t.playerId}`} className="tag">player</Link>}
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ a, big }: { a: Article; big?: boolean }) {
  const [play, setPlay] = useState(false);
  const id = videoIdOf(a);
  return (
    <div className="hero-main">
      <div className="player">
        {play ? (
          <iframe src={embedUrl(id)} title={String(a.Headline)} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <button className="thumb" onClick={() => setPlay(true)} aria-label={`Play ${a.Headline}`} style={{ backgroundImage: `url(${thumbUrl(id)})` }}>
            <span className="playbtn">▶</span>
          </button>
        )}
      </div>
      <div className="small muted" style={{ marginTop: '.5rem' }}><span className="chip hot">{videoKindOf(a)}</span> {weekLabel(num(a.Week) ?? 0)}</div>
      <h2 className={big ? 'hero-title' : ''}>{a.Headline}</h2>
      <p className="small muted">{videoBlurb(a)}</p>
    </div>
  );
}

function VideoRow({ a }: { a: Article }) {
  return (
    <a className="vrow" href={`https://youtu.be/${videoIdOf(a)}`} target="_blank" rel="noreferrer">
      <span className="vthumb" style={{ backgroundImage: `url(${thumbUrl(videoIdOf(a))})` }}><i>▶</i></span>
      <span><small className="muted">{videoKindOf(a)}</small><br /><b>{a.Headline}</b></span>
    </a>
  );
}
