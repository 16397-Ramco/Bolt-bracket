export interface Player {
  id: string;
  name: string;
  seed?: number;
  poolId?: string;
}

export interface Match {
  id: string;
  round: number;
  player1?: Player;
  player2?: Player;
  winner?: Player;
  annotations?: string;
}

export interface Pool {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
}

export interface Bracket {
  rounds: Match[][];
  status: TournamentStatus;
  completionPercentage: number;
  lastSaved?: Date;
}

export type TournamentStatus = 'not_started' | 'in_progress' | 'completed' | 'archived';

export interface TournamentHistory {
  timestamp: number;
  state: TournamentState;
}

export interface TournamentState {
  players: Player[];
  pools: Pool[];
  bracket: Bracket | null;
  history: TournamentHistory[];
  historyIndex: number;
  viewMode: 'classic' | 'react-tournament';
  status: TournamentStatus;
}