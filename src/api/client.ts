import { buildDemoBootstrap, demoSavePicks } from './demo';
import { hydrateBootstrap } from './hydrate';
import type { ApiError, Bootstrap, SavePicksPayload, SavePicksResponse, TeamPick } from './types';

const timeoutMs = 25000;

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The spreadsheet API did not return JSON. Redeploy the Apps Script web app as Anyone.');
  }
}

async function request(url: string, leagueKey: string, body?: Record<string, unknown>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body ? JSON.stringify({ ...body, leagueKey }) : undefined,
      redirect: 'follow',
      signal: controller.signal,
    });
    return parseJson(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBootstrap(apiUrl: string, leagueKey: string): Promise<Bootstrap> {
  if (!apiUrl.trim()) return buildDemoBootstrap();
  const url = `${apiUrl.split('?')[0]}?action=bootstrap&key=${encodeURIComponent(leagueKey)}`;
  const data = await request(url, leagueKey);
  if (!data?.ok) {
    throw new Error((data as ApiError)?.error || 'Could not load league data.');
  }
  return hydrateBootstrap(data as Bootstrap);
}

export async function savePicks(
  apiUrl: string,
  leagueKey: string,
  payload: SavePicksPayload,
): Promise<{ pick: TeamPick; bootstrap?: Bootstrap }> {
  if (!apiUrl.trim()) {
    const bootstrap = demoSavePicks(payload);
    const pick = bootstrap.picks.find(
      (row) => row.managerId === payload.managerId && row.gameweekId === payload.gameweekId,
    );
    if (!pick) throw new Error('Could not save your team.');
    return { pick, bootstrap };
  }
  const data = await request(apiUrl.split('?')[0], leagueKey, {
    action: 'savePicks',
    ...payload,
  });
  if (!data?.ok) {
    throw new Error((data as ApiError)?.error || 'Could not save your team.');
  }
  if (data.pick) {
    return { pick: (data as SavePicksResponse).pick };
  }
  if (data.players) {
    const bootstrap = hydrateBootstrap(data as Bootstrap);
    const pick = bootstrap.picks.find(
      (row) => row.managerId === payload.managerId && row.gameweekId === payload.gameweekId,
    );
    if (!pick) throw new Error('Could not save your team.');
    return { pick, bootstrap };
  }
  throw new Error('Could not save your team.');
}

export async function testConnection(apiUrl: string, leagueKey: string) {
  if (!apiUrl.trim()) return { ok: true, demo: true, leagueName: 'Dark Team Fantasy (demo)' };
  const url = `${apiUrl.split('?')[0]}?action=health&key=${encodeURIComponent(leagueKey)}`;
  const data = await request(url, leagueKey);
  if (!data?.ok) throw new Error(data?.error || 'Connection failed.');
  return data;
}
