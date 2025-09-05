// DeckList.tsxの先頭に追加してテスト
useEffect(() => {
  const testFirestore = async () => {
    try {
      console.log('Firestore接続テスト開始');
      const testDoc = await addDoc(collection(db, 'test'), {
        message: 'Hello Firestore',
        timestamp: new Date()
      });
      console.log('Firestore接続成功:', testDoc.id);
    } catch (error) {
      console.error('Firestore接続エラー:', error);
    }
  };
  
  testFirestore();
}, []);

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
  Timestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Deck, Battle, DeckListProps } from '../../types';
import DeckForm from './DeckForm';
import BattleForm from '../battle/BattleForm';
import DeckDetail from './DeckDetail';
import Analysis from '../analysis/Analysis';

const DeckList: React.FC<DeckListProps> = ({ project, onBackToProject }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [showDeckForm, setShowDeckForm] = useState<boolean>(false);
  const [showBattleForm, setShowBattleForm] = useState<boolean>(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'name' | 'winRate' | 'normalizedWinRate' | 'created'>('name');
  const [loading, setLoading] = useState<boolean>(true);

  // Firestoreからデータ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // デッキを読み込み
        const decksRef = collection(db, 'decks');
        const decksQuery = query(decksRef, where('projectId', '==', project.id));
        const decksSnapshot = await getDocs(decksQuery);

        const loadedDecks: Deck[] = [];
        decksSnapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;

          // createdAt を Date に統一
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
            createdAt,
            projectId: data.projectId ?? ''
          });
        });

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

          loadedBattles.push({
            id: docSnap.id,
            deck1Id: data.deck1Id ?? '',
            deck2Id: data.deck2Id ?? '',
            deck1Wins: data.deck1Wins ?? 0,
            deck2Wins: data.deck2Wins ?? 0,
            deck1GoingFirst: data.deck1GoingFirst ?? 0,
            deck2GoingFirst: data.deck2GoingFirst ?? 0,
            memo: data.memo ?? '',
            date,
            projectId: data.projectId ?? ''
          });
        });

        setDecks(loadedDecks);
        setBattles(loadedBattles);
      } catch (error) {
        console.error('データの読み込みに失敗:', error);
        alert('データの読み込みに失敗しました');
      } finally {
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
        createdAt: newDeck.createdAt,
        projectId: newDeck.projectId
      };

      const docRef = await addDoc(collection(db, 'decks'), deckData);

      const deckWithId = {
        ...newDeck,
        id: docRef.id
      };

      setDecks(prev => [...prev, deckWithId]);
      setShowDeckForm(false);

      console.log('デッキが保存されました:', docRef.id);
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

        // デッキを削除
        batch.delete(doc(db, 'decks', deckId));

        // 関連する対戦データを削除
        const relatedBattles = battles.filter(b => b.deck1Id === deckId || b.deck2Id === deckId);
        relatedBattles.forEach(battle => {
          batch.delete(doc(db, 'battles', battle.id));
        });

        await batch.commit();

        // ローカルステートを更新
        setDecks(prev => prev.filter(d => d.id !== deckId));
        setBattles(prev => prev.filter(b => b.deck1Id !== deckId && b.deck2Id !== deckId));

        console.log('デッキと関連データが削除されました:', deckId);
      } catch (error) {
        console.error('デッキの削除に失敗:', error);
        alert('デッキの削除に失敗しました');
      }
    }
  };

  // 対戦追加
  const handleBattleAdd = async (newBattle: Battle) => {
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

      const battleWithId = {
        ...newBattle,
        id: docRef.id
      };

      setBattles(prev => [...prev, battleWithId]);
      setShowBattleForm(false);

      console.log('対戦結果が保存されました:', docRef.id);
    } catch (error) {
      console.error('対戦結果の保存に失敗:', error);
      alert('対戦結果の保存に失敗しました');
    }
  };

  // 勝率計算（先攻後攻統計付き）
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
      goingSecondWinRate: 0
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

      // 古いデータ対応：先攻情報がない場合は0として扱う
      const myGoingFirst = isPlayer1 ? (battle.deck1GoingFirst || 0) : (battle.deck2GoingFirst || 0);
      const myGoingSecond = isPlayer1 ? (battle.deck2GoingFirst || 0) : (battle.deck1GoingFirst || 0);

      wins += myWins;
      losses += myLosses;

      // 先攻後攻の統計（データがある場合のみ）
      if (battle.deck1GoingFirst !== undefined && battle.deck2GoingFirst !== undefined) {
        goingFirstGames += myGoingFirst;
        goingSecondGames += myGoingSecond;

        if (myGoingFirst + myGoingSecond > 0) {
          const myGoingFirstRate = myGoingFirst / (myGoingFirst + myGoingSecond);
          goingFirstWins += Math.round(myWins * myGoingFirstRate);
          goingSecondWins += myWins - Math.round(myWins * myGoingFirstRate);
        }
      }

      // 対戦相手別統計
      if (!opponentStats[opponentId]) {
        opponentStats[opponentId] = { wins: 0, losses: 0 };
      }
      opponentStats[opponentId].wins += myWins;
      opponentStats[opponentId].losses += myLosses;
    });

    // 均一化勝率計算
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
      goingSecondWinRate
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

  // 詳細画面表示中
  if (selectedDeck) {
    return (
      <DeckDetail
        deck={selectedDeck}
        battles={battles}
        allDecks={decks}
        onBack={() => setSelectedDeck(null)}
      />
    );
  }

  // 分析画面表示中
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
            onChange={(e) => setSortBy(e.target.value as 'name' | 'winRate' | 'normalizedWinRate' | 'created')}
            style={{
              padding: '5px 10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="name">名前順</option>
            <option value="winRate">通常勝率順</option>
            <option value="normalizedWinRate">均一化勝率順</option>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>
                        {deck.name}
                        {stats.totalGames > 0 && (
                          <span style={{
                            marginLeft: '10px',
                            padding: '2px 8px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#495057'
                          }}>
                            通常: {stats.winRate.toFixed(1)}% | 均一: {stats.normalizedWinRate.toFixed(1)}%
                          </span>
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
                            未対戦
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckList;


