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
  if (deckIds.length < 2) throw new Error('2デッキ以上必要です');
  if (format === 'single') return generateSingleEliminationBracket(deckIds, seed);
  else return generateDoubleEliminationBracket(deckIds, seed);
};

/**
 * シングルエリミネーション生成（奇数対応＆ランダム完全シャッフル）
 */
const generateSingleEliminationBracket = (deckIds: string[], seed: number): TournamentBracket => {
  const rng = seedrandom(seed.toString());
  
  // 完全シャッフル（Fisher-Yates）
  const shuffled = [...deckIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const rounds: Round[] = [];
  let currentDecks: (string | null)[] = [...shuffled];
  let roundNumber = 1;

  while (currentDecks.length > 1) {
    // 奇数ならBYE追加
    if (currentDecks.length % 2 !== 0) currentDecks.push(null);

    const matches: Match[] = [];
    const nextRoundDecks: (string | null)[] = [];

    for (let i = 0; i < currentDecks.length; i += 2) {
      const deck1 = currentDecks[i];
      const deck2 = currentDecks[i + 1];

      const isBye = !deck1 || !deck2;
      const winner = !deck2 ? deck1 : !deck1 ? deck2 : null;

      matches.push({
        matchId: `r${roundNumber}-m${matches.length + 1}`,
        deck1Id: deck1,
        deck2Id: deck2,
        deck1Wins: 0,
        deck2Wins: 0,
        winnerId: winner,
        loserId: null,
        status: isBye ? 'completed' : 'pending',
      });

      nextRoundDecks.push(winner);
    }

    rounds.push({
      roundNumber,
      roundName: getRoundName(currentDecks.length),
      matches,
    });

    currentDecks = nextRoundDecks;
    roundNumber++;
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
 * 回戦名生成
 */
const getRoundName = (deckCount: number) => {
  if (deckCount === 2) return '決勝';
  if (deckCount === 4) return '準決勝';
  if (deckCount === 8) return '準々決勝';
  return `${deckCount / 2}回戦`;
};
