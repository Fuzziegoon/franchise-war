import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchTabs, usingSampleData, verifyPassword } from './api';
import type { Article, Game, Meta, Player, Row, Team } from './types';

const CORE_TABS = ['Teams', 'Players', 'Games', 'Articles'];
const PW_KEY = 'fw-admin-pw';

interface LeagueState {
  loading: boolean;
  error: string | null;
  meta: Meta;
  season: number;
  teams: Team[];
  players: Player[];
  games: Game[];
  articles: Article[];
  sample: boolean;
  reload: () => Promise<void>;
  /** Lazily loads extra tabs (stats, history) and caches them for the session. */
  loadTab: (name: string) => Promise<Row[]>;
  extra: Record<string, Row[]>;
  admin: { password: string | null; unlock: (pw: string) => Promise<void>; lock: () => void };
}

const Ctx = createContext<LeagueState | null>(null);

const readPw = () => {
  try {
    return sessionStorage.getItem(PW_KEY);
  } catch {
    return null;
  }
};

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta>({ currentSeason: null });
  const [core, setCore] = useState<Record<string, Row[]>>({});
  const [extra, setExtra] = useState<Record<string, Row[]>>({});
  const [password, setPassword] = useState<string | null>(readPw);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchTabs(CORE_TABS);
      setMeta(r.meta);
      setCore(r.tabs);
      setExtra({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadTab = useCallback(
    async (name: string) => {
      if (extra[name]) return extra[name];
      const r = await fetchTabs([name]);
      setExtra((x) => ({ ...x, [name]: r.tabs[name] ?? [] }));
      return r.tabs[name] ?? [];
    },
    [extra],
  );

  const unlock = useCallback(async (pw: string) => {
    await verifyPassword(pw);
    setPassword(pw);
    try {
      sessionStorage.setItem(PW_KEY, pw);
    } catch {
      /* private mode: stays unlocked for this tab only */
    }
  }, []);

  const lock = useCallback(() => {
    setPassword(null);
    try {
      sessionStorage.removeItem(PW_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<LeagueState>(
    () => ({
      loading,
      error,
      meta,
      season: meta.currentSeason ?? 1,
      teams: (core.Teams ?? []) as Team[],
      players: (core.Players ?? []) as Player[],
      games: (core.Games ?? []) as Game[],
      articles: (core.Articles ?? []) as Article[],
      sample: usingSampleData,
      reload,
      loadTab,
      extra,
      admin: { password, unlock, lock },
    }),
    [loading, error, meta, core, reload, loadTab, extra, password, unlock, lock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeague() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLeague must be used inside LeagueProvider');
  return v;
}
