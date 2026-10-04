import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { LeagueProvider } from './lib/league';
import './index.css';

// HashRouter keeps deep links working on GitHub Pages without a 404 redirect.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LeagueProvider>
        <App />
      </LeagueProvider>
    </HashRouter>
  </StrictMode>,
);
