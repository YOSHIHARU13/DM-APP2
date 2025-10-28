import { TournamentBracket, Round, Match, TournamentFormat } from '../types';
import seedrandom from 'seedrandom';

/**
 * トーナメントブラケット生成
 */
export const generateBracket = (
  deckIds: string[],
  format: TournamentFormat,
  seed: number
): TournamentBracket => {
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
 * シングルエリミネーションブラケット生成
 */
const generateSingleEliminationBracket = (deckIds: string[], seed: number): TournamentBracket => {
  const rounds: Round[] = [];
  let currentRound = createFirstRound(deckIds, seed);
  rounds.push(currentRound);

  // 決勝まで生成
  while (currentRound.matches.length > 1) {
    const nextRound = createNextRound(currentRound);
    rounds.push(nextRound);
    currentRound = nextRound;
  }

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
 * Fisher-Yates シャッフル
 */
const shuffle = (array: string[], seed?: number) => {
  const rng = seed ? seedrandom(seed.toString()) : Math.random;
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * 初戦を生成（ランダム組み合わせ & BYE補正）
 */
const createFirstRound = (deckIds: string[], seed: number): Round => {
  const matches: Match[] = [];
  const shuffled = shuffle(deckIds, seed);

  // 2のべき乗に調整
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const byeCount = nextPowerOf2 - shuffled.length;
  for (let i = 0; i < byeCount; i++) {
    shuffled.push(`BYE-${i + 1}`);
  }

  for (let i = 0; i < shuffled.length; i += 2) {
    const deck1Id = shuffled[i];
    const deck2Id = shuffled[i + 1] ?? null;

    const isBye = (deck1Id && deck1Id.startsWith('BYE')) || (deck2Id && deck2Id.startsWith('BYE'));
    const realWinner =
      deck1Id.startsWith('BYE') ? deck2Id :
      deck2Id && deck2Id.startsWith('BYE') ? deck1Id : null;

    matches.push({
      matchId: `r1-m${matches.length + 1}`,
      deck1Id: deck1Id.startsWith('BYE') ? deck2Id : deck1Id,
      deck2Id: deck2Id && deck2Id.startsWith('BYE') ? null : deck2Id,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: realWinner,
      loserId: null,
      status: isBye ? 'completed' : 'pending',
    });
  }

  return {
    roundNumber: 1,
    roundName: '1回戦',
    matches,
  };
};

/**
 * 次のラウンド生成
 */
const createNextRound = (prevRound: Round): Round => {
  const matchCount = Math.ceil(prevRound.matches.length / 2);
  const roundNumber = prevRound.roundNumber + 1;

  return {
    roundNumber,
    roundName: getRoundName(matchCount),
    matches: Array.from({ length: matchCount }, (_, i) => ({
      matchId: `r${roundNumber}-m${i + 1}`,
      deck1Id: null,
      deck2Id: null,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: null,
      loserId: null,
      status: 'pending',
    })),
  };
};

/**
 * ラウンド名
 */
const getRoundName = (matchCount: number): string => {
  if (matchCount === 1) return '決勝';
  if (matchCount === 2) return '準決勝';
  if (matchCount === 4) return '準々決勝';
  return `${matchCount * 2}デッキ戦`;
};
