import { TournamentBracket, Round, Match, TournamentFormat } from '../types';
import seedrandom from 'seedrandom';

/**
 * Fisher-Yatesシャッフル
 */
const shuffleArray = <T,>(array: T[], rng: () => number): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * トーナメントブラケット生成
 */
export const generateBracket = (
  deckIds: string[],
  format: TournamentFormat,
  seed: number
): TournamentBracket => {
  console.log('=== generateBracket 開始 ===');
  console.log('入力デッキ数:', deckIds.length);
  console.log('シード値:', seed);
  
  if (deckIds.length < 2) {
    throw new Error('2デッキ以上必要です');
  }

  return generateSingleEliminationBracket(deckIds, seed);
};

/**
 * シングルエリミネーション生成
 */
const generateSingleEliminationBracket = (deckIds: string[], seed: number): TournamentBracket => {
  const rng = seedrandom(seed.toString());
  const shuffled = shuffleArray(deckIds, rng);
  
  console.log('シャッフル後:', shuffled);

  // 次の2のべき乗
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  
  // 1回戦で戦う人数（2のべき乗になるように調整）
  const firstRoundFighters = nextPowerOf2;
  // シード権（不戦勝）の数
  const byes = firstRoundFighters - shuffled.length;
  
  console.log('トーナメント枠:', firstRoundFighters);
  console.log('シード権:', byes);
  
  // 全参加者を配列に（足りない分はnullで埋める）
  const allParticipants: (string | null)[] = [...shuffled];
  for (let i = 0; i < byes; i++) {
    allParticipants.push(null);
  }
  
  // ラウンド生成
  const rounds: Round[] = [];
  let currentParticipants = allParticipants;
  let roundNumber = 1;
  
  while (currentParticipants.length > 1) {
    const matches: Match[] = [];
    const winners: (string | null)[] = [];
    
    // ペアを作って試合を生成
    for (let i = 0; i < currentParticipants.length; i += 2) {
      const deck1 = currentParticipants[i];
      const deck2 = currentParticipants[i + 1];
      
      let winner: string | null = null;
      let status: 'pending' | 'completed' = 'pending';
      
      // BYE判定（どちらかがnull）
      if (!deck2 && deck1) {
        winner = deck1;
        status = 'completed';
      } else if (!deck1 && deck2) {
        winner = deck2;
        status = 'completed';
      }
      
      matches.push({
        matchId: `r${roundNumber}-m${matches.length + 1}`,
        deck1Id: deck1,
        deck2Id: deck2,
        deck1Wins: 0,
        deck2Wins: 0,
        winnerId: winner,
        loserId: null,
        status: status,
      });
      
      winners.push(winner);
    }
    
    rounds.push({
      roundNumber,
      roundName: getRoundName(matches.length),
      matches,
    });
    
    currentParticipants = winners;
    roundNumber++;
  }
  
  console.log('=== 生成完了 ===');
  console.log('ラウンド数:', rounds.length);
  rounds.forEach((round, i) => {
    console.log(`\n【${round.roundName}】 試合数: ${round.matches.length}`);
    round.matches.forEach((match, j) => {
      console.log(`  試合${j + 1}: ${match.deck1Id || 'null'} vs ${match.deck2Id || 'null'} (status: ${match.status}, winner: ${match.winnerId || 'null'})`);
    });
  });

  return { winnersBracket: rounds };
};

const getRoundName = (matchCount: number) => {
  if (matchCount === 1) return '決勝';
  if (matchCount === 2) return '準決勝';
  if (matchCount === 4) return '準々決勝';
  return `${matchCount * 2}回戦`;
};

/**
 * 試合結果でブラケットを更新
 */
export const updateBracketWithResult = (
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  loserId: string
): TournamentBracket => {
  const updatedWinnersBracket = bracket.winnersBracket.map(round => ({
    ...round,
    matches: round.matches.map(match => {
      if (match.matchId === matchId) {
        return {
          ...match,
          winnerId,
          loserId,
          status: 'completed' as const
        };
      }
      return match;
    })
  }));

  // 次のラウンドに勝者を進める
  for (let i = 0; i < updatedWinnersBracket.length - 1; i++) {
    const currentRound = updatedWinnersBracket[i];
    const nextRound = updatedWinnersBracket[i + 1];

    currentRound.matches.forEach((match, matchIndex) => {
      if (match.status === 'completed' && match.winnerId) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = nextRound.matches[nextMatchIndex];
        
        if (nextMatch) {
          if (matchIndex % 2 === 0) {
            nextMatch.deck1Id = match.winnerId;
          } else {
            nextMatch.deck2Id = match.winnerId;
          }

          // 両方の選手が揃ったらpendingに
          if (nextMatch.deck1Id && nextMatch.deck2Id) {
            nextMatch.status = 'pending';
          }
        }
      }
    });
  }

  return {
    ...bracket,
    winnersBracket: updatedWinnersBracket
  };
};

/**
 * 最終順位を取得
 */
export const getFinalRankings = (bracket: TournamentBracket): {
  winner: string | null;
  runnerUp: string | null;
  thirdPlace: string[];
} => {
  const finalRound = bracket.winnersBracket[bracket.winnersBracket.length - 1];
  const finalMatch = finalRound?.matches[0];

  const winner = finalMatch?.winnerId || null;
  const runnerUp = finalMatch?.loserId || null;

  // 準決勝の敗者を3位とする
  const thirdPlace: string[] = [];
  if (bracket.winnersBracket.length >= 2) {
    const semiFinalRound = bracket.winnersBracket[bracket.winnersBracket.length - 2];
    semiFinalRound.matches.forEach(match => {
      if (match.loserId && match.loserId !== runnerUp) {
        thirdPlace.push(match.loserId);
      }
    });
  }

  return { winner, runnerUp, thirdPlace };
};
