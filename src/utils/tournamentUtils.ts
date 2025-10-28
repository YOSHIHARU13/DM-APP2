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
 * シングルエリミネーション生成
 */
const generateSingleEliminationBracket = (deckIds: string[], seed: number): TournamentBracket => {
  const rounds: Round[] = [];
  let currentRound = createFirstRound(deckIds, seed);
  rounds.push(currentRound);

  while (currentRound.matches.length > 1) {
    currentRound = createNextRound(currentRound);
    rounds.push(currentRound);
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
 * 初戦生成（ランダム＋シード）
 */
const createFirstRound = (deckIds: string[], seed: number): Round => {
  const rng = seedrandom(seed.toString());
  
  // 完全シャッフル（フィッシャー–イェーツ方式）
  const shuffled = [...deckIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 2のべき乗に合わせてBYEを追加
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const byeCount = nextPowerOf2 - shuffled.length;
  for (let i = 0; i < byeCount; i++) {
    shuffled.push(null); // nullをBYEとして扱う
  }

  // マッチ作成
  const matches: Match[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const deck1Id = shuffled[i];
    const deck2Id = shuffled[i + 1];

    const isBye = !deck1Id || !deck2Id;
    const winnerId = deck1Id && !deck2Id ? deck1Id : !deck1Id && deck2Id ? deck2Id : null;

    matches.push({
      matchId: `r1-m${matches.length + 1}`,
      deck1Id,
      deck2Id,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId,
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
 * 次ラウンド生成
 * 前ラウンドの勝者を自動で割り当て
 */
const createNextRound = (prevRound: Round): Round => {
  const matchCount = Math.ceil(prevRound.matches.length / 2);
  const roundNumber = prevRound.roundNumber + 1;

  const matches: Match[] = Array.from({ length: matchCount }, (_, i) => {
    const prevMatch1 = prevRound.matches[i * 2];
    const prevMatch2 = prevRound.matches[i * 2 + 1];

    return {
      matchId: `r${roundNumber}-m${i + 1}`,
      deck1Id: prevMatch1?.winnerId || null,
      deck2Id: prevMatch2?.winnerId || null,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId: null,
      loserId: null,
      status: (!prevMatch1?.winnerId || !prevMatch2?.winnerId) ? 'pending' : 'pending',
    };
  });

  return {
    roundNumber,
    roundName: getRoundName(matches.length),
    matches,
  };
};

const getRoundName = (matchCount: number) => {
  if (matchCount === 1) return '決勝';
  if (matchCount === 2) return '準決勝';
  if (matchCount === 4) return '準々決勝';
  return `${matchCount * 2}回戦`;
};
