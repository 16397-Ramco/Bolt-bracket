import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { PlayerInput } from './components/PlayerInput';
import { Bracket } from './components/Bracket';
import {
  generateBracket,
  updateBracketWithWinner,
} from './utils/bracketGenerator';
import type { Player, Bracket as BracketType } from './types';

function App() {
  const [bracket, setBracket] = useState<BracketType | null>(null);

  const handleGenerateBracket = (players: Player[]) => {
    setBracket(generateBracket(players));
  };

  const handleWinnerSelect = (matchId: string, winnerId: string) => {
    if (bracket) {
      const updatedBracket = updateBracketWithWinner(
        bracket,
        matchId,
        winnerId
      );
      setBracket(updatedBracket);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Tournament Bracket Generator
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!bracket ? (
          <PlayerInput onGenerateBracket={handleGenerateBracket} />
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Tournament Bracket
                  <span className="text-gray-600 px-2 ">
                    {bracket.rounds[0].length * 2}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setBracket(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                New Tournament
              </button>
            </div>
            <div className="overflow-x-auto">
              <Bracket
                rounds={bracket.rounds}
                onWinnerSelect={handleWinnerSelect}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
