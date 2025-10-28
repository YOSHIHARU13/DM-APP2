const createFirstRound = (deckIds: string[], seed: number): Round => {
  const rng = seedrandom(seed.toString());
  const shuffled = [...deckIds].sort(() => rng() - 0.5);

  const matches: Match[] = [];
  let i = 0;
  while (i < shuffled.length) {
    const deck1Id = shuffled[i];
    const deck2Id = shuffled[i + 1] ?? null;

    if (!deck2Id) {
      // 奇数で残ったデッキはBYE扱い（自動勝利）
      matches.push({
        matchId: `r1-m${matches.length + 1}`,
        deck1Id,
        deck2Id: null,
        deck1Wins: 0,
        deck2Wins: 0,
        winnerId: deck1Id,
        loserId: null,
        status: 'completed',
      });
      i += 1;
    } else {
      matches.push({
        matchId: `r1-m${matches.length + 1}`,
        deck1Id,
        deck2Id,
        deck1Wins: 0,
        deck2Wins: 0,
        winnerId: null,
        loserId: null,
        status: 'pending',
      });
      i += 2;
    }
  }

  return {
    roundNumber: 1,
    roundName: '1回戦',
    matches,
  };
};
