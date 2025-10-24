import React, { useState } from 'react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { DeckDetailProps, Deck } from '../../types';

interface DeckDetailWithDeleteProps extends DeckDetailProps {
  onBattleDelete?: (battleId: string) => void;
  onDeckUpdate?: (updatedDeck: Deck) => void;
}

// Eloレーティング計算
const calculateEloRating = (currentRating: number, opponentRating: number, isWin: boolean, kFactor: number = 32): number => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
  const actualScore = isWin ? 1 : 0;
  return Math.round(currentRating + kFactor * (actualScore - expectedScore));
};

const DeckDetail: React.FC<DeckDetailWithDeleteProps> = ({ deck, battles, allDecks, onBack, onBattleDelete, onDeckUpdate }) => {
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(deck.imageUrl || '');
  const [imagePreview, setImagePreview] = useState(deck.imageUrl || '');

  // 画像URL変更時のプレビュー
  const handleImageUrlChange = (url: string) => {
    setNewImageUrl(url);
    if (url.trim()) {
      setImagePreview(url);
    } else {
      setImagePreview('');
    }
  };

  // 画像保存
  const handleSaveImage = async () => {
    try {
      // Firestoreを更新
      await updateDoc(doc(db, 'decks', deck.id), {
        imageUrl: newImageUrl.trim() || null
      });

      // 親コンポーネントに通知
      if (onDeckUpdate) {
        onDeckUpdate({
          ...deck,
          imageUrl: newImageUrl.trim() || undefined
        });
      }

      setIsEditingImage(false);
      alert('画像を更新しました');
    } catch (error) {
      console.error('画像更新に失敗:', error);
      alert('画像の更新に失敗しました');
    }
  };

  // 画像編集キャンセル
  const handleCancelEdit = () => {
    setNewImageUrl(deck.imageUrl || '');
    setImagePreview(deck.imageUrl || '');
    setIsEditingImage(false);
  };

  // このデッキの対戦データを取得
  const deckBattles = battles.filter(b => b.deck1Id === deck.id || b.deck2Id === deck.id);

  // デッキ名取得（安全版）
  const getDeckName = (deckId: string) => {
    const foundDeck = allDecks.find(d => d.id === deckId);
    return foundDeck ? foundDeck.name : '不明なデッキ';
  };

  // レート履歴計算（エラーハンドリング強化）
  const calculateRatingHistory = () => {
    try {
      const ratingHistory: {date: Date, rating: number, opponent: string, result: string}[] = [];
      
      // 全デッキの初期レート設定（安全に）
      const allRatings: {[deckId: string]: number} = {};
      allDecks.forEach(d => { 
        if (d && d.id) {
          allRatings[d.id] = 1500; 
        }
      });

      // 時系列順にソート（日付の有効性チェック）
      const validBattles = battles.filter(battle => 
        battle && 
        battle.date && 
        battle.deck1Id && 
        battle.deck2Id &&
        !isNaN(battle.date.getTime())
      );

      const sortedBattles = validBattles.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      sortedBattles.forEach(battle => {
        try {
          const deck1Rating = allRatings[battle.deck1Id] || 1500;
          const deck2Rating = allRatings[battle.deck2Id] || 1500;
          const deck1Won = (battle.deck1Wins || 0) > (battle.deck2Wins || 0);
          
          // レート更新
          allRatings[battle.deck1Id] = calculateEloRating(deck1Rating, deck2Rating, deck1Won);
          allRatings[battle.deck2Id] = calculateEloRating(deck2Rating, deck1Rating, !deck1Won);
          
          // このデッキに関わる対戦の場合、履歴に追加
          if (battle.deck1Id === deck.id || battle.deck2Id === deck.id) {
            const isPlayer1 = battle.deck1Id === deck.id;
            const opponentId = isPlayer1 ? battle.deck2Id : battle.deck1Id;
            const won = isPlayer1 ? deck1Won : !deck1Won;
            const newRating = allRatings[deck.id] || 1500;
            
            ratingHistory.push({
              date: battle.date,
              rating: newRating,
              opponent: getDeckName(opponentId),
              result: won ? '勝利' : '敗北'
            });
          }
        } catch (err) {
          console.warn('個別戦績処理でエラー:', err, battle);
        }
      });

      return ratingHistory;
    } catch (error) {
      console.error('レート履歴計算でエラー:', error);
      return [];
    }
  };

  const ratingHistory = calculateRatingHistory();
  const currentRating = ratingHistory.length > 0 ? ratingHistory[ratingHistory.length - 1].rating : 1500;
  const peakRating = ratingHistory.length > 0 ? Math.max(...ratingHistory.map(h => h.rating)) : 1500;

  // 対戦削除
  const handleBattleDelete = async (battleId: string, opponentName: string, battleDate: string) => {
    const confirmed = window.confirm(
      `この対戦記録を削除しますか？\n\n対戦相手: ${opponentName}\n日時: ${battleDate}\n\n※この操作は取り消せません。`
    );
    
    if (!confirmed) return;

    try {
      if (!battleId.includes('_game_')) {
        await deleteDoc(doc(db, 'battles', battleId));
      }
      
      if (onBattleDelete) {
        onBattleDelete(battleId);
      }
      
      console.log('対戦記録が削除されました:', battleId);
    } catch (error) {
      console.error('対戦記録の削除に失敗:', error);
      alert('対戦記録の削除に失敗しました');
    }
  };

  // 対戦相手別の統計（安全版）
  const getOpponentStats = () => {
    const opponentStats: { [opponentId: string]: { wins: number; losses: number; battles: number } } = {};

    deckBattles.forEach(battle => {
      try {
        const isPlayer1 = battle.deck1Id === deck.id;
        const opponentId = isPlayer1 ? battle.deck2Id : battle.deck1Id;
        const wins = isPlayer1 ? (battle.deck1Wins || 0) : (battle.deck2Wins || 0);
        const losses = isPlayer1 ? (battle.deck2Wins || 0) : (battle.deck1Wins || 0);

        if (!opponentStats[opponentId]) {
          opponentStats[opponentId] = { wins: 0, losses: 0, battles: 0 };
        }

        opponentStats[opponentId].wins += wins;
        opponentStats[opponentId].losses += losses;
        opponentStats[opponentId].battles += 1;
      } catch (err) {
        console.warn('対戦相手統計でエラー:', err, battle);
      }
    });

    return opponentStats;
  };

  const opponentStats = getOpponentStats();

  // 全体統計
  const totalWins = Object.values(opponentStats).reduce((sum, stats) => sum + stats.wins, 0);
  const totalLosses = Object.values(opponentStats).reduce((sum, stats) => sum + stats.losses, 0);
  const totalGames = totalWins + totalLosses;
  const overallWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

  // 先攻・後攻統計（安全版）
  const getGoingFirstStats = () => {
    let goingFirstGames = 0;
    let goingFirstWins = 0;
    let goingSecondGames = 0;
    let goingSecondWins = 0;

    deckBattles.forEach(battle => {
      try {
        const isPlayer1 = battle.deck1Id === deck.id;
        const myWins = isPlayer1 ? (battle.deck1Wins || 0) : (battle.deck2Wins || 0);
        const myGoingFirst = isPlayer1 ? (battle.deck1GoingFirst || 0) : (battle.deck2GoingFirst || 0);

        if (myGoingFirst === 1) {
          goingFirstGames++;
          goingFirstWins += myWins;
        } else {
          goingSecondGames++;
          goingSecondWins += myWins;
        }
      } catch (err) {
        console.warn('先攻後攻統計でエラー:', err, battle);
      }
    });

    const totalGoingFirstSecond = goingFirstGames + goingSecondGames;
    const goingFirstRate = totalGoingFirstSecond > 0 ? (goingFirstGames / totalGoingFirstSecond) * 100 : 0;
    const goingFirstWinRate = goingFirstGames > 0 ? (goingFirstWins / goingFirstGames) * 100 : 0;
    const goingSecondWinRate = goingSecondGames > 0 ? (goingSecondWins / goingSecondGames) * 100 : 0;

    return {
      goingFirstRate,
      goingFirstWinRate,
      goingSecondWinRate,
      goingFirstGames,
      goingSecondGames
    };
  };

  const goingFirstStats = getGoingFirstStats();

  // 最近の調子（直近5戦）
  const getRecentForm = () => {
    try {
      const recentBattles = deckBattles
        .filter(battle => battle && battle.date && !isNaN(battle.date.getTime()))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

      return recentBattles.map(battle => {
        const isPlayer1 = battle.deck1Id === deck.id;
        const wins = isPlayer1 ? (battle.deck1Wins || 0) : (battle.deck2Wins || 0);
        const losses = isPlayer1 ? (battle.deck2Wins || 0) : (battle.deck1Wins || 0);
        return wins > losses ? '勝' : '敗';
      });
    } catch (error) {
      console.error('最近の調子計算でエラー:', error);
      return [];
    }
  };

  const recentForm = getRecentForm();

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
        <h2>{deck.name} - 詳細</h2>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          戻る
        </button>
      </div>

      {/* デッキ画像と基本情報 */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: 'white',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '20px'
      }}>
        {/* 左側：画像 */}
        <div>
          <div style={{
            width: '150px',
            height: '150px',
            border: '2px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {(isEditingImage ? imagePreview : deck.imageUrl) ? (
              <img
                src={isEditingImage ? imagePreview : deck.imageUrl}
                alt={deck.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={() => {
                  if (isEditingImage) {
                    setImagePreview('');
                    alert('画像の読み込みに失敗しました。URLを確認してください。');
                  }
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🖼️</div>
                <div style={{ fontSize: '12px' }}>画像なし</div>
              </div>
            )}
          </div>

          {/* 画像編集UI */}
          {isEditingImage ? (
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="画像URL"
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}
              />
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={handleSaveImage}
                  style={{
                    flex: 1,
                    padding: '6px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  保存
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    flex: 1,
                    padding: '6px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingImage(true)}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '6px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📝 画像を{deck.imageUrl ? '変更' : '追加'}
            </button>
          )}
        </div>

        {/* 右側：基本情報 */}
        <div>
          <h3 style={{ marginTop: 0 }}>基本情報</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div>
              <strong>デッキ名:</strong> {deck.name}
            </div>
            <div>
              <strong>色:</strong> {deck.colors && deck.colors.length > 0 ? deck.colors.join(', ') : '未設定'}
            </div>
            <div>
              <strong>作成日:</strong> {deck.createdAt.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* 対戦データがある場合のみ表示 */}
      {deckBattles.length > 0 ? (
        <div>
          {/* 統計サマリー */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '15px',
            marginBottom: '30px'
          }}>
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>現在のレート</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                {currentRating}
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>最高レート</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
                {peakRating}
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e8f5e9', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>全体勝率</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                {overallWinRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {totalWins}勝{totalLosses}敗
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f3e5f5', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>総対戦数</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>
                {deckBattles.length}回
              </div>
            </div>
          </div>

          {/* 最近の調子 */}
          {recentForm.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3>最近の調子 (直近5戦)</h3>
              <div style={{ display: 'flex', gap: '5px' }}>
                {recentForm.map((result, index) => (
                  <div key={index} style={{ 
                    padding: '10px 15px',
                    backgroundColor: result === '勝' ? '#4caf50' : '#f44336',
                    color: 'white',
                    borderRadius: '6px',
                    fontWeight: 'bold'
                  }}>
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 先攻・後攻統計 */}
          <div style={{ marginBottom: '30px' }}>
            <h3>先攻・後攻統計</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px' 
            }}>
              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e1f5fe', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>先攻率</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0277bd' }}>
                  {goingFirstStats.goingFirstRate.toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  {goingFirstStats.goingFirstGames}試合
                </div>
              </div>

              <div style={{ 
                padding: '15px', 
                backgroundColor: '#e8f5e9', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>先攻時勝率</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#388e3c' }}>
                  {goingFirstStats.goingFirstWinRate.toFixed(1)}%
                </div>
              </div>

              <div style={{ 
                padding: '15px', 
                backgroundColor: '#fff3e0', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>後攻時勝率</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f57c00' }}>
                  {goingFirstStats.goingSecondWinRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* レート履歴 */}
          {ratingHistory.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3>レート履歴</h3>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid #ddd', 
                borderRadius: '6px',
                backgroundColor: 'white'
              }}>
                {ratingHistory.slice(-10).reverse().map((history, index) => (
                  <div key={index} style={{ 
                    padding: '8px 12px', 
                    borderBottom: index < 9 ? '1px solid #eee' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span style={{ fontWeight: 'bold' }}>vs {history.opponent}</span>
                      <span style={{ 
                        marginLeft: '10px',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        backgroundColor: history.result === '勝利' ? '#4caf50' : '#f44336',
                        color: 'white'
                      }}>
                        {history.result}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {history.rating}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {history.date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 対戦相手別統計 */}
          <div style={{ marginBottom: '30px' }}>
            <h3>対戦相手別成績</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {Object.entries(opponentStats)
                .sort(([, a], [, b]) => {
                  const aRate = a.wins + a.losses > 0 ? (a.wins / (a.wins + a.losses)) * 100 : 0;
                  const bRate = b.wins + b.losses > 0 ? (b.wins / (b.wins + b.losses)) * 100 : 0;
                  return bRate - aRate;
                })
                .map(([opponentId, stats]) => {
                  const winRate = stats.wins + stats.losses > 0 ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1) : '0.0';
                  const isAdvantage = parseFloat(winRate) >= 60;
                  const isDisadvantage = parseFloat(winRate) <= 40;
                  
                  return (
                    <div key={opponentId} style={{ 
                      padding: '12px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px',
                      backgroundColor: isAdvantage ? '#e8f5e8' : isDisadvantage ? '#ffebee' : 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong>{getDeckName(opponentId)}</strong>
                        <span style={{ 
                          marginLeft: '10px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          backgroundColor: isAdvantage ? '#4caf50' : isDisadvantage ? '#f44336' : '#ffc107',
                          color: 'white'
                        }}>
                          {isAdvantage ? '有利' : isDisadvantage ? '不利' : '互角'}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {stats.wins}勝{stats.losses}敗 ({winRate}%)
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {stats.battles}回対戦
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 対戦履歴 */}
          <div>
            <h3>対戦履歴 (新しい順)</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {deckBattles
                .filter(battle => battle && battle.date && !isNaN(battle.date.getTime()))
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map(battle => {
                  const isPlayer1 = battle.deck1Id === deck.id;
                  const opponentId = isPlayer1 ? battle.deck2Id : battle.deck1Id;
                  const myWins = isPlayer1 ? (battle.deck1Wins || 0) : (battle.deck2Wins || 0);
                  const opponentWins = isPlayer1 ? (battle.deck2Wins || 0) : (battle.deck1Wins || 0);
                  const won = myWins > opponentWins;
                  const myGoingFirst = isPlayer1 ? (battle.deck1GoingFirst || 0) : (battle.deck2GoingFirst || 0);
                  const isGoingFirst = myGoingFirst === 1;
                  const opponentName = getDeckName(opponentId);
                  const battleDate = battle.date.toLocaleDateString();

                  return (
                    <div key={battle.id} style={{ 
                      padding: '12px', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px',
                      backgroundColor: won ? '#e8f5e8' : '#ffebee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold' }}>
                            vs {opponentName}
                          </span>
                          <span style={{ 
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            backgroundColor: won ? '#4caf50' : '#f44336',
                            color: 'white'
                          }}>
                            {won ? '勝利' : '敗北'}
                          </span>
                          <span style={{ 
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            backgroundColor: isGoingFirst ? '#2196f3' : '#ff9800',
                            color: 'white'
                          }}>
                            {isGoingFirst ? '先攻' : '後攻'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {battleDate}
                          {battle.memo && (
                            <span style={{ 
                              marginLeft: '10px', 
                              padding: '2px 6px', 
                              backgroundColor: 'rgba(0,0,0,0.1)', 
                              borderRadius: '4px'
                            }}>
                              {battle.memo}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold' }}>
                            {myWins} - {opponentWins}
                          </div>
                        </div>
                        
                        {onBattleDelete && (
                          <button
                            onClick={() => handleBattleDelete(battle.id, opponentName, battleDate)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            title="この対戦記録を削除"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px' 
        }}>
          <p style={{ color: '#6c757d', fontSize: '18px' }}>まだ対戦データがありません。</p>
        </div>
      )}
    </div>
  );
};

export default DeckDetail;
