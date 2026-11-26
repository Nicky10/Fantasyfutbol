import AsyncStorage from '@react-native-async-storage/async-storage';

import { BONUSES, ROSTER, SCORING } from './demo';
import { hydrateBootstrap, persistableBootstrap } from './hydrate';
import type { Bootstrap } from './types';

const KEYS = {
  bootstrap: 'dt.cache.bootstrap',
  fetchedAt: 'dt.cache.fetchedAt',
};

export const LIVE_TTL_MS = 10 * 60 * 1000;

export type LeagueCache = {
  bootstrap: Bootstrap;
  fetchedAt: number;
};

export function catalogBootstrap(): Bootstrap {
  return hydrateBootstrap({
    ok: true,
    config: {
      leagueName: 'Dark Team Fantasy',
      seasonName: '2026',
      budget: 3,
      squadSize: 4,
      benchBoostBudget: 4,
      benchBoostSize: 5,
      currentGameweekId: '',
      recommendHalfChange: true,
    },
    players: ROSTER,
    gameweeks: [],
    matchStats: [],
    picks: [],
    scoring: SCORING,
    bonuses: BONUSES,
  });
}

export async function readLeagueCache(): Promise<LeagueCache | null> {
  try {
    const [raw, at] = await Promise.all([
      AsyncStorage.getItem(KEYS.bootstrap),
      AsyncStorage.getItem(KEYS.fetchedAt),
    ]);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Omit<Bootstrap, 'computed'>;
    if (!stored?.players?.length) return null;
    return {
      bootstrap: hydrateBootstrap(stored),
      fetchedAt: Number(at) || 0,
    };
  } catch {
    return null;
  }
}

export async function writeLeagueCache(bootstrap: Bootstrap) {
  if (bootstrap.demo || !bootstrap.gameweeks?.length) return Date.now();
  const fetchedAt = Date.now();
  await Promise.all([
    AsyncStorage.setItem(KEYS.bootstrap, JSON.stringify(persistableBootstrap(bootstrap))),
    AsyncStorage.setItem(KEYS.fetchedAt, String(fetchedAt)),
  ]);
  return fetchedAt;
}

export function cacheIsFresh(fetchedAt: number) {
  return fetchedAt > 0 && Date.now() - fetchedAt < LIVE_TTL_MS;
}
