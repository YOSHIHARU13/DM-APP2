// 対戦結果を読み込み
const battlesRef = collection(db, 'battles');
const battlesQuery = query(battlesRef, where('projectId', '==', project.id));
const battlesSnapshot = await getDocs(battlesQuery);

const loadedBattles: Battle[] = [];
battlesSnapshot.forEach((docSnap) => {
  const data = docSnap.data() as any;

  // date を Date に統一
  let date: Date;
  if (data.date instanceof Timestamp) {
    date = data.date.toDate();
  } else if (data.date instanceof Date) {
    date = data.date;
  } else {
    date = new Date();
  }

  // 新旧データ形式の判定を修正
  const deck1Wins = data.deck1Wins ?? 0;
  const deck2Wins = data.deck2Wins ?? 0;
  const deck1GoingFirst = data.deck1GoingFirst ?? 0;
  const deck2GoingFirst = data.deck2GoingFirst ?? 0;
  
  // 古いデータ形式の判定：勝利数が1より大きい、または先攻回数の合計が1より大きい場合
  const isOldFormat = (deck1Wins > 1 || deck2Wins > 1) || 
                      (deck1GoingFirst + deck2GoingFirst > 1);

  if (isOldFormat) {
    // 古いデータ形式：集計データを個別戦績に展開
    const totalGames = deck1Wins + deck2Wins;
    
    // 先攻率を基に個別戦績を推定生成
    for (let i = 0; i < totalGames; i++) {
      const isDeck1Win = i < deck1Wins;
      const isDeck1GoingFirst = i < deck1GoingFirst;
      
      loadedBattles.push({
        id: `${docSnap.id}_game_${i}`,
        deck1Id: data.deck1Id ?? '',
        deck2Id: data.deck2Id ?? '',
        deck1Wins: isDeck1Win ? 1 : 0,
        deck2Wins: isDeck1Win ? 0 : 1,
        deck1GoingFirst: isDeck1GoingFirst ? 1 : 0,
        deck2GoingFirst: isDeck1GoingFirst ? 0 : 1,
        memo: data.memo ?? '',
        date: new Date(date.getTime() + i * 1000), // 少しずつ時間をずらす
        projectId: data.projectId ?? ''
      });
    }
  } else {
    // 新しいデータ形式：1戦ずつのデータ
    loadedBattles.push({
      id: docSnap.id,
      deck1Id: data.deck1Id ?? '',
      deck2Id: data.deck2Id ?? '',
      deck1Wins: deck1Wins,
      deck2Wins: deck2Wins,
      deck1GoingFirst: deck1GoingFirst,
      deck2GoingFirst: deck2GoingFirst,
      memo: data.memo ?? '',
      date,
      projectId: data.projectId ?? ''
    });
  }
});


