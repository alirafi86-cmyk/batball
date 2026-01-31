
export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  logo?: string;
}

export enum BallType {
  NORMAL = 'NORMAL',
  WIDE = 'WIDE',
  NO_BALL = 'NO_BALL',
}

export enum WicketType {
  BOWLED = 'BOWLED',
  CAUGHT = 'CAUGHT',
  LBW = 'LBW',
  RUN_OUT = 'RUN_OUT',
  STUMPED = 'STUMPED',
  RETIRED = 'RETIRED',
  NONE = 'NONE'
}

export interface BallEvent {
  id: string;
  runs: number;
  type: BallType;
  wicket: WicketType;
  strikerId: string;
  bowlerId: string;
  innings: 1 | 2;
  timestamp: number;
  over?: number; // Over number (0-indexed) when the ball was bowled
}

export interface MatchSettings {
  matchId: string;
  totalOvers: number;
  playersPerTeam: number;
  retirementLimit: number;
  teamA: Team;
  teamB: Team;
  scorerPin: string;
  tossWinner?: string; // Team ID
  tossDecision?: 'bat' | 'bowl';
}

export interface MatchRecord {
  id: string;
  date: number;
  settings: MatchSettings;
  history: BallEvent[];
  finalScore: {
    runs: number;
    wickets: number;
    overs: string;
    target?: number;
    winner?: string;
    teamAScore?: { runs: number; wickets: number; overs: string };
    teamBScore?: { runs: number; wickets: number; overs: string };
  };
}

export interface MatchState {
  currentInnings: 1 | 2;
  score: number;
  wickets: number;
  ballsInOver: number;
  totalBalls: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  matchHistory: BallEvent[];
  isMatchOver: boolean;
  firstInningsScore?: number;
  firstInningsWickets?: number;
  firstInningsOvers?: string;
  retiredPlayerIds: string[];
}

// Added missing BattingStats interface to resolve import errors in components
export interface BattingStats {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
}

// Added missing BowlingStats interface to resolve import errors in components
export interface BowlingStats {
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
}

// Squad management for team persistence
export interface Squad {
  id: string;
  name: string;
  players: Player[];
  createdAt: number;
  updatedAt: number;
}

// Player career statistics across all matches
export interface PlayerCareerStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  wickets: number;
  overs: number;
  innings: number;
  average: number;
  strikeRate: number;
  bestBowlingOvers: string;
  bestBowlingRuns: number;
}
