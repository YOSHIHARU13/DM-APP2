import { TournamentBracket, Round, Match, TournamentFormat } from '../types';

export const generateBracket = (
  deckIds: string[],
  format: TournamentFormat
): TournamentBracket => {
  if (format === 'single') {
    return generateSingleEliminationBracket(deckIds);
  } else {
    return generateDoubleEliminationBracket(deckIds);
  }
};

const generateSingleEliminationBracket = (deckIds: string[]): TournamentBracket => {
  const rounds: Round[] = [];
  let currentRound = createFirstRound(deckIds);
  let roundNumber = 1;

  rounds.push(currentRound);

  // 決勝まで生成
  while (currentRound.matches.length > 1) {
    currentRound = createNextRound(currentRound, roundNumber);
    rounds.push(currentRound);
    roundNumber++;
  }

  return {
    winnersBracket: rounds,
  };
};

const generateDoubleEliminationBracket = (deckIds: string[]): TournamentBracket => {
  // 勝者側ブラケット
  const winnersBracket = generateSingleEliminationBracket(deckIds).winnersBracket;
  
  // 敗者側ブラケット（簡略化版）
  const losersBracket: Round[] = [];
  
  // 敗者側は勝者側の試合数に応じて生成
  for (let i = 0; i < winnersBracket.length - 1; i++) {
    const matchCount = Math.ceil(winnersBracket[i].matches.length / 2);
    const matches: Match[] = [];
    
    for (let j = 0; j < matchCount; j++) {
      matches.push({
        matchId: `losers-r${i + 1}-m${j + 1}`,
        deck1Id: null,
        deck2Id: null,
        deck1Wins: 0,
        deck2Wins: 0,
        winnerId: null,
        loserId: null,
        status: 'pending',
      });
    }
    
    losersBracket.push({
      roundNumber: i + 1,
      roundName: `敗者側${i + 1}回戦`,
      matches,
    });
  }

  return {
    winnersBracket,
    losersBracket,
  };
};

const createFirstRound = (deckIds: string[]): Round => {
  const matches: Match[] = [];
  const n = deckIds.length;
  
  // 2のべき乗に最も近い数を計算
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(n)));
  const byeCount = nextPowerOf2 - n;
  
  let deckIndex = 0;
  let matchNumber = 1;

  // 通常のマッチを生成
  while (deckIndex < n - byeCount) {
    const deck1Id = deckIds[deckIndex];
    const deck2Id = deckIndex + 1 < n ? deckIds[deckIndex + 1] : null;
    
    matches.push({
      matchId: `r1-m${matchNumber}`,
      deck1Id,
      deck2Id,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: null,
      loserId: null,
      status: deck2Id ? 'pending' : 'completed', // シードは自動的に完了
    });
    
    // シードの場合は自動的に勝者を設定
    if (!deck2Id) {
      matches[matches.length - 1].winnerId = deck1Id;
    }
    
    deckIndex += 2;
    matchNumber++;
  }

  return {
    roundNumber: 1,
    roundName: '1回戦',
    matches,
  };
};

const createNextRound = (previousRound: Round, roundNumber: number): Round => {
  const matchCount = Math.ceil(previousRound.matches.length / 2);
  const matches: Match[] = [];

  for (let i = 0; i < matchCount; i++) {
    matches.push({
      matchId: `r${roundNumber + 1}-m${i + 1}`,
      deck1Id: null, // 前のラウンドの勝者が入る
      deck2Id: null,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: null,
      loserId: null,
      status: 'pending',
    });
  }

  return {
    roundNumber: roundNumber + 1,
    roundName: getRoundName(roundNumber + 1, matchCount),
    matches,
  };
};

const getRoundName = (roundNumber: number, matchCount: number): string => {
  if (matchCount === 1) return '決勝';
  if (matchCount === 2) return '準決勝';
  if (matchCount === 4) return '準々決勝';
  return `${roundNumber}回戦`;
};

// ブラケットに試合結果を反映する関数
export const updateBracketWithResult = (
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  loserId: string
): TournamentBracket => {
  const updatedBracket = JSON.parse(JSON.stringify(bracket)); // ディープコピー

  // 勝者側ブラケットを更新
  let matchFound = false;
  for (const round of updatedBracket.winnersBracket) {
    const match = round.matches.find((m: Match) => m.matchId === matchId);
    if (match) {
      match.winnerId = winnerId;
      match.loserId = loserId;
      match.status = 'completed';
      matchFound = true;

      // 次のラウンドに勝者を進める
      advanceWinnerToNextRound(updatedBracket.winnersBracket, match, winnerId);
      break;
    }
  }

  // 敗者側ブラケットも確認（ダブルエリミの場合）
  if (!matchFound && updatedBracket.losersBracket) {
    for (const round of updatedBracket.losersBracket) {
      const match = round.matches.find((m: Match) => m.matchId === matchId);
      if (match) {
        match.winnerId = winnerId;
        match.loserId = loserId;
        match.status = 'completed';

        // 敗者側の次のラウンドに進める
        advanceWinnerToNextRound(updatedBracket.losersBracket, match, winnerId);
        break;
      }
    }
  }

  return updatedBracket;
};

// 次のラウンドに勝者を進める
const advanceWinnerToNextRound = (rounds: Round[], currentMatch: Match, winnerId: string) => {
  const currentRoundIndex = rounds.findIndex(r => 
    r.matches.some(m => m.matchId === currentMatch.matchId)
  );

  if (currentRoundIndex === -1 || currentRoundIndex === rounds.length - 1) {
    return; // 最終ラウンドまたは見つからない場合
  }

  const nextRound = rounds[currentRoundIndex + 1];
  const currentMatchIndex = rounds[currentRoundIndex].matches.findIndex(
    m => m.matchId === currentMatch.matchId
  );

  // 次のラウンドの対応する試合を見つける
  const nextMatchIndex = Math.floor(currentMatchIndex / 2);
  const nextMatch = nextRound.matches[nextMatchIndex];

  if (nextMatch) {
    // 奇数番目の試合ならdeck1に、偶数番目ならdeck2に進める
    if (currentMatchIndex % 2 === 0) {
      nextMatch.deck1Id = winnerId;
    } else {
      nextMatch.deck2Id = winnerId;
    }

    // 両方のデッキが決まったら試合を開始可能に
    if (nextMatch.deck1Id && nextMatch.deck2Id) {
      nextMatch.status = 'pending';
    }
  }
};

// 最終順位を取得する関数
export const getFinalRankings = (bracket: TournamentBracket): {
  winner: string | null;
  runnerUp: string | null;
  thirdPlace: string[];
} => {
  const rankings = {
    winner: null as string | null,
    runnerUp: null as string | null,
    thirdPlace: [] as string[],
  };

  // 決勝戦を取得
  const finalRound = bracket.winnersBracket[bracket.winnersBracket.length - 1];
  const finalMatch = finalRound.matches[0];

  if (finalMatch && finalMatch.status === 'completed') {
    rankings.winner = finalMatch.winnerId;
    rankings.runnerUp = finalMatch.loserId;
  }

  // 準決勝の敗者が3位
  if (bracket.winnersBracket.length > 1) {
    const semiFinalRound = bracket.winnersBracket[bracket.winnersBracket.length - 2];
    for (const match of semiFinalRound.matches) {
      if (match.status === 'completed' && match.loserId && match.loserId !== rankings.runnerUp) {
        rankings.thirdPlace.push(match.loserId);
      }
    }
  }

  return rankings;
};
