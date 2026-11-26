import { computeAll } from './scoring';
import type { Bootstrap, TeamPick } from './types';

export function hydrateBootstrap(data: Omit<Bootstrap, 'computed'> & { computed?: Bootstrap['computed'] }): Bootstrap {
  return {
    ...data,
    ok: true,
    computed: computeAll({
      players: data.players || [],
      gameweeks: data.gameweeks || [],
      matchStats: data.matchStats || [],
      picks: data.picks || [],
      scoring: data.scoring || [],
      bonuses: data.bonuses || [],
    }),
  };
}

export function applySavedPick(data: Bootstrap, pick: TeamPick): Bootstrap {
  const picks = data.picks.filter(
    (row) => !(row.managerId === pick.managerId && row.gameweekId === pick.gameweekId),
  );
  picks.push(pick);
  return hydrateBootstrap({ ...data, picks });
}

export function persistableBootstrap(data: Bootstrap) {
  const { computed: _computed, ...rest } = data;
  return rest;
}
