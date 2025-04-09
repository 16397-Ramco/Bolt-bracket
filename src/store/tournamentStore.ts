import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Player, 
  Pool, 
  Bracket, 
  TournamentState, 
  TournamentHistory,
  TournamentStatus 
} from '../types';

const MAX_HISTORY = 50;

const calculateCompletionPercentage = (bracket: Bracket): number => {
  if (!bracket) return 0;
  const totalMatches = bracket.rounds.reduce((sum, round) => sum + round.length, 0);
  const completedMatches = bracket.rounds.reduce((sum, round) => 
    sum + round.filter(match => match.winner).length, 0);
  return Math.round((completedMatches / totalMatches) * 100);
};

const createInitialState = (): TournamentState => ({
  players: [],
  pools: [],
  bracket: null,
  history: [],
  historyIndex: -1,
  viewMode: 'classic',
  status: 'not_started'
});

export const useTournamentStore = create(
  persist<TournamentState & {
    // Player Management
    addPlayer: (player: Player) => void;
    removePlayer: (id: string) => void;
    importPlayers: (newPlayers: Player[]) => void;
    clearPlayers: () => void;
    
    // Pool Management
    distributePools: () => void;
    
    // Bracket Management
    setBracket: (bracket: Bracket) => void;
    updateMatch: (matchId: string, winner: Player) => void;
    setAnnotation: (matchId: string, annotation: string) => void;
    
    // History Management
    undo: () => void;
    redo: () => void;
    
    // View Management
    setViewMode: (mode: 'classic' | 'react-tournament') => void;
    
    // Tournament Status
    setStatus: (status: TournamentStatus) => void;
    
    // Auto-save
    saveState: () => void;
  }>(
    (set, get) => ({
      ...createInitialState(),

      addPlayer: (player) => {
        set((state) => {
          const newState = {
            ...state,
            players: [...state.players, player],
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              { timestamp: Date.now(), state: state }
            ].slice(-MAX_HISTORY),
            historyIndex: Math.min(state.historyIndex + 1, MAX_HISTORY - 1)
          };
          return newState;
        });
      },

      removePlayer: (id) => {
        set((state) => {
          const newState = {
            ...state,
            players: state.players.filter(player => player.id !== id),
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              { timestamp: Date.now(), state: state }
            ].slice(-MAX_HISTORY),
            historyIndex: Math.min(state.historyIndex + 1, MAX_HISTORY - 1)
          };
          return newState;
        });
      },

      importPlayers: (newPlayers) => {
        set((state) => {
          const newState = {
            ...state,
            players: [...state.players, ...newPlayers],
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              { timestamp: Date.now(), state: state }
            ].slice(-MAX_HISTORY),
            historyIndex: Math.min(state.historyIndex + 1, MAX_HISTORY - 1)
          };
          return newState;
        });
      },

      clearPlayers: () => {
        set((state) => ({
          ...state,
          players: [],
          pools: [],
          bracket: null,
          status: 'not_started'
        }));
      },

      distributePools: () => {
        set((state) => {
          const playerCount = state.players.length;
          let poolCount = 1;
          
          if (playerCount <= 8) poolCount = 1;
          else if (playerCount <= 16) poolCount = 2;
          else if (playerCount <= 32) poolCount = 4;
          else poolCount = 8;

          const playersPerPool = Math.ceil(playerCount / poolCount);
          const pools: Pool[] = Array.from({ length: poolCount }, (_, i) => ({
            id: `pool-${i + 1}`,
            name: `Pool ${i + 1}`,
            players: state.players.slice(i * playersPerPool, (i + 1) * playersPerPool),
            matches: []
          }));

          return {
            ...state,
            pools,
            status: 'in_progress'
          };
        });
      },

      setBracket: (bracket) => {
        set((state) => ({
          ...state,
          bracket,
          status: 'in_progress'
        }));
      },

      updateMatch: (matchId, winner) => {
        set((state) => {
          if (!state.bracket) return state;

          const newBracket = { ...state.bracket };
          const roundIndex = newBracket.rounds.findIndex(round => 
            round.some(match => match.id === matchId)
          );
          
          if (roundIndex === -1) return state;
          
          const matchIndex = newBracket.rounds[roundIndex].findIndex(match => 
            match.id === matchId
          );
          
          newBracket.rounds[roundIndex][matchIndex].winner = winner;
          newBracket.completionPercentage = calculateCompletionPercentage(newBracket);

          return {
            ...state,
            bracket: newBracket,
            history: [
              ...state.history.slice(0, state.historyIndex + 1),
              { timestamp: Date.now(), state: state }
            ].slice(-MAX_HISTORY),
            historyIndex: Math.min(state.historyIndex + 1, MAX_HISTORY - 1)
          };
        });
      },

      setAnnotation: (matchId, annotation) => {
        set((state) => {
          if (!state.bracket) return state;

          const newBracket = { ...state.bracket };
          const roundIndex = newBracket.rounds.findIndex(round => 
            round.some(match => match.id === matchId)
          );
          
          if (roundIndex === -1) return state;
          
          const matchIndex = newBracket.rounds[roundIndex].findIndex(match => 
            match.id === matchId
          );
          
          newBracket.rounds[roundIndex][matchIndex].annotations = annotation;

          return {
            ...state,
            bracket: newBracket
          };
        });
      },

      undo: () => {
        set((state) => {
          if (state.historyIndex <= 0) return state;
          const previousState = state.history[state.historyIndex - 1].state;
          return {
            ...previousState,
            historyIndex: state.historyIndex - 1
          };
        });
      },

      redo: () => {
        set((state) => {
          if (state.historyIndex >= state.history.length - 1) return state;
          const nextState = state.history[state.historyIndex + 1].state;
          return {
            ...nextState,
            historyIndex: state.historyIndex + 1
          };
        });
      },

      setViewMode: (mode) => {
        set((state) => ({
          ...state,
          viewMode: mode
        }));
      },

      setStatus: (status) => {
        set((state) => ({
          ...state,
          status
        }));
      },

      saveState: () => {
        set((state) => {
          if (state.bracket) {
            return {
              ...state,
              bracket: {
                ...state.bracket,
                lastSaved: new Date()
              }
            };
          }
          return state;
        });
      }
    }),
    {
      name: 'tournament-storage',
      partialize: (state) => ({
        players: state.players,
        pools: state.pools,
        bracket: state.bracket,
        status: state.status,
        viewMode: state.viewMode
      })
    }
  )
);

// Set up auto-save interval
if (typeof window !== 'undefined') {
  setInterval(() => {
    useTournamentStore.getState().saveState();
  }, 60000);
}