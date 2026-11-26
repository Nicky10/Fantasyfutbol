import { computeAll } from './scoring';
import type { BonusRule, Bootstrap, Gameweek, MatchStat, Player, PositionScoring, TeamPick } from './types';

export const ROSTER: Player[] = [
  { id: 'richi', name: 'Richi', position: 'ATK', price: 1.1, isSub: false, shirt: 9, active: true },
  { id: 'nick', name: 'Nick', position: 'ATK', price: 0.8, isSub: false, shirt: 10, active: true },
  { id: 'shane', name: 'Shane', position: 'MID', price: 0.9, isSub: false, shirt: 8, active: true },
  { id: 'mario', name: 'Mario', position: 'MID', price: 0.8, isSub: false, shirt: 7, active: true },
  { id: 'juan', name: 'Juan', position: 'MID', price: 0.7, isSub: false, shirt: 11, active: true },
  { id: 'nico', name: 'Nico', position: 'MID', price: 0.7, isSub: false, shirt: 6, active: true },
  { id: 'hiro', name: 'Hiro', position: 'MID', price: 0.6, isSub: false, shirt: 14, active: true },
  { id: 'bryan', name: 'Bryan', position: 'MID', price: 0.5, isSub: false, shirt: 17, active: true },
  { id: 'erwin', name: 'Erwin', position: 'DEF', price: 0.9, isSub: false, shirt: 4, active: true },
  { id: 'julian', name: 'Julian', position: 'DEF', price: 0.7, isSub: false, shirt: 5, active: true },
  { id: 'patrick', name: 'Patrick', position: 'DEF', price: 0.6, isSub: false, shirt: 3, active: true },
  { id: 'ume', name: 'Ume', position: 'DEF', price: 0.5, isSub: false, shirt: 2, active: true },
  { id: 'vidur', name: 'Vidur', position: 'GK', price: 0.5, isSub: false, shirt: 1, active: true },
  { id: 'sub', name: 'Sub', position: 'SUB', price: 0.4, isSub: true, shirt: 99, active: true },
];

export const SCORING: PositionScoring[] = [
  { position: 'GK', goalPts: 6, assistPts: 6, dcPerPoint: 4, cleanSheetPts: 7, inFieldGoalBonus: 0, concedePerMinus: 3 },
  { position: 'DEF', goalPts: 5, assistPts: 4, dcPerPoint: 6, cleanSheetPts: 6, inFieldGoalBonus: 4, concedePerMinus: 2 },
  { position: 'MID', goalPts: 4, assistPts: 3, dcPerPoint: 6, cleanSheetPts: 3, inFieldGoalBonus: 3, concedePerMinus: 2 },
  { position: 'ATK', goalPts: 3, assistPts: 3, dcPerPoint: 4, cleanSheetPts: 2, inFieldGoalBonus: 2, concedePerMinus: 2 },
];

export const BONUSES: BonusRule[] = [
  { event: 'yellow', points: -1, notes: 'Yellow card' },
  { event: 'red', points: -3, notes: 'Red card' },
  { event: 'missed_penalty', points: -2, notes: 'Missing a penalty' },
  { event: 'error_goal', points: -1, notes: 'Losing a ball that ends in a goal' },
  { event: 'motm', points: 3, notes: 'Man of the match' },
  { event: 'second_mvp', points: 2, notes: 'Second place MVP' },
  { event: 'recognition', points: 1, notes: 'Any recognition point' },
  { event: 'winning_goal', points: 2, notes: 'Scoring the winning goal' },
  { event: 'winning_dc', points: 2, notes: 'Making a DC in a winning game' },
];

const iso = (daysFromNow: number, hour = 20) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const GAMEWEEKS: Gameweek[] = [
  {
    id: 'gw1',
    number: 1,
    name: 'Gameweek 1',
    opponent: 'Northside FC',
    kickoff: iso(-21, 21),
    deadline: iso(-21, 21),
    status: 'finished',
    goalsFor: 4,
    goalsAgainst: 2,
    venue: 'Home',
    notes: 'Opening night',
    youtubeUrl: '',
  },
  {
    id: 'gw2',
    number: 2,
    name: 'Gameweek 2',
    opponent: 'Harbor United',
    kickoff: iso(-7, 21),
    deadline: iso(-7, 21),
    status: 'finished',
    goalsFor: 2,
    goalsAgainst: 0,
    venue: 'Away',
    notes: '',
    youtubeUrl: '',
  },
  {
    id: 'gw3',
    number: 3,
    name: 'Gameweek 3',
    opponent: 'Ironworks',
    kickoff: iso(5, 21),
    deadline: iso(5, 21),
    status: 'upcoming',
    goalsFor: null,
    goalsAgainst: null,
    venue: 'Home',
    notes: '',
    youtubeUrl: '',
  },
];

const stat = (partial: Partial<MatchStat> & Pick<MatchStat, 'gameweekId' | 'playerId'>): MatchStat => ({
  played: true,
  goals: 0,
  assists: 0,
  defCons: 0,
  inFieldGoals: 0,
  yellowCards: 0,
  redCards: 0,
  missedPenalties: 0,
  errorsLedToGoal: 0,
  motm: false,
  secondMvp: false,
  recognitionPoints: 0,
  winningGoal: false,
  winningDc: null,
  ...partial,
});

const MATCH_STATS: MatchStat[] = [
  stat({ gameweekId: 'gw1', playerId: 'richi', goals: 2, inFieldGoals: 2, winningGoal: true, motm: true, defCons: 2 }),
  stat({ gameweekId: 'gw1', playerId: 'nick', goals: 1, assists: 1, inFieldGoals: 1, defCons: 1 }),
  stat({ gameweekId: 'gw1', playerId: 'shane', assists: 2, defCons: 7, recognitionPoints: 1 }),
  stat({ gameweekId: 'gw1', playerId: 'mario', goals: 1, inFieldGoals: 1, defCons: 4, yellowCards: 1 }),
  stat({ gameweekId: 'gw1', playerId: 'juan', assists: 1, defCons: 6 }),
  stat({ gameweekId: 'gw1', playerId: 'nico', defCons: 8, secondMvp: true }),
  stat({ gameweekId: 'gw1', playerId: 'hiro', defCons: 3 }),
  stat({ gameweekId: 'gw1', playerId: 'bryan', played: false }),
  stat({ gameweekId: 'gw1', playerId: 'erwin', defCons: 12, assists: 1 }),
  stat({ gameweekId: 'gw1', playerId: 'julian', defCons: 9 }),
  stat({ gameweekId: 'gw1', playerId: 'patrick', defCons: 6, yellowCards: 1 }),
  stat({ gameweekId: 'gw1', playerId: 'ume', defCons: 5 }),
  stat({ gameweekId: 'gw1', playerId: 'vidur', defCons: 4 }),
  stat({ gameweekId: 'gw2', playerId: 'richi', goals: 1, inFieldGoals: 1, defCons: 1 }),
  stat({ gameweekId: 'gw2', playerId: 'nick', assists: 1, defCons: 2 }),
  stat({ gameweekId: 'gw2', playerId: 'shane', goals: 1, inFieldGoals: 1, assists: 1, motm: true, defCons: 6 }),
  stat({ gameweekId: 'gw2', playerId: 'mario', defCons: 8, recognitionPoints: 1 }),
  stat({ gameweekId: 'gw2', playerId: 'juan', defCons: 5 }),
  stat({ gameweekId: 'gw2', playerId: 'nico', assists: 1, defCons: 9, secondMvp: true }),
  stat({ gameweekId: 'gw2', playerId: 'hiro', defCons: 4 }),
  stat({ gameweekId: 'gw2', playerId: 'bryan', defCons: 6 }),
  stat({ gameweekId: 'gw2', playerId: 'erwin', defCons: 14 }),
  stat({ gameweekId: 'gw2', playerId: 'julian', defCons: 11 }),
  stat({ gameweekId: 'gw2', playerId: 'patrick', defCons: 7 }),
  stat({ gameweekId: 'gw2', playerId: 'ume', played: false }),
  stat({ gameweekId: 'gw2', playerId: 'vidur', defCons: 8 }),
];

const PICKS: TeamPick[] = [
  { gameweekId: 'gw1', managerId: 'nico', playerIds: ['richi', 'erwin', 'shane', 'vidur'], captainId: 'richi', chip: 'none', submittedAt: iso(-22) },
  { gameweekId: 'gw1', managerId: 'richi', playerIds: ['shane', 'erwin', 'nick', 'vidur'], captainId: 'shane', chip: 'none', submittedAt: iso(-22) },
  { gameweekId: 'gw1', managerId: 'shane', playerIds: ['richi', 'nico', 'erwin', 'vidur'], captainId: 'erwin', chip: 'none', submittedAt: iso(-22) },
  { gameweekId: 'gw1', managerId: 'nick', playerIds: ['richi', 'mario', 'julian', 'vidur'], captainId: 'richi', chip: 'none', submittedAt: iso(-22) },
  { gameweekId: 'gw2', managerId: 'nico', playerIds: ['shane', 'erwin', 'mario', 'vidur'], captainId: 'shane', chip: 'none', submittedAt: iso(-8) },
  { gameweekId: 'gw2', managerId: 'richi', playerIds: ['nico', 'erwin', 'nick', 'vidur'], captainId: 'erwin', chip: 'none', submittedAt: iso(-8) },
  { gameweekId: 'gw2', managerId: 'shane', playerIds: ['richi', 'nico', 'julian', 'vidur'], captainId: 'richi', chip: 'none', submittedAt: iso(-8) },
  { gameweekId: 'gw2', managerId: 'nick', playerIds: ['shane', 'erwin', 'juan', 'vidur'], captainId: 'shane', chip: 'triple_captain', submittedAt: iso(-8) },
  { gameweekId: 'gw3', managerId: 'nico', playerIds: ['richi', 'erwin', 'shane', 'vidur'], captainId: 'erwin', chip: 'none', submittedAt: iso(-1) },
];

let livePicks = [...PICKS];

export function buildDemoBootstrap(): Bootstrap {
  const computed = computeAll({
    players: ROSTER,
    gameweeks: GAMEWEEKS,
    matchStats: MATCH_STATS,
    picks: livePicks,
    scoring: SCORING,
    bonuses: BONUSES,
  });
  return {
    ok: true,
    demo: true,
    config: {
      leagueName: 'Dark Team Fantasy',
      seasonName: '2026',
      budget: 3,
      squadSize: 4,
      benchBoostBudget: 4,
      benchBoostSize: 5,
      currentGameweekId: 'gw3',
      recommendHalfChange: true,
    },
    players: ROSTER,
    gameweeks: GAMEWEEKS,
    matchStats: MATCH_STATS,
    picks: livePicks,
    scoring: SCORING,
    bonuses: BONUSES,
    computed,
  };
}

export function demoSavePicks(payload: {
  managerId: string;
  gameweekId: string;
  playerIds: string[];
  captainId: string;
  chip: TeamPick['chip'];
}) {
  livePicks = livePicks.filter(
    (p) => !(p.managerId === payload.managerId && p.gameweekId === payload.gameweekId),
  );
  livePicks.push({ ...payload, submittedAt: new Date().toISOString() });
  return buildDemoBootstrap();
}

export function resetDemoPicks() {
  livePicks = [...PICKS];
}
