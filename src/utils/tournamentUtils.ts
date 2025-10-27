import { Tournament, TournamentBracket, Round, Match } from '../types';

// トーナメントブラケットを生成
export const generateBracket = (
  deckIds: string[],
  format: 'single' | 'double'
): TournamentBracket => {
  if (format === 'single') {
    return generateSingleEliminationBracket(deckIds);
  } else {
    return generateDoubleEliminationBracket(deckIds);
  }
};

// シングルエリミネーションブラケット生成
const generateSingleEliminationBracket = (deckIds: string[]): TournamentBracket => {
  const shuffledDecks = [...deckIds].sort(() => Math.random() - 0.5);
  const numParticipants = shuffledDecks.length;
  
  // 次の2のべき乗を計算
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(numParticipants)));
  const numByes = nextPowerOf2 - numParticipants;
  
  // 1回戦のマッチを生成
  const firstRoundMatches: Match[] = [];
  let matchId = 1;
  
  for (let i = 0; i < nextPowerOf2 / 2; i++) {
    const deck1Index = i;
    const deck2Index = nextPowerOf2 - 1 - i;
    
    const deck1Id = deck1Index < numParticipants ? shuffledDecks[deck1Index] : null;
    const deck2Id = deck2Index < numParticipants ? shuffledDecks[deck2Index] : null;
    
    // シード（不戦勝）の処理
    let winnerId: string | null = null;
    let status: 'pending' | 'completed' = 'pending';
    
    if (deck1Id && !deck2Id) {
      winnerId = deck1Id;
      status = 'completed';
    } else if (!deck1Id && deck2Id) {
      winnerId = deck2Id;
      status = 'completed';
    }
    
    firstRoundMatches.push({
      matchId: `match_${matchId++}`,
      deck1Id,
      deck2Id,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId,
      loserId: null,
      status
    });
  }
  
  // 全ラウンドを生成
  const rounds: Round[] = [];
  const totalRounds = Math.log2(nextPowerOf2);
  
  rounds.push({
    roundNumber: 1,
    roundName: getRoundName(1, totalRounds),
    matches: firstRoundMatches
  });
  
  // 2回戦以降のラウンドを生成（試合のプレースホルダー）
  let currentRoundMatches = firstRoundMatches.length;
  for (let round = 2; round <= totalRounds; round++) {
    currentRoundMatches = Math.floor(currentRoundMatches / 2);
    const roundMatches: Match[] = [];
    
    for (let i = 0; i < currentRoundMatches; i++) {
      roundMatches.push({
        matchId: `match_${matchId++}`,
        deck1Id: null,
        deck2Id: null,
        deck1Wins: 0,
        deck2Wins: 0,
        winnerId: null,
        loserId: null,
        status: 'pending'
      });
    }
    
    rounds.push({
      roundNumber: round,
      roundName: getRoundName(round, totalRounds),
      matches: roundMatches
    });
  }
  
  // 3位決定戦を生成（決勝の1つ前のラウンドの敗者同士）
  const thirdPlaceMatch: Match = {
    matchId: `match_third_place`,
    deck1Id: null,
    deck2Id: null,
    deck1Wins: 0,
    deck2Wins: 0,
    winnerId: null,
    loserId: null,
    status: 'pending'
  };
  
  return {
    winnersBracket: rounds,
    thirdPlaceMatch
  };
};

// ダブルエリミネーションブラケット生成
const generateDoubleEliminationBracket = (deckIds: string[]): TournamentBracket => {
  // 勝者側ブラケット（シングルと同じロジック）
  const winnersBracket = generateSingleEliminationBracket(deckIds);
  
  // 敗者側ブラケットの準備
  const numParticipants = deckIds.length;
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(numParticipants)));
  const totalRounds = Math.log2(nextPowerOf2);
  
  // 敗者側ブラケットは勝者側の約2倍のラウンド数
  const losersBracket: Round[] = [];
  let matchId = 1000; // 敗者側は1000番台
  
  for (let round = 1; round <= totalRounds * 2 - 1; round++) {
    const numMatches = round % 2 === 1 
      ? Math.pow(2, totalRounds - Math.ceil(round / 2))
      : Math.pow(2, totalRounds - Math.ceil(round / 2) - 1);
    
    const roundMatches: Match[] = [];
    for (let i = 0; i < numMatches; i++) {
      roundMatches.push({
        matchId: `match_loser_${matchId++}`,
        deck1Id: null,
        deck2Id: null,
        deck1Wins: 0,
        deck2Wins: 0,
        winnerId: null,
        loserId: null,
        status: 'pending'
      });
    }
    
    losersBracket.push({
      roundNumber: round,
      roundName: `敗者側 R${round}`,
      matches: roundMatches
    });
  }
  
  // グランドファイナル
  const grandFinal: Match = {
    matchId: 'match_grand_final',
    deck1Id: null,
    deck2Id: null,
    deck1Wins: 0,
    deck2Wins: 0,
    winnerId: null,
    loserId: null,
    status: 'pending'
  };
  
  return {
    winnersBracket: winnersBracket.winnersBracket,
    losersBracket,
    grandFinal
  };
};

// ラウンド名を取得
const getRoundName = (roundNumber: number, totalRounds: number): string => {
  const remainingRounds = totalRounds - roundNumber + 1;
  
  if (remainingRounds === 1) return '決勝';
  if (remainingRounds === 2) return '準決勝';
  if (remainingRounds === 3) return '準々決勝';
  if (remainingRounds === 4) return 'ベスト16';
  if (remainingRounds === 5) return 'ベスト32';
  
  return `${roundNumber}回戦`;
};

// 試合結果を反映してブラケットを更新
export const updateBracketWithResult = (
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  loserId: string,
  format: 'single' | 'double'
): TournamentBracket => {
  if (format === 'single') {
    return updateSingleEliminationBracket(bracket, matchId, winnerId, loserId);
  } else {
    return updateDoubleEliminationBracket(bracket, matchId, winnerId, loserId);
  }
};

// シングルエリミネーションブラケット更新
const updateSingleEliminationBracket = (
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  loserId: string
): TournamentBracket => {
  const newBracket = JSON.parse(JSON.stringify(bracket)) as TournamentBracket;
  
  // 該当する試合を探して更新
  for (const round of newBracket.winnersBracket) {
    const match = round.matches.find(m => m.matchId === matchId);
    if (match) {
      match.winnerId = winnerId;
      match.loserId = loserId;
      match.status = 'completed';
      
      // 次のラウンドに勝者を進める
      advanceWinnerToNextRound(newBracket.winnersBracket, round.roundNumber, match, winnerId);
      
      // 準決勝の場合、敗者を3位決定戦に進める
      if (round.roundName === '準決勝' && newBracket.thirdPlaceMatch) {
        if (!newBracket.thirdPlaceMatch.deck1Id) {
          newBracket.thirdPlaceMatch.deck1Id = loserId;
        } else if (!newBracket.thirdPlaceMatch.deck2Id) {
          newBracket.thirdPlaceMatch.deck2Id = loserId;
        }
      }
      
      break;
    }
  }
  
  // 3位決定戦の結果更新
  if (matchId === 'match_third_place' && newBracket.thirdPlaceMatch) {
    newBracket.thirdPlaceMatch.winnerId = winnerId;
    newBracket.thirdPlaceMatch.loserId = loserId;
    newBracket.thirdPlaceMatch.status = 'completed';
  }
  
  return newBracket;
};

// ダブルエリミネーションブラケット更新
const updateDoubleEliminationBracket = (
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  loserId: string
): TournamentBracket => {
  const newBracket = JSON.parse(JSON.stringify(bracket)) as TournamentBracket;
  
  // 勝者側ブラケットの試合か確認
  let isWinnersBracket = false;
  for (const round of newBracket.winnersBracket) {
    const match = round.matches.find(m => m.matchId === matchId);
    if (match) {
      match.winnerId = winnerId;
      match.loserId = loserId;
      match.status = 'completed';
      isWinnersBracket = true;
      
      // 勝者を次のラウンドに進める
      advanceWinnerToNextRound(newBracket.winnersBracket, round.roundNumber, match, winnerId);
      
      // 敗者を敗者側ブラケットに落とす
      if (newBracket.losersBracket) {
        dropLoserToLosersBracket(newBracket.losersBracket, round.roundNumber, loserId);
      }
      
      break;
    }
  }
  
  // 敗者側ブラケットの試合か確認
  if (!isWinnersBracket && newBracket.losersBracket) {
    for (const round of newBracket.losersBracket) {
      const match = round.matches.find(m => m.matchId === matchId);
      if (match) {
        match.winnerId = winnerId;
        match.loserId = loserId;
        match.status = 'completed';
        
        // 勝者を敗者側の次のラウンドに進める
        advanceWinnerToNextRound(newBracket.losersBracket, round.roundNumber, match, winnerId);
        
        // 敗者は完全に敗退（何もしない）
        break;
      }
    }
  }
  
  // グランドファイナルの更新
  if (matchId === 'match_grand_final' && newBracket.grandFinal) {
    newBracket.grandFinal.winnerId = winnerId;
    newBracket.grandFinal.loserId = loserId;
    newBracket.grandFinal.status = 'completed';
  }
  
  return newBracket;
};

// 勝者を次のラウンドに進める
const advanceWinnerToNextRound = (
  rounds: Round[],
  currentRoundNumber: number,
  currentMatch: Match,
  winnerId: string
) => {
  const nextRound = rounds.find(r => r.roundNumber === currentRoundNumber + 1);
  if (!nextRound) return;
  
  const matchIndexInRound = rounds
    .find(r => r.roundNumber === currentRoundNumber)
    ?.matches.findIndex(m => m.matchId === currentMatch.matchId) ?? -1;
  
  if (matchIndexInRound === -1) return;
  
  const nextMatchIndex = Math.floor(matchIndexInRound / 2);
  const nextMatch = nextRound.matches[nextMatchIndex];
  
  if (!nextMatch) return;
  
  if (!nextMatch.deck1Id) {
    nextMatch.deck1Id = winnerId;
  } else if (!nextMatch.deck2Id) {
    nextMatch.deck2Id = winnerId;
  }
};

// 敗者を敗者側ブラケットに落とす
const dropLoserToLosersBracket = (
  losersBracket: Round[],
  winnersBracketRound: number,
  loserId: string
) => {
  // 簡易実装：対応する敗者側ラウンドに配置
  const losersRoundNumber = (winnersBracketRound - 1) * 2 + 1;
  const losersRound = losersBracket.find(r => r.roundNumber === losersRoundNumber);
  
  if (!losersRound) return;
  
  for (const match of losersRound.matches) {
    if (!match.deck1Id) {
      match.deck1Id = loserId;
      return;
    } else if (!match.deck2Id) {
      match.deck2Id = loserId;
      return;
    }
  }
};

// トーナメントが完了したか確認
export const isTournamentComplete = (tournament: Tournament): boolean => {
  const { bracket, format } = tournament;
  
  if (format === 'single') {
    // 決勝戦と3位決定戦が完了しているか
    const finalRound = bracket.winnersBracket[bracket.winnersBracket.length - 1];
    const finalMatch = finalRound.matches[0];
    const thirdPlaceComplete = bracket.thirdPlaceMatch?.status === 'completed';
    
    return finalMatch.status === 'completed' && thirdPlaceComplete;
  } else {
    // グランドファイナルが完了しているか
    return bracket.grandFinal?.status === 'completed' || false;
  }
};

// 最終順位を取得
export const getFinalRankings = (tournament: Tournament): {
  winner: string | null;
  runnerUp: string | null;
  thirdPlace: string[];
} => {
  const { bracket, format } = tournament;
  
  if (format === 'single') {
    const finalRound = bracket.winnersBracket[bracket.winnersBracket.length - 1];
    const finalMatch = finalRound.matches[0];
    
    return {
      winner: finalMatch.winnerId,
      runnerUp: finalMatch.loserId,
      thirdPlace: bracket.thirdPlaceMatch?.winnerId ? [bracket.thirdPlaceMatch.winnerId] : []
    };
  } else {
    const grandFinal = bracket.grandFinal;
    const losersFinalRound = bracket.losersBracket?.[bracket.losersBracket.length - 1];
    const losersFinal = losersFinalRound?.matches[0];
    
    return {
      winner: grandFinal?.winnerId || null,
      runnerUp: grandFinal?.loserId || null,
      thirdPlace: losersFinal?.loserId ? [losersFinal.loserId] : []
    };
  }
};
