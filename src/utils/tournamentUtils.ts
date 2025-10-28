import { TournamentBracket, Round, Match, TournamentFormat } from '../types';
import seedrandom from 'seedrandom';

/**
 * トーナメントブラケット生成（シード固定ランダム）
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

  // 敗者側ラウンドを勝者側数に応じて生成
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
 * Fisher-Yates シャッフル（シード固定）
 */
const shuffleDecks = (deckIds: string[], seed: number): string[] => {
  const rng = seedrandom(seed.toString());
  const array = [...deckIds];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * 初戦を生成（BYE自動追加＆ランダム組み合わせ）
 */
const createFirstRound = (deckIds: string[], seed: number): Round => {
  let shuffled = shuffleDecks(deckIds, seed);

  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const byeCount = nextPowerOf2 - shuffled.length;

  for (let i = 0; i < byeCount; i++) {
    shuffled.push(`BYE-${i + 1}`);
  }

  const matches: Match[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const deck1Id = shuffled[i];
    const deck2Id = shuffled[i + 1] ?? null;

    const winnerId =
      deck1Id.startsWith('BYE') ? deck2Id :
      deck2Id?.startsWith('BYE') ? deck1Id :
      null;

    matches.push({
      matchId: `r1-m${matches.length + 1}`,
      deck1Id: deck1Id.startsWith('BYE') ? deck2Id : deck1Id,
      deck2Id: deck2Id?.startsWith('BYE') ? null : deck2Id,
      deck1Wins: 0,
      deck2Wins: 0,
      winnerId,
      loserId: null,
      status: winnerId ? 'completed' : 'pending',
    });
  }

  return {
    roundNumber: 1,
    roundName: '1回戦',
    matches,
  };
};

/**
 * 次のラウンド生成（勝者が進む場所）
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

/**
 * 勝者を次ラウンドに進める
 */
const advanceWinnerToNextRound = (
  rounds: Round[],
  currentRoundNumber: number,
  currentMatch: Match,
  winnerId: string
) => {
  const currentRoundIndex = rounds.findIndex((r) => r.roundNumber === currentRoundNumber);
  if (currentRoundIndex === -1 || currentRoundIndex === rounds.length - 1) return;

  const nextRound = rounds[currentRoundIndex + 1];
  const currentIndex = rounds[currentRoundIndex].matches.findIndex(
    (m) => m.matchId === currentMatch.matchId
  );

  const nextIndex = Math.floor(currentIndex / 2);
  const nextMatch = nextRound.matches[nextIndex];
  if (!nextMatch) return;

  if (!nextMatch.deck1Id) nextMatch.deck1Id = winnerId;
  else nextMatch.deck2Id = winnerId;
};

/**
 * 試合結果を反映
 */
export const updateBracketWithResult = (
  bracket: TournamentBracket,
  matchId: string,
  winnerId: string,
  loserId: string
): TournamentBracket => {
  const updated = structuredClone(bracket);

  const findAndUpdate = (rounds: Round[]) => {
    for (const round of rounds) {
      const match = round.matches.find((m) => m.matchId === matchId);
      if (match) {
        match.winnerId = winnerId;
        match.loserId = loserId;
        match.status = 'completed';
        advanceWinnerToNextRound(rounds, round.roundNumber, match, winnerId);
        return true;
      }
    }
    return false;
  };

  if (!findAndUpdate(updated.winnersBracket) && updated.losersBracket) {
    findAndUpdate(updated.losersBracket);
  }

  return updated;
};

/**
 * 最終順位
 */
export const getFinalRankings = (bracket: TournamentBracket) => {
  const finalRound = bracket.winnersBracket.at(-1);
  const finalMatch = finalRound?.matches[0];
  const rankings = {
    winner: finalMatch?.winnerId ?? null,
    runnerUp: finalMatch?.loserId ?? null,
    thirdPlace: [] as string[],
  };

  const semiFinal = bracket.winnersBracket.at(-2);
  if (semiFinal) {
    for (const m of semiFinal.matches) {
      if (m.loserId && m.loserId !== rankings.runnerUp) {
        rankings.thirdPlace.push(m.loserId);
      }
    }
  }
  return rankings;
};
