import type {
  BonusRule,
  BreakdownItem,
  Chip,
  FantasyRow,
  Gameweek,
  MatchStat,
  Player,
  PlayerGwScore,
  PlayerSeasonRow,
  PositionScoring,
  TeamPick,
} from './types';

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const truthy = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'x';
};

export const pickLockAt = (gameweek?: { deadline?: string; kickoff?: string } | null) =>
  gameweek?.deadline || gameweek?.kickoff || '';

export const picksOpen = (gameweek?: { deadline?: string; kickoff?: string; status?: string } | null) => {
  if (!gameweek) return false;
  if (gameweek.status === 'finished' || gameweek.status === 'locked') return false;
  const lockAt = pickLockAt(gameweek);
  if (!lockAt) return true;
  const time = new Date(lockAt).getTime();
  return Number.isFinite(time) ? Date.now() <= time : true;
};

export const chipMultiplier = (chip: Chip, isCaptain: boolean) => {
  if (!isCaptain) return 1;
  return chip === 'triple_captain' ? 3 : 2;
};

export const squadLimits = (chip: Chip, budget: number, size: number, bbBudget: number, bbSize: number) => {
  if (chip === 'bench_boost') {
    return { budget: bbBudget, size: bbSize };
  }
  return { budget, size };
};

export function scorePlayerGameweek(
  player: Player,
  stats: MatchStat | undefined,
  gameweek: Gameweek,
  scoring: PositionScoring[],
  bonuses: BonusRule[],
): PlayerGwScore {
  const empty: PlayerGwScore = { playerId: player.id, gameweekId: gameweek.id, points: 0, breakdown: [] };
  if (!stats || !stats.played) return empty;

  const rule =
    scoring.find((row) => row.position === player.position) ||
    scoring.find((row) => row.position === 'MID');
  if (!rule) return empty;

  const bonusMap = Object.fromEntries(bonuses.map((b) => [b.event, b.points]));
  const breakdown: BreakdownItem[] = [];
  let points = 0;

  const add = (label: string, value: number) => {
    if (!value) return;
    points += value;
    breakdown.push({ label, value });
  };

  add('Goals', stats.goals * rule.goalPts);
  add('Assists', stats.assists * rule.assistPts);
  add('Defensive contributions', Math.floor(stats.defCons / Math.max(rule.dcPerPoint, 1)));
  add('In-field goals', stats.inFieldGoals * rule.inFieldGoalBonus);

  const teamReady = gameweek.goalsFor !== null && gameweek.goalsAgainst !== null;
  if (teamReady) {
    const gf = num(gameweek.goalsFor);
    const ga = num(gameweek.goalsAgainst);
    if (ga === 0) add('Clean sheet', rule.cleanSheetPts);
    if (ga > 0) add('Goals conceded', -Math.floor(ga / Math.max(rule.concedePerMinus, 1)));

    const won = gf > ga;
    const winningDc = stats.winningDc === null ? won && stats.defCons > 0 : stats.winningDc;
    if (winningDc) add('Winning-game DC', bonusMap.winning_dc ?? 2);
  }

  add('Yellow card', stats.yellowCards * (bonusMap.yellow ?? -1));
  add('Red card', stats.redCards * (bonusMap.red ?? -3));
  add('Missed penalty', stats.missedPenalties * (bonusMap.missed_penalty ?? -2));
  add('Error leading to goal', stats.errorsLedToGoal * (bonusMap.error_goal ?? -1));
  if (stats.motm) add('Man of the match', bonusMap.motm ?? 3);
  if (stats.secondMvp) add('Second MVP', bonusMap.second_mvp ?? 2);
  add('Recognition', stats.recognitionPoints * (bonusMap.recognition ?? 1));
  if (stats.winningGoal) add('Winning goal', bonusMap.winning_goal ?? 2);

  return { playerId: player.id, gameweekId: gameweek.id, points, breakdown };
}

export function computeAll(input: {
  players: Player[];
  gameweeks: Gameweek[];
  matchStats: MatchStat[];
  picks: TeamPick[];
  scoring: PositionScoring[];
  bonuses: BonusRule[];
}) {
  const { players, gameweeks, matchStats, picks, scoring, bonuses } = input;
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]));
  const gwById = Object.fromEntries(gameweeks.map((g) => [g.id, g]));

  const playerGameweekPoints: PlayerGwScore[] = [];
  for (const gw of gameweeks) {
    for (const player of players) {
      const stats = matchStats.find((s) => s.gameweekId === gw.id && s.playerId === player.id);
      playerGameweekPoints.push(scorePlayerGameweek(player, stats, gw, scoring, bonuses));
    }
  }

  const pointsMap = new Map<string, PlayerGwScore>();
  playerGameweekPoints.forEach((row) => pointsMap.set(`${row.gameweekId}:${row.playerId}`, row));

  const finishedIds = gameweeks.filter((g) => g.status === 'finished').map((g) => g.id);
  const lastThree = gameweeks.slice().sort((a, b) => a.number - b.number).slice(-3).map((g) => g.id);

  const playerSeason: PlayerSeasonRow[] = players.map((player) => {
    const rows = matchStats.filter((s) => s.playerId === player.id);
    const seasonPoints = playerGameweekPoints
      .filter((r) => r.playerId === player.id && finishedIds.includes(r.gameweekId))
      .reduce((sum, r) => sum + r.points, 0);
    const form = playerGameweekPoints
      .filter((r) => r.playerId === player.id && lastThree.includes(r.gameweekId))
      .reduce((sum, r) => sum + r.points, 0);
    const cleanSheets = rows.filter((s) => {
      const gw = gwById[s.gameweekId];
      return s.played && gw && gw.goalsAgainst === 0 && gw.goalsFor !== null;
    }).length;
    return {
      playerId: player.id,
      name: player.name,
      position: player.position,
      price: player.price,
      isSub: player.isSub,
      played: rows.filter((s) => s.played).length,
      goals: rows.reduce((sum, s) => sum + s.goals, 0),
      assists: rows.reduce((sum, s) => sum + s.assists, 0),
      defCons: rows.reduce((sum, s) => sum + s.defCons, 0),
      cleanSheets,
      yellowCards: rows.reduce((sum, s) => sum + s.yellowCards, 0),
      redCards: rows.reduce((sum, s) => sum + s.redCards, 0),
      motm: rows.filter((s) => s.motm).length,
      points: seasonPoints,
      form,
    };
  });

  const current = gameweeks.find((g) => g.status === 'live') ||
    gameweeks.filter((g) => g.status === 'finished').sort((a, b) => b.number - a.number)[0] ||
    gameweeks[0];
  const previous = current
    ? gameweeks.filter((g) => g.number < current.number && g.status === 'finished').sort((a, b) => b.number - a.number)[0]
    : undefined;

  const managers = players.filter((p) => !p.isSub && p.active);

  const fantasyScore = (pick: TeamPick) => {
    return pick.playerIds.reduce((sum, playerId) => {
      const row = pointsMap.get(`${pick.gameweekId}:${playerId}`);
      const pts = row ? row.points : 0;
      return sum + pts * chipMultiplier(pick.chip, playerId === pick.captainId);
    }, 0);
  };

  const fantasyStandings: FantasyRow[] = managers.map((manager) => {
    const mine = picks.filter((p) => p.managerId === manager.id);
    const totalPoints = mine
      .filter((p) => finishedIds.includes(p.gameweekId))
      .reduce((sum, p) => sum + fantasyScore(p), 0);
    const currentPick = current ? mine.find((p) => p.gameweekId === current.id) : undefined;
    const previousPick = previous ? mine.find((p) => p.gameweekId === previous.id) : undefined;
    const teamValue = (currentPick?.playerIds || []).reduce((sum, id) => sum + (playerById[id]?.price || 0), 0);
    return {
      managerId: manager.id,
      name: manager.name,
      position: manager.position,
      gameweekPoints: currentPick ? fantasyScore(currentPick) : 0,
      totalPoints,
      lastGameweekPoints: previousPick ? fantasyScore(previousPick) : 0,
      chipsUsed: mine.filter((p) => p.chip !== 'none').map((p) => p.chip),
      teamValue: Number(teamValue.toFixed(2)),
      picked: Boolean(currentPick),
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.gameweekPoints - a.gameweekPoints || a.name.localeCompare(b.name));

  return { playerGameweekPoints, playerSeason, fantasyStandings };
}

export function validatePicks(input: {
  managerId: string;
  gameweekId: string;
  playerIds: string[];
  captainId: string;
  chip: Chip;
  players: Player[];
  gameweeks: Gameweek[];
  picks: TeamPick[];
  budget: number;
  squadSize: number;
  benchBoostBudget: number;
  benchBoostSize: number;
}) {
  const errors: string[] = [];
  const manager = input.players.find((p) => p.id === input.managerId);
  const gameweek = input.gameweeks.find((g) => g.id === input.gameweekId);
  if (!manager || manager.isSub) errors.push('Choose a Dark Team player to manage a squad.');
  if (!gameweek) errors.push('That gameweek does not exist.');
  if (gameweek && (gameweek.status === 'finished' || gameweek.status === 'locked')) {
    errors.push('Picks are locked for this gameweek.');
  }
  const lockAt = pickLockAt(gameweek);
  if (lockAt && Date.now() > new Date(lockAt).getTime()) {
    errors.push('Kickoff has started. Squads are locked.');
  }

  const limits = squadLimits(input.chip, input.budget, input.squadSize, input.benchBoostBudget, input.benchBoostSize);
  const unique = Array.from(new Set(input.playerIds.filter(Boolean)));
  if (unique.length !== input.playerIds.length) errors.push('You cannot pick the same player twice.');
  if (unique.length !== limits.size) errors.push(`Select exactly ${limits.size} players.`);

  const selected = unique.map((id) => input.players.find((p) => p.id === id));
  if (selected.some((p) => !p)) errors.push('One of the selected players is invalid.');
  const cost = selected.reduce((sum, p) => sum + (p?.price || 0), 0);
  if (cost - limits.budget > 0.001) errors.push(`Squad costs $${cost.toFixed(2)}. Budget is $${limits.budget.toFixed(1)}.`);
  if (manager && unique.includes(manager.id)) errors.push('You cannot pick yourself.');
  if (!unique.includes(input.captainId)) errors.push('Captain must be one of your selected players.');

  const previous = input.gameweeks
    .filter((g) => gameweek && g.number < gameweek.number)
    .sort((a, b) => b.number - a.number)[0];
  if (previous) {
    const lastPick = input.picks.find((p) => p.managerId === input.managerId && p.gameweekId === previous.id);
    if (lastPick && lastPick.captainId === input.captainId) {
      const name = input.players.find((p) => p.id === lastPick.captainId)?.name || lastPick.captainId;
      errors.push(`You captained ${name} last week. Choose a different captain.`);
    }
  }

  if (input.chip !== 'none') {
    const used = input.picks.some(
      (p) => p.managerId === input.managerId && p.chip === input.chip && p.gameweekId !== input.gameweekId,
    );
    if (used) errors.push('That chip has already been used this season.');
  }

  return { ok: errors.length === 0, errors, cost: Number(cost.toFixed(2)), limits };
}
