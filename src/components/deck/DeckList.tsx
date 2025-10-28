import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Deck, Battle, DeckListProps, Tournament } from '../../types';
import DeckForm from './DeckForm';
import BattleForm from '../battle/BattleForm';
import DeckDetail from './DeckDetail';
import Analysis from '../analysis/Analysis';
import TournamentForm from 'components/tournament/TournamentForm';
import TournamentList from 'components/tournament/TournamentList';
import TournamentDetail from 'components/tournament/TournamentDetail';

import { generateBracket, updateBracketWithResult, getFinalRankings } from 'utils/tournamentUtils';
// Eloレーティング計算
const calculateEloRating = (currentRating: number, opponentRating: number, isWin: boolean, kFactor: number = 32): number => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
  const actualScore = isWin ? 1 : 0;
  return Math.round(currentRating + kFactor * (actualScore - expectedScore));
};

const DeckList: React.FC<DeckListProps> = ({ project, onBackToProject }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [deckRatings, setDeckRatings] = useState<{[deckId: string]: number}>({});
  const [showDeckForm, setShowDeckForm] = useState<boolean>(false);
  const [showBattleForm, setShowBattleForm] = useState<boolean>(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'name' | 'winRate' | 'normalizedWinRate' | 'rating' | 'created'>('rating');
  const [loading, setLoading] = useState<boolean>(true);
  
  // トーナメント関連のstate
  const [currentView, setCurrentView] = useState<'decks' | 'tournaments' | 'tournament_form' | 'tournament_detail'>('decks');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // 全体環境プロジェクトを検索
  const findGlobalProject = async (userId: string) => {
    const projectsRef = collection(db, 'projects');
    const globalQuery = query(projectsRef, where('userId', '==', userId), where('name', '==', '全体環境'));
    const snapshot = await getDocs(globalQuery);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  };

  // 全体環境にデッキを作成/取得
  const ensureDeckInGlobal = async (deckName: string, colors: string[], globalProjectId: string): Promise<string> => {
    const globalDecksQuery = query(
      collection(db, 'decks'), 
      where('projectId', '==', globalProjectId),
      where('name', '==', deckName)
    );
    const existingDeck = await getDocs(globalDecksQuery);
    
    if (!existingDeck.empty) {
      return existingDeck.docs[0].id;
    }

    const newDeckData = {
      name: deckName,
      colors: colors,
      createdAt: new Date(),
      projectId: globalProjectId
    };
    
    const docRef = await addDoc(collection(db, 'decks'), newDeckData);
    console.log(`全体環境にデッキ「${deckName}」を作成しました`);
    return docRef.id;
  };

  // 移行済みチェック
  const isMigrationCompleted = (userId: string): boolean => {
    const migrationKey = `duelma_migration_completed_${userId}`;
    return localStorage.getItem(migrationKey) === 'true';
  };

  // 移行完了をマーク
  const markMigrationCompleted = (userId: string): void => {
    const migrationKey = `duelma_migration_completed_${userId}`;
    localStorage.setItem(migrationKey, 'true');
  };

  // 既存戦績の全体環境への移行（最適化版）
  const migrateExistingData = async () => {
    if (project.name === '全体環境') return;

    // 移行済みチェック
    if (isMigrationCompleted(project.userId)) {
      console.log('データ移行は既に完了済みです');
      return;
    }

    try {
      console.log('初回起動: 既存戦績を全体環境に移行開始...');
      
      const globalProject = await findGlobalProject(project.userId);
      if (!globalProject) {
        console.log('全体環境プロジェクトが見つかりません');
        return;
      }

      // 全ユーザーの全プロジェクトから戦績を取得
      const allProjectsQuery = query(collection(db, 'projects'), where('userId', '==', project.userId));
      const allProjectsSnapshot = await getDocs(allProjectsQuery);
      
      const migrationBatch = writeBatch(db);
      let migratedCount = 0;

      for (const projectDoc of allProjectsSnapshot.docs) {
        const currentProjectId = projectDoc.id;
        const currentProjectData = projectDoc.data();
        
        if (currentProjectData.name === '全体環境') continue;

        const projectDecksQuery = query(collection(db, 'decks'), where('projectId', '==', currentProjectId));
        const projectDecksSnapshot = await getDocs(projectDecksQuery);
        
        const projectDecks: {[id: string]: {name: string, colors: string[]}} = {};
        projectDecksSnapshot.forEach(doc => {
          const data = doc.data();
          projectDecks[doc.id] = {
            name: data.name,
            colors: data.colors || []
          };
        });

        const projectBattlesQuery = query(collection(db, 'battles'), where('projectId', '==', currentProjectId));
        const projectBattlesSnapshot = await getDocs(projectBattlesQuery);

        // 既存の全体環境戦績をチェック（重複防止）
        const globalBattlesQuery = query(
          collection(db, 'battles'), 
          where('projectId', '==', globalProject.id)
        );
        const existingGlobalBattles = await getDocs(globalBattlesQuery);
        const existingBattleKeys = new Set();
        
        existingGlobalBattles.forEach(doc => {
          const data = doc.data();
          const key = `${data.deck1Id}-${data.deck2Id}-${data.date?.toMillis()}`;
          existingBattleKeys.add(key);
        });

        for (const battleDoc of projectBattlesSnapshot.docs) {
          const battleData = battleDoc.data();
          
          const battleKey = `${battleData.deck1Id}-${battleData.deck2Id}-${battleData.date?.toMillis()}`;
          
          if (existingBattleKeys.has(battleKey)) {
            continue;
          }

          const deck1Info = projectDecks[battleData.deck1Id];
          const deck2Info = projectDecks[battleData.deck2Id];
          
          if (!deck1Info || !deck2Info) continue;

          const globalDeck1Id = await ensureDeckInGlobal(deck1Info.name, deck1Info.colors, globalProject.id);
          const globalDeck2Id = await ensureDeckInGlobal(deck2Info.name, deck2Info.colors, globalProject.id);

          const globalBattleRef = doc(collection(db, 'battles'));
          migrationBatch.set(globalBattleRef, {
            deck1Id: globalDeck1Id,
            deck2Id: globalDeck2Id,
            deck1Wins: battleData.deck1Wins || 0,
            deck2Wins: battleData.deck2Wins || 0,
            deck1GoingFirst: battleData.deck1GoingFirst || 0,
            deck2GoingFirst: battleData.deck2GoingFirst || 0,
            memo: battleData.memo || '',
            date: battleData.date || new Date(),
            projectId: globalProject.id
          });

          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        await migrationBatch.commit();
        console.log(`${migratedCount}件の戦績を全体環境に移行しました`);
      }

      // 移行完了をマーク
      markMigrationCompleted(project.userId);
      console.log('データ移行が完了しました');
    } catch (error) {
      console.error('データ移行に失敗:', error);
    }
  };

  // レーティング初期化
  const initializeDeckRatings = (battles: Battle[], decks: Deck[]) => {
    const ratings: {[deckId: string]: number} = {};
    
    decks.forEach(deck => {
      ratings[deck.id] = 1500;
    });

    const sortedBattles = battles.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    sortedBattles.forEach(battle => {
      const deck1Rating = ratings[battle.deck1Id] || 1500;
      const deck2Rating = ratings[battle.deck2Id] || 1500;
      
      const deck1Won = battle.deck1Wins > battle.deck2Wins;
      
      ratings[battle.deck1Id] = calculateEloRating(deck1Rating, deck2Rating, deck1Won);
      ratings[battle.deck2Id] = calculateEloRating(deck2Rating, deck1Rating, !deck1Won);
    });

    return ratings;
  };

  // Firestoreからデータ読み込み（最適化版）
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 1. まず現在のプロジェクトデータを読み込み（高速表示）
        const decksRef = collection(db, 'decks');
        const decksQuery = query(decksRef, where('projectId', '==', project.id));
        const decksSnapshot = await getDocs(decksQuery);

        const loadedDecks: Deck[] = [];
        decksSnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;

          let createdAt: Date;
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else {
            createdAt = new Date();
          }

          loadedDecks.push({
            id: docSnap.id,
            name: data.name ?? '',
            colors: data.colors ?? [],
            imageUrl: data.imageUrl || undefined,
            createdAt,
            projectId: data.projectId ?? ''
          });
        });

        const battlesRef = collection(db, 'battles');
        const battlesQuery = query(battlesRef, where('projectId', '==', project.id));
        const battlesSnapshot = await getDocs(battlesQuery);

        const loadedBattles: Battle[] = [];
        battlesSnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;

          let date: Date;
          if (data.date instanceof Timestamp) {
            date = data.date.toDate();
          } else if (data.date instanceof Date) {
            date = data.date;
          } else {
            date = new Date();
          }

          const deck1Wins = data.deck1Wins ?? 0;
          const deck2Wins = data.deck2Wins ?? 0;
          const deck1GoingFirst = data.deck1GoingFirst ?? 0;
          const deck2GoingFirst = data.deck2GoingFirst ?? 0;
          
          const isOldFormat = (deck1Wins > 1 || deck2Wins > 1) || 
                              (deck1GoingFirst + deck2GoingFirst > 1);

          if (isOldFormat) {
            const totalGames = deck1Wins + deck2Wins;
            
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
                date: new Date(date.getTime() + i * 1000),
                projectId: data.projectId ?? ''
              });
            }
          } else {
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

        setDecks(loadedDecks);
        setBattles(loadedBattles);
        
        const ratings = initializeDeckRatings(loadedBattles, loadedDecks);
        setDeckRatings(ratings);

        // トーナメントデータの読み込み
        const tournamentsQuery = query(collection(db, 'tournaments'), where('projectId', '==', project.id));
        const tournamentsSnapshot = await getDocs(tournamentsQuery);
        const loadedTournaments: Tournament[] = [];
        tournamentsSnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          loadedTournaments.push({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            completedAt: data.completedAt ? (data.completedAt instanceof Timestamp ? data.completedAt.toDate() : new Date()) : undefined
          });
        });
        setTournaments(loadedTournaments);

        // 2. 画面表示を完了（ここで高速表示）
        setLoading(false);

        // 3. バックグラウンドで移行処理（画面表示には影響しない）
        if (!isMigrationCompleted(project.userId)) {
          // 非同期で移行処理を実行
          migrateExistingData().catch(console.error);
        }
      } catch (error) {
        console.error('データの読み込みに失敗:', error);
        alert('データの読み込みに失敗しました');
        setLoading(false);
      }
    };

    loadData();
  }, [project.id]);

  // デッキ追加
  const handleDeckAdd = async (newDeck: Deck) => {
    try {
      const deckData = {
        name: newDeck.name,
        colors: newDeck.colors,
        imageUrl: newDeck.imageUrl || null,
        createdAt: newDeck.createdAt,
        projectId: newDeck.projectId
      };

      const docRef = await addDoc(collection(db, 'decks'), deckData);
      const deckWithId = { ...newDeck, id: docRef.id };

      if (project.name !== '全体環境') {
        const globalProject = await findGlobalProject(project.userId);
        if (globalProject) {
          await ensureDeckInGlobal(newDeck.name, newDeck.colors, globalProject.id);
        }
      }

      setDecks(prev => [...prev, deckWithId]);
      setDeckRatings(prev => ({ ...prev, [docRef.id]: 1500 }));
      setShowDeckForm(false);
    } catch (error) {
      console.error('デッキの保存に失敗:', error);
      alert('デッキの保存に失敗しました');
    }
  };

  // デッキ削除
  const handleDeckDelete = async (deckId: string) => {
    if (window.confirm('このデッキを削除しますか？関連する対戦データも削除されます。')) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'decks', deckId));

        const relatedBattles = battles.filter(b => b.deck1Id === deckId || b.deck2Id === deckId);
        relatedBattles.forEach(battle => {
          if (!battle.id.includes('_game_')) {
            batch.delete(doc(db, 'battles', battle.id));
          }
        });

        await batch.commit();

        setDecks(prev => prev.filter(d => d.id !== deckId));
        setBattles(prev => prev.filter(b => b.deck1Id !== deckId && b.deck2Id !== deckId));
        setDeckRatings(prev => {
          const newRatings = { ...prev };
          delete newRatings[deckId];
          return newRatings;
        });
      } catch (error) {
        console.error('デッキの削除に失敗:', error);
        alert('デッキの削除に失敗しました');
      }
    }
  };

  // 対戦追加
  const handleBattleAdd = async (newBattle: Omit<Battle, 'id'>) => {
    try {
      const battleData = {
        deck1Id: newBattle.deck1Id,
        deck2Id: newBattle.deck2Id,
        deck1Wins: newBattle.deck1Wins,
        deck2Wins: newBattle.deck2Wins,
        deck1GoingFirst: newBattle.deck1GoingFirst,
        deck2GoingFirst: newBattle.deck2GoingFirst,
        memo: newBattle.memo,
        date: newBattle.date,
        projectId: newBattle.projectId
      };

      const docRef = await addDoc(collection(db, 'battles'), battleData);
      const battleWithId: Battle = { ...battleData, id: docRef.id };

      if (project.name !== '全体環境') {
        const globalProject = await findGlobalProject(project.userId);
        if (globalProject) {
          const deck1Name = decks.find(d => d.id === newBattle.deck1Id)?.name;
          const deck2Name = decks.find(d => d.id === newBattle.deck2Id)?.name;
          const deck1Colors = decks.find(d => d.id === newBattle.deck1Id)?.colors || [];
          const deck2Colors = decks.find(d => d.id === newBattle.deck2Id)?.colors || [];
          
          if (deck1Name && deck2Name) {
            const globalDeck1Id = await ensureDeckInGlobal(deck1Name, deck1Colors, globalProject.id);
            const globalDeck2Id = await ensureDeckInGlobal(deck2Name, deck2Colors, globalProject.id);

            const globalBattleData = {
              ...battleData,
              deck1Id: globalDeck1Id,
              deck2Id: globalDeck2Id,
              projectId: globalProject.id
            };
            await addDoc(collection(db, 'battles'), globalBattleData);
          }
        }
      }

      setBattles(prev => [...prev, battleWithId]);

      // レートを全体再計算（時系列順で正しく計算）
      const updatedBattles = [...battles, battleWithId];
      const newRatings = initializeDeckRatings(updatedBattles, decks);
      setDeckRatings(newRatings);
      
      setShowBattleForm(false);
    } catch (error) {
      console.error('対戦結果の保存に失敗:', error);
      alert('対戦結果の保存に失敗しました');
    }
  };

  // 対戦削除
  const handleBattleDelete = (battleId: string) => {
    setBattles(prev => prev.filter(b => b.id !== battleId));

    const updatedBattles = battles.filter(b => b.id !== battleId);
    const newRatings = initializeDeckRatings(updatedBattles, decks);
    setDeckRatings(newRatings);
  };

  // トーナメント作成
  const handleTournamentCreate = async (tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'status' | 'bracket'>) => {
    try {
      const seed = Date.now(); // ランダムシード値を生成
      const bracket = generateBracket(tournamentData.participantDeckIds, tournamentData.format, seed);
      
      const newTournament = {
        ...tournamentData,
        status: 'in_progress' as const,
        bracket,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'tournaments'), newTournament);
      
      setTournaments([...tournaments, { ...newTournament, id: docRef.id }]);
      setCurrentView('tournaments');
    } catch (error) {
      console.error('トーナメント作成に失敗:', error);
      alert('トーナメントの作成に失敗しました');
    }
  };

  // 試合完了処理
  const handleMatchComplete = async (tournamentId: string, matchId: string, battle: Omit<Battle, 'id'>) => {
    try {
      // 対戦記録を保存
      const battleDocRef = await addDoc(collection(db, 'battles'), battle);
      
      // トーナメントを更新
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) return;

      const winnerId = battle.deck1Wins > battle.deck2Wins ? battle.deck1Id : battle.deck2Id;
      const loserId = battle.deck1Wins > battle.deck2Wins ? battle.deck2Id : battle.deck1Id;

      const updatedBracket = updateBracketWithResult(
        tournament.bracket,
        matchId,
        winnerId,
        loserId,
      );

      await updateDoc(doc(db, 'tournaments', tournamentId), {
        bracket: updatedBracket
      });

      // ローカル状態も更新
      const updatedTournaments = tournaments.map(t =>
        t.id === tournamentId ? { ...t, bracket: updatedBracket } : t
      );
      setTournaments(updatedTournaments);
      setSelectedTournament({ ...tournament, bracket: updatedBracket });
      
      // battles も更新
      const newBattle = { ...battle, id: battleDocRef.id };
      setBattles([...battles, newBattle]);
    } catch (error) {
      console.error('試合結果の保存に失敗:', error);
      alert('試合結果の保存に失敗しました');
    }
  };

  const handleTournamentComplete = async (tournamentId: string) => {
  try {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;

    const rankings = getFinalRankings(tournament.bracket);

    await updateDoc(doc(db, 'tournaments', tournamentId), {
      status: 'completed',
      completedAt: new Date(),
      winnerId: rankings.winner,
      runnerUpId: rankings.runnerUp,
      thirdPlaceIds: rankings.thirdPlace
    });

    // デッキに称号を付与する関数をここで定義
    const updateDeckTitle = async (deckId: string | null, rank: 1 | 2 | 3) => {
      if (!deckId) return;
      const deck = decks.find(d => d.id === deckId);
      if (!deck) return;

      const titles = deck.tournamentTitles || [];
      titles.push({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        rank,
        date: new Date()
      });

      await updateDoc(doc(db, 'decks', deckId), { tournamentTitles: titles });
    };

    // ランキングに応じて称号を付与
    await updateDeckTitle(rankings.winner, 1);
    await updateDeckTitle(rankings.runnerUp, 2);
    for (const thirdId of rankings.thirdPlace) {
      await updateDeckTitle(thirdId, 3);
    }

    // ローカル状態更新
    const updatedTournaments = tournaments.map(t =>
      t.id === tournamentId ? { ...t, status: 'completed' as const, ...rankings } : t
    );
    setTournaments(updatedTournaments);
    setCurrentView('tournaments');

  } catch (error) {
    console.error('トーナメント完了処理に失敗:', error);
    alert('トーナメントの完了処理に失敗しました');
  }
};

  // 勝率計算
  const getDeckWinRate = (deckId: string) => {
    const deckBattles = battles.filter(b => b.deck1Id === deckId || b.deck2Id === deckId);

    if (deckBattles.length === 0) return {
      winRate: 0,
      totalGames: 0,
      wins: 0,
      losses: 0,
      normalizedWinRate: 0,
      goingFirstRate: 0,
      goingFirstWinRate: 0,
      goingSecondWinRate: 0,
      rating: deckRatings[deckId] || 1500
    };

    let wins = 0;
    let losses = 0;
    let goingFirstGames = 0;
    let goingFirstWins = 0;
    let goingSecondGames = 0;
    let goingSecondWins = 0;

    const opponentStats: { [opponentId: string]: { wins: number; losses: number } } = {};

    deckBattles.forEach(battle => {
      const isPlayer1 = battle.deck1Id === deckId;
      const opponentId = isPlayer1 ? battle.deck2Id : battle.deck1Id;
      const myWins = isPlayer1 ? battle.deck1Wins : battle.deck2Wins;
      const myLosses = isPlayer1 ? battle.deck2Wins : battle.deck1Wins;
      const myGoingFirst = isPlayer1 ? battle.deck1GoingFirst : battle.deck2GoingFirst;

      wins += myWins;
      losses += myLosses;

      if (myGoingFirst === 1) {
        goingFirstGames++;
        goingFirstWins += myWins;
      } else {
        goingSecondGames++;
        goingSecondWins += myWins;
      }

      if (!opponentStats[opponentId]) {
        opponentStats[opponentId] = { wins: 0, losses: 0 };
      }
      opponentStats[opponentId].wins += myWins;
      opponentStats[opponentId].losses += myLosses;
    });

    const opponentWinRates = Object.values(opponentStats).map(stats => {
      const total = stats.wins + stats.losses;
      return total > 0 ? (stats.wins / total) * 100 : 0;
    });

    const normalizedWinRate = opponentWinRates.length > 0
      ? opponentWinRates.reduce((sum, rate) => sum + rate, 0) / opponentWinRates.length
      : 0;

    const totalGames = wins + losses;
    const totalGoingFirstSecond = goingFirstGames + goingSecondGames;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const goingFirstRate = totalGoingFirstSecond > 0 ? (goingFirstGames / totalGoingFirstSecond) * 100 : 0;
    const goingFirstWinRate = goingFirstGames > 0 ? (goingFirstWins / goingFirstGames) * 100 : 0;
    const goingSecondWinRate = goingSecondGames > 0 ? (goingSecondWins / goingSecondGames) * 100 : 0;

    return {
      winRate,
      totalGames,
      wins,
      losses,
      normalizedWinRate,
      goingFirstRate,
      goingFirstWinRate,
      goingSecondWinRate,
      rating: deckRatings[deckId] || 1500
    };
  };

  // ソート機能
  const getSortedDecks = () => {
    const sortedDecks = [...decks];

    switch (sortBy) {
      case 'winRate':
        return sortedDecks.sort((a, b) => getDeckWinRate(b.id).winRate - getDeckWinRate(a.id).winRate);
      case 'normalizedWinRate':
        return sortedDecks.sort((a, b) => getDeckWinRate(b.id).normalizedWinRate - getDeckWinRate(a.id).normalizedWinRate);
      case 'rating':
        return sortedDecks.sort((a, b) => getDeckWinRate(b.id).rating - getDeckWinRate(a.id).rating);
      case 'created':
        return sortedDecks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'name':
      default:
        return sortedDecks.sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  if (selectedDeck) {
    return (
      <DeckDetail
        deck={selectedDeck}
        battles={battles}
        allDecks={decks}
        onBack={() => setSelectedDeck(null)}
        onBattleDelete={handleBattleDelete}
        onDeckUpdate={(updatedDeck) => {
          // デッキ情報を更新
          setDecks(prev => prev.map(d => d.id === updatedDeck.id ? updatedDeck : d));
          setSelectedDeck(updatedDeck);
        }}
      />
    );
  }

  if (showAnalysis) {
    return (
      <Analysis
        project={project}
        decks={decks}
        battles={battles}
        onBack={() => setShowAnalysis(false)}
      />
    );
  }

  // トーナメント画面
  if (currentView === 'tournaments') {
    return (
      <div style={{ padding: '20px' }}>
        <button
          onClick={() => setCurrentView('decks')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          ← デッキ一覧に戻る
        </button>
        <TournamentList
          tournaments={tournaments}
          decks={decks}
          onTournamentSelect={(t: Tournament) => {
            setSelectedTournament(t);
            setCurrentView('tournament_detail');
          }}
          onCreateNew={() => setCurrentView('tournament_form')}
        />
      </div>
    );
  }

  if (currentView === 'tournament_form') {
    return (
      <div style={{ padding: '20px' }}>
        <TournamentForm
          projectId={project.id}
          decks={decks}
          onTournamentCreate={handleTournamentCreate}
          onCancel={() => setCurrentView('tournaments')}
        />
      </div>
    );
  }

 if (currentView === 'tournament_detail' && selectedTournament) {
  return (
    <TournamentDetail
      tournament={selectedTournament}
      decks={decks}
      battles={battles}
      deckRatings={deckRatings}
      onBack={() => setCurrentView('tournaments')}
      onMatchComplete={handleMatchComplete}
      onTournamentComplete={handleTournamentComplete}
    />
  );
}

  return (
    <div style={{ padding: '20px' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '1px solid #ddd'
      }}>
        <div>
          <h2>{project.name}</h2>
          <p style={{ color: '#666', margin: '5px 0' }}>{project.description}</p>
          {project.name !== '全体環境' && (
            <p style={{ color: '#28a745', fontSize: '14px', margin: '5px 0' }}>
              ※ この環境での戦績は自動的に「全体環境」にも反映されます
            </p>
          )}
        </div>
        <button
          onClick={onBackToProject}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          プロジェクト一覧に戻る
        </button>
      </div>

      {/* アクションボタン */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowDeckForm(true)}
          disabled={showDeckForm || showBattleForm}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (showDeckForm || showBattleForm) ? 0.6 : 1
          }}
        >
          + デッキ追加
        </button>

        <button
          onClick={() => setShowBattleForm(true)}
          disabled={showDeckForm || showBattleForm || decks.length < 2}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (showDeckForm || showBattleForm || decks.length < 2) ? 0.6 : 1
          }}
        >
          ⚔️ 対戦登録
        </button>

        <button
          onClick={() => setShowAnalysis(true)}
          disabled={showDeckForm || showBattleForm || battles.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ffc107',
            color: '#212529',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (showDeckForm || showBattleForm || battles.length === 0) ? 0.6 : 1
          }}
        >
          📊 詳細分析
        </button>

        <button
          onClick={() => setCurrentView('tournaments')}
          disabled={showDeckForm || showBattleForm}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (showDeckForm || showBattleForm) ? 0.6 : 1
          }}
        >
          🏆 トーナメント
        </button>

        <button
          onClick={() => {
            if (window.confirm('全デッキのレートを再計算しますか？\n\n全対戦履歴を時系列順に処理し直します。')) {
              const newRatings = initializeDeckRatings(battles, decks);
              setDeckRatings(newRatings);
              alert('レートを再計算しました！');
            }
          }}
          disabled={showDeckForm || showBattleForm || battles.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: (showDeckForm || showBattleForm || battles.length === 0) ? 0.6 : 1
          }}
        >
          🔄 レート再計算
        </button>
      </div>

      {/* フォーム */}
      {showDeckForm && (
        <DeckForm
          projectId={project.id}
          onDeckAdd={handleDeckAdd}
          onCancel={() => setShowDeckForm(false)}
        />
      )}

      {showBattleForm && (
        <BattleForm
          projectId={project.id}
          decks={decks}
          battles={battles}  
          onBattleAdd={handleBattleAdd}
          onCancel={() => setShowBattleForm(false)}
        />
      )}

      {/* ソート設定 */}
      {decks.length > 1 && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>並び順:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'winRate' | 'normalizedWinRate' | 'rating' | 'created')}
            style={{
              padding: '5px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="rating">レート順</option>
            <option value="winRate">通常勝率順</option>
            <option value="normalizedWinRate">均一化勝率順</option>
            <option value="name">名前順</option>
            <option value="created">作成日順</option>
          </select>
        </div>
      )}

      {/* デッキ一覧 */}
      <div>
        <h3>デッキ一覧 ({decks.length}個)</h3>
        {decks.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#6c757d', fontSize: '18px' }}>まだデッキがありません。</p>
            <p style={{ color: '#6c757d' }}>上のボタンから新しいデッキを追加してください。</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {getSortedDecks().map(deck => {
              const stats = getDeckWinRate(deck.id);
              return (
                <div key={deck.id} style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                    {/* デッキ画像 */}
                    {deck.imageUrl && (
                      <img 
                        src={deck.imageUrl} 
                        alt={deck.name}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '2px solid #ddd',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                        {deck.name}
                        {stats.totalGames > 0 && (
                          <>
                            <span style={{
                              marginLeft: '10px',
                              padding: '2px 8px',
                              backgroundColor: '#007bff',
                              borderRadius: '12px',
                              fontSize: '12px',
                              color: 'white'
                            }}>
                              レート: {stats.rating}
                            </span>
                            <span style={{
                              marginLeft: '5px',
                              padding: '2px 8px',
                              backgroundColor: '#e9ecef',
                              borderRadius: '12px',
                              fontSize: '12px',
                              color: '#495057'
                            }}>
                              勝率: {stats.winRate.toFixed(1)}%
                            </span>
                          </>
                        )}
                        {stats.totalGames === 0 && (
                          <span style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            backgroundColor: '#f8d7da',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#721c24'
                          }}>
                            未対戦 (レート: {stats.rating})
                          </span>
                        )}
                      </h4>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: '#666' }}>
                          色: {deck.colors && deck.colors.length > 0 ? deck.colors.join(', ') : '未設定'}
                        </span>
                        {stats.totalGames > 0 && (
                          <>
                            <span style={{ color: '#666', fontSize: '14px' }}>
                              {stats.wins}勝{stats.losses}敗 (計{stats.totalGames}戦)
                            </span>
                            <span style={{ color: '#666', fontSize: '14px' }}>
                              先攻率: {stats.goingFirstRate.toFixed(1)}%
                            </span>
                            {stats.goingFirstWinRate > 0 && (
                              <span style={{ color: '#666', fontSize: '14px' }}>
                                先攻時: {stats.goingFirstWinRate.toFixed(1)}%
                              </span>
                            )}
                            {stats.goingSecondWinRate > 0 && (
                              <span style={{ color: '#666', fontSize: '14px' }}>
                                後攻時: {stats.goingSecondWinRate.toFixed(1)}%
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => setSelectedDeck(deck)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        詳細
                      </button>
                      <button
                        onClick={() => handleDeckDelete(deck.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 統計サマリー */}
      {battles.length > 0 && (
        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>プロジェクト統計</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
            <div>
              <strong>総対戦数:</strong> {battles.length}回
            </div>
            <div>
              <strong>総ゲーム数:</strong> {battles.reduce((sum, b) => sum + b.deck1Wins + b.deck2Wins, 0)}ゲーム
            </div>
            <div>
              <strong>最新対戦:</strong> {battles.length > 0 ? battles[battles.length - 1].date.toLocaleDateString() : '-'}
            </div>
            <div>
              <strong>平均レート:</strong> {decks.length > 0 ? Math.round(Object.values(deckRatings).reduce((sum, rating) => sum + rating, 0) / Object.values(deckRatings).length) : 1500}
            </div>
            <div>
              <strong>最高レート:</strong> {Object.values(deckRatings).length > 0 ? Math.max(...Object.values(deckRatings)) : 1500}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckList;
