import { TournamentBracket, Round, Match, TournamentFormat } from '../types';
import seedrandom from 'seedrandom';

/**
 * Fisher-Yatesシャッフル（正しいランダムシャッフル）
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
  console.log('入力デッキID:', deckIds);
  console.log('シード値:', seed);
  
  if (deckIds.length < 2) {
    throw new Error('2デッキ以上必要です');
  }

  if (format === 'single') {
    return generateSingleEliminationBracket(deckIds, seed);
  } else {
    return generateDoubleEliminationBracket(deckIds, seed);
  }
};

/**
 * シングルエリミネーション生成（奇数デッキ対応）
 */
const generateSingleEliminationBracket = (deckIds: string[], seed: number): TournamentBracket => {
  const rounds: Round[] = [];
  let currentRound = createFirstRound(deckIds, seed);
  rounds.push(currentRound);

  while (currentRound.matches.length > 1) {
    currentRound = createNextRound(currentRound);
    rounds.push(currentRound);
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

/**
 * ダブルエリミネーション（簡易版）
 */
const generateDoubleEliminationBracket = (deckIds: string[], seed: number): TournamentBracket => {
  const winnersBracket = generateSingleEliminationBracket(deckIds, seed).winnersBracket;
  const losersBracket: Round[] = [];

  for (let i = 0; i < winnersBracket.length - 1; i++) {
    const matchCount = Math.ceil(winnersBracket[i].matches.length / 2);
    const matches: Match[] = Array.from({ length: matchCount }, (_, j) => ({
      matchId: `losers-r${i + 1}-m${j + 1}`,
      deck1Id: null,
      deck2Id: null,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: null,
      loserId: null,
      status: 'pending',
    }));
    losersBracket.push({
      roundNumber: i + 1,
      roundName: `敗者側${i + 1}回戦`,
      matches,
    });
  }

  return { winnersBracket, losersBracket };
};

/**
 * 初戦生成（正しいランダムシャッフル＋奇数デッキ対応）
 */
const createFirstRound = (deckIds: string[], seed: number): Round => {
  const rng = seedrandom(seed.toString());
  
  // 正しいシャッフル（Fisher-Yates法）
  const shuffled = shuffleArray(deckIds, rng);
  
  console.log('シャッフル後:', shuffled);

  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const byeCount = nextPowerOf2 - shuffled.length;

  console.log('必要な枠数:', nextPowerOf2);
  console.log('BYE数:', byeCount);

  // BYEを追加
  const participants = [...shuffled];
  for (let i = 0; i < byeCount; i++) {
    participants.push(`BYE-${i + 1}`);
  }

  const matches: Match[] = [];
  for (let i = 0; i < participants.length; i += 2) {
    const deck1Id = participants[i];
    const deck2Id = participants[i + 1];

    const deck1IsBye = deck1Id.startsWith('BYE');
    const deck2IsBye = deck2Id?.startsWith('BYE');
    
    let finalDeck1: string | null = deck1IsBye ? null : deck1Id;
    let finalDeck2: string | null = deck2IsBye ? null : deck2Id;
    let winner: string | null = null;
    let status: 'pending' | 'completed' = 'pending';

    // BYEの場合は相手を勝者にして試合を完了
    if (deck1IsBye && !deck2IsBye) {
      finalDeck1 = deck2Id;
      finalDeck2 = null;
      winner = deck2Id;
      status = 'completed';
    } else if (deck2IsBye && !deck1IsBye) {
      finalDeck1 = deck1Id;
      finalDeck2 = null;
      winner = deck1Id;
      status = 'completed';
    }

    matches.push({
      matchId: `r1-m${matches.length + 1}`,
      deck1Id: finalDeck1,
      deck2Id: finalDeck2,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: winner,
      loserId: null,
      status: status,
    });
  }

  return {
    roundNumber: 1,
    roundName: '1回戦',
    matches,
  };
};

/**
 * 次ラウンド生成（奇数でも対応）
 */
const createNextRound = (prevRound: Round): Round => {
  const prevMatches = prevRound.matches;
  const matchCount = Math.ceil(prevMatches.length / 2);
  const roundNumber = prevRound.roundNumber + 1;

  const matches: Match[] = Array.from({ length: matchCount }, (_, i) => {
    const deck1Winner = prevMatches[i * 2]?.winnerId ?? null;
    const deck2Winner = prevMatches[i * 2 + 1]?.winnerId ?? null;

    const isBye = deck1Winner && !deck2Winner;
    return {
      matchId: `r${roundNumber}-m${i + 1}`,
      deck1Id: deck1Winner ?? null,
      deck2Id: deck2Winner ?? null,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: isBye ? deck1Winner : null,
      loserId: null,
      status: isBye ? 'completed' : 'pending',
    };
  });

  return {
    roundNumber,
    roundName: getRoundName(matchCount),
    matches,
  };
};

const getRoundName = (matchCount: number) => {
  if (matchCount === 1) return '決勝';
  if (matchCount === 2) return '準決勝';
  if (matchCount === 4) return '準々決勝';
  return `${matchCount * 2}回戦`;
};
