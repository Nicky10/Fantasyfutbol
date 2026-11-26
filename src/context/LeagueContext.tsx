import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { cacheIsFresh, catalogBootstrap, readLeagueCache, writeLeagueCache } from '@/src/api/cache';
import { fetchBootstrap, savePicks as savePicksRequest } from '@/src/api/client';
import { DEFAULT_API_URL, DEFAULT_LEAGUE_KEY } from '@/src/api/config';
import { applySavedPick } from '@/src/api/hydrate';
import type { Bootstrap, Chip, Player, SavePicksPayload } from '@/src/api/types';

const KEYS = {
  apiUrl: 'dt.apiUrl',
  leagueKey: 'dt.leagueKey',
  managerId: 'dt.managerId',
};

type LeagueContextValue = {
  ready: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  apiUrl: string;
  leagueKey: string;
  managerId: string | null;
  picking: boolean;
  data: Bootstrap | null;
  me: Player | null;
  setConnection: (apiUrl: string, leagueKey: string) => Promise<void>;
  setManager: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  savePicks: (payload: Omit<SavePicksPayload, 'managerId'>) => Promise<void>;
};

const LeagueContext = createContext<LeagueContextValue | null>(null);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [leagueKey, setLeagueKey] = useState(DEFAULT_LEAGUE_KEY);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [data, setData] = useState<Bootstrap | null>(null);
  const fetchedAtRef = useRef(0);
  const dataRef = useRef<Bootstrap | null>(null);
  const syncingRef = useRef<Promise<Bootstrap | null> | null>(null);

  const setCachedData = useCallback((next: Bootstrap | null) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const sync = useCallback(async (url: string, key: string, opts?: { force?: boolean; silent?: boolean }) => {
    if (!url.trim()) {
      const demo = await fetchBootstrap('', '');
      setCachedData(demo);
      return demo;
    }
    if (syncingRef.current) return syncingRef.current;
    if (!opts?.force && cacheIsFresh(fetchedAtRef.current) && dataRef.current && !dataRef.current.demo) {
      return dataRef.current;
    }

    const run = (async () => {
      if (!opts?.silent) setRefreshing(true);
      setError(null);
      try {
        const bootstrap = await fetchBootstrap(url, key);
        setCachedData(bootstrap);
        fetchedAtRef.current = await writeLeagueCache(bootstrap);
        return bootstrap;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load the league.';
        if (!dataRef.current || !dataRef.current.players.length) setError(message);
        else setError(null);
        throw err;
      } finally {
        setRefreshing(false);
        setLoading(false);
        syncingRef.current = null;
      }
    })();

    syncingRef.current = run;
    return run;
  }, [setCachedData]);

  useEffect(() => {
    (async () => {
      const [storedUrl, storedKey, manager, cached] = await Promise.all([
        AsyncStorage.getItem(KEYS.apiUrl),
        AsyncStorage.getItem(KEYS.leagueKey),
        AsyncStorage.getItem(KEYS.managerId),
        readLeagueCache(),
      ]);
      const url = storedUrl || DEFAULT_API_URL;
      const key = storedKey || DEFAULT_LEAGUE_KEY;
      setApiUrl(url);
      setLeagueKey(key);
      setManagerId(manager);

      if (cached) {
        fetchedAtRef.current = cached.fetchedAt;
        setCachedData(cached.bootstrap);
      } else {
        setCachedData(catalogBootstrap());
      }
      setReady(true);

      if (!cached || !cacheIsFresh(cached.fetchedAt)) {
        try {
          await sync(url, key, { silent: true, force: !cached });
        } catch {
          // Keep the on-device roster / last league snapshot.
        }
      }
    })();
  }, [setCachedData, sync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (cacheIsFresh(fetchedAtRef.current)) return;
      sync(apiUrl, leagueKey, { silent: true }).catch(() => undefined);
    });
    return () => sub.remove();
  }, [apiUrl, leagueKey, sync]);

  const setConnection = useCallback(async (nextUrl: string, nextKey: string) => {
    await AsyncStorage.setItem(KEYS.apiUrl, nextUrl.trim());
    await AsyncStorage.setItem(KEYS.leagueKey, nextKey.trim());
    setApiUrl(nextUrl.trim());
    setLeagueKey(nextKey.trim());
    fetchedAtRef.current = 0;
    await sync(nextUrl.trim(), nextKey.trim(), { force: true });
  }, [sync]);

  const setManager = useCallback(async (id: string) => {
    setPicking(false);
    setManagerId(id);
    await AsyncStorage.setItem(KEYS.managerId, id);
  }, []);

  const signOut = useCallback(async () => {
    setPicking(true);
    setManagerId(null);
    await AsyncStorage.removeItem(KEYS.managerId);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await sync(apiUrl, leagueKey, { force: true });
    } catch {
      // Cached league data stays on screen.
    }
  }, [apiUrl, leagueKey, sync]);

  const savePicks = useCallback(async (payload: Omit<SavePicksPayload, 'managerId'>) => {
    if (!managerId) throw new Error('Pick who you are first.');
    const current = dataRef.current;
    if (!current) throw new Error('League data is not ready yet.');
    const optimisticPick = {
      ...payload,
      managerId,
      submittedAt: new Date().toISOString(),
    };
    const optimistic = applySavedPick(current, optimisticPick);
    setCachedData(optimistic);
    await writeLeagueCache(optimistic);

    try {
      const result = await savePicksRequest(apiUrl, leagueKey, { ...payload, managerId });
      const next = result.bootstrap || applySavedPick(optimistic, result.pick);
      setCachedData(next);
      fetchedAtRef.current = await writeLeagueCache(next);
    } catch (err) {
      setCachedData(current);
      await writeLeagueCache(current);
      throw err;
    }
  }, [apiUrl, leagueKey, managerId, setCachedData]);

  const me = useMemo(
    () => data?.players.find((p) => p.id === managerId) || null,
    [data, managerId],
  );

  const value = useMemo<LeagueContextValue>(
    () => ({
      ready,
      loading,
      refreshing,
      error,
      apiUrl,
      leagueKey,
      managerId,
      picking,
      data,
      me,
      setConnection,
      setManager,
      signOut,
      refresh,
      savePicks,
    }),
    [ready, loading, refreshing, error, apiUrl, leagueKey, managerId, picking, data, me, setConnection, setManager, signOut, refresh, savePicks],
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used inside LeagueProvider');
  return ctx;
}

export function currentGameweek(data: Bootstrap | null) {
  if (!data) return undefined;
  return (
    data.gameweeks.find((g) => g.id === data.config.currentGameweekId) ||
    data.gameweeks.find((g) => g.status === 'upcoming') ||
    data.gameweeks.find((g) => g.status === 'live') ||
    data.gameweeks[data.gameweeks.length - 1]
  );
}

export function pickFor(data: Bootstrap | null, managerId: string | null, gameweekId?: string) {
  if (!data || !managerId || !gameweekId) return undefined;
  return data.picks.find((p) => p.managerId === managerId && p.gameweekId === gameweekId);
}

export function lastCaptain(data: Bootstrap | null, managerId: string | null, gameweekId?: string) {
  if (!data || !managerId || !gameweekId) return undefined;
  const gw = data.gameweeks.find((g) => g.id === gameweekId);
  if (!gw) return undefined;
  const previous = data.gameweeks
    .filter((g) => g.number < gw.number)
    .sort((a, b) => b.number - a.number)[0];
  if (!previous) return undefined;
  return data.picks.find((p) => p.managerId === managerId && p.gameweekId === previous.id)?.captainId;
}

export function chipsRemaining(data: Bootstrap | null, managerId: string | null) {
  const used = new Set(
    (data?.picks || [])
      .filter((p) => p.managerId === managerId && p.chip !== 'none')
      .map((p) => p.chip as Chip),
  );
  return {
    triple_captain: !used.has('triple_captain'),
    bench_boost: !used.has('bench_boost'),
  };
}
