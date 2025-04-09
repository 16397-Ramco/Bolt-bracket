import type { Player, Match, Bracket } from '../types';

function calculateByes(playerCount: number): number {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(playerCount)));
  return nextPowerOfTwo - playerCount;
}

function distributeByes(players: Player[], byesCount: number): Player[] {
  const totalPlayers = players.length;
  const isOdd = totalPlayers % 2 !== 0;
  
  // Calculate upper and lower half sizes
  let upperHalfSize, lowerHalfSize;
  if (isOdd) {
    upperHalfSize = Math.ceil((totalPlayers + 1) / 2);
    lowerHalfSize = Math.floor((totalPlayers - 1) / 2);
  } else {
    upperHalfSize = totalPlayers / 2;
    lowerHalfSize = totalPlayers / 2;
  }
  
  // Calculate byes for each half
  let upperByes, lowerByes;
  if (byesCount % 2 === 0) {
    upperByes = byesCount / 2;
    lowerByes = byesCount / 2;
  } else {
    if (isOdd) {
      upperByes = Math.floor(byesCount / 2);
      lowerByes = Math.ceil(byesCount / 2);
    } else {
      upperByes = Math.ceil(byesCount / 2);
      lowerByes = Math.floor(byesCount / 2);
    }
  }
  
  // Split players into two halves
  const upperHalf = players.slice(0, upperHalfSize);
  const lowerHalf = players.slice(upperHalfSize);
  
  // Create bye players
  const createBye = (index: number) => ({
    id: `bye-${index + 1}`,
    name: 'BYE',
    isBye: true
  });
  
  const byePlayers = Array(byesCount).fill(null).map((_, i) => createBye(i));
  
  // Distribute byes
  const result: Player[] = [];
  let byeIndex = 0;
  
  // Process upper half
  for (let i = 0; i < upperHalf.length; i++) {
    if (i === 0 || i === upperHalf.length - 1) {
      if (byeIndex < upperByes) {
        result.push(byePlayers[byeIndex++]);
      }
    }
    result.push(upperHalf[i]);
  }
  
  // Add remaining upper byes
  while (byeIndex < upperByes) {
    result.push(byePlayers[byeIndex++]);
  }
  
  // Process lower half
  for (let i = 0; i < lowerHalf.length; i++) {
    if (i === 0 || i === lowerHalf.length - 1) {
      if (byeIndex < byesCount) {
        result.push(byePlayers[byeIndex++]);
      }
    }
    result.push(lowerHalf[i]);
  }
  
  // Add remaining lower byes
  while (byeIndex < byesCount) {
    result.push(byePlayers[byeIndex++]);
  }
  
  return result;
}

export function generateBracket(players: Player[]): Bracket {
  const totalPlayers = players.length;
  const byesNeeded = calculateByes(totalPlayers);
  const playersWithByes = distributeByes(players, byesNeeded);
  const totalSlots = playersWithByes.length;
  const numRounds = Math.log2(totalSlots);
  const rounds: Match[][] = [];
  
  // Create first round matches
  const firstRound: Match[] = [];
  for (let i = 0; i < totalSlots; i += 2) {
    const player1 = playersWithByes[i];
    const player2 = playersWithByes[i + 1];
    
    // If one player has a bye, the other automatically advances
    const winner = player1?.isBye ? player2 : player2?.isBye ? player1 : undefined;
    
    firstRound.push({
      id: `r1-m${i/2 + 1}`, // Start match numbers from 1
      round: 1,
      player1,
      player2,
      winner
    });
  }
  rounds.push(firstRound);
  
  // Create subsequent rounds
  for (let round = 2; round <= numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - round);
    const roundMatches: Match[] = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      const prevRoundMatches = rounds[round - 2];
      const firstMatchIndex = i * 2;
      const secondMatchIndex = firstMatchIndex + 1;
      
      // Get winners from previous round
      const player1 = prevRoundMatches[firstMatchIndex]?.winner;
      const player2 = prevRoundMatches[secondMatchIndex]?.winner;
      
      const match: Match = {
        id: `r${round}-m${i + 1}`, // Start match numbers from 1
        round: round,
        player1,
        player2
      };
      
      roundMatches.push(match);
    }
    rounds.push(roundMatches);
  }
  
  return { rounds };
}

export function updateBracketWithWinner(bracket: Bracket, matchId: string, winnerId: string): Bracket {
  const newRounds = bracket.rounds.map(round => [...round]);
  
  // Find the match and update its winner
  const roundIndex = newRounds.findIndex(round => 
    round.some(match => match.id === matchId)
  );
  
  if (roundIndex === -1) return bracket;
  
  const matchIndex = newRounds[roundIndex].findIndex(match => match.id === matchId);
  const match = newRounds[roundIndex][matchIndex];
  
  // Don't update if the match involves a bye
  if (match.player1?.isBye || match.player2?.isBye) return bracket;
  
  // Set the winner
  const winner = match.player1?.id === winnerId ? match.player1 : match.player2;
  newRounds[roundIndex][matchIndex] = { ...match, winner };
  
  // Update next round's match if it exists
  if (roundIndex < newRounds.length - 1) {
    const nextRoundMatchIndex = Math.floor(matchIndex / 2);
    const nextRoundMatch = newRounds[roundIndex + 1][nextRoundMatchIndex];
    
    // Determine if this winner should be player1 or player2 in the next match
    const isPlayer1 = matchIndex % 2 === 0;
    
    newRounds[roundIndex + 1][nextRoundMatchIndex] = {
      ...nextRoundMatch,
      player1: isPlayer1 ? winner : nextRoundMatch.player1,
      player2: !isPlayer1 ? winner : nextRoundMatch.player2,
      winner: undefined // Reset winner when new players are assigned
    };
  }
  
  return { rounds: newRounds };
}