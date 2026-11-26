export type Position = 'GK' | 'DEF' | 'MID' | 'ATK' | 'SUB';
export type Chip = 'none' | 'triple_captain' | 'bench_boost';
export type GameweekStatus = 'upcoming' | 'live' | 'finished' | 'locked';

export type Player = {
  id: string;
  name: string;
  position: Position;
  price: number;
  isSub: boolean;
  shirt: number;
  active: boolean;
};

export type Gameweek = {
  id: string;
  number: number;
  name: string;
  opponent: string;
  kickoff: string;
  deadline: string;
  status: GameweekStatus;
  goalsFor: number | null;
  goalsAgainst: number | null;
  venue: string;
  notes: string;
  youtubeUrl: string;
};

export type MatchStat = {
  gameweekId: string;
  playerId: string;
  played: boolean;
  goals: number;
  assists: number;
  defCons: number;
  inFieldGoals: number;
  yellowCards: number;
  redCards: number;
  missedPenalties: number;
  errorsLedToGoal: number;
  motm: boolean;
  secondMvp: boolean;
  recognitionPoints: number;
  winningGoal: boolean;
  winningDc: boolean | null;
};

export type TeamPick = {
  gameweekId: string;
  managerId: string;
  playerIds: string[];
  captainId: string;
  chip: Chip;
  submittedAt: string;
};

export type BreakdownItem = {
  label: string;
  value: number;
};

export type PlayerGwScore = {
  playerId: string;
  gameweekId: string;
  points: number;
  breakdown: BreakdownItem[];
};

export type PlayerSeasonRow = {
  playerId: string;
  name: string;
  position: Position;
  price: number;
  isSub: boolean;
  played: number;
  goals: number;
  assists: number;
  defCons: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  motm: number;
  points: number;
  form: number;
};

export type FantasyRow = {
  managerId: string;
  name: string;
  position: Position;
  gameweekPoints: number;
  totalPoints: number;
  lastGameweekPoints: number;
  chipsUsed: Chip[];
  teamValue: number;
  picked: boolean;
};

export type PositionScoring = {
  position: Position;
  goalPts: number;
  assistPts: number;
  dcPerPoint: number;
  cleanSheetPts: number;
  inFieldGoalBonus: number;
  concedePerMinus: number;
};

export type BonusRule = {
  event: string;
  points: number;
  notes: string;
};

export type LeagueConfig = {
  leagueName: string;
  seasonName: string;
  budget: number;
  squadSize: number;
  benchBoostBudget: number;
  benchBoostSize: number;
  currentGameweekId: string;
  recommendHalfChange: boolean;
};

export type Bootstrap = {
  ok: true;
  demo?: boolean;
  config: LeagueConfig;
  players: Player[];
  gameweeks: Gameweek[];
  matchStats: MatchStat[];
  picks: TeamPick[];
  scoring: PositionScoring[];
  bonuses: BonusRule[];
  computed: {
    playerGameweekPoints: PlayerGwScore[];
    playerSeason: PlayerSeasonRow[];
    fantasyStandings: FantasyRow[];
  };
};

export type ApiError = {
  ok: false;
  error: string;
};

export type SavePicksPayload = {
  managerId: string;
  gameweekId: string;
  playerIds: string[];
  captainId: string;
  chip: Chip;
};

export type SavePicksResponse = {
  ok: true;
  pick: TeamPick;
};
