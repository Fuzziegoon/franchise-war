import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { useLeague } from './lib/league';
import Home from './pages/Home';
import Standings from './pages/Standings';
import Teams from './pages/Teams';
import TeamPage from './pages/TeamPage';
import PlayerPage from './pages/PlayerPage';
import Leaders from './pages/Leaders';
import Admin from './pages/Admin';
import Ticker from './components/Ticker';

export default function App() {
  const { loading, error, season, sample, admin, meta } = useLeague();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <img src="./favicon.svg" width={22} height={22} alt="" />
            <span>
              THE LEAGUE <b>LEAK</b>
            </span>
          </Link>
          <nav className="nav">
            <NavLink to="/" end>News &amp; Twatter</NavLink>
            <NavLink to="/standings">Standings</NavLink>
            <NavLink to="/teams">Teams</NavLink>
            <NavLink to="/leaders">Leaders</NavLink>
            <NavLink to="/admin">{admin.password ? 'Admin ●' : 'Admin'}</NavLink>
          </nav>
          <span className="season-pill">Season {season}</span>
        </div>
      </header>
      <Ticker />
      <main>
        {sample && (
          <div className="banner">
            Sample data: this build isn't connected to the league Sheet yet. Set <code>VITE_API_URL</code> to the Apps
            Script web-app URL to go live.
          </div>
        )}
        {error && (
          <div className="banner error">
            Couldn't load the league Sheet: {error}
          </div>
        )}
        {loading && !meta.readAt && !sample ? (
          <p className="muted">Loading the league…</p>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/team/:abbr" element={<TeamPage />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/leaders" element={<Leaders />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<p>Page not found.</p>} />
          </Routes>
        )}
      </main>
    </>
  );
}
