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
