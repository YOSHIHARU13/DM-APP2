import React from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { DeckDetailProps } from '../../types';

interface DeckDetailWithDeleteProps extends DeckDetailProps {
  onBattleDelete?: (battleId: string) => void;
}

const DeckDetail: React.FC<DeckDetailWithDeleteProps> = ({ deck, battles, allDecks, onBack, onBattleDelete }) => {
  // このデッキの対戦データを取得
  const deckBattles = battles.filter(b => b.deck1Id === deck.id || b.deck2Id === deck.id);

  // 対戦削除
  const handleBattleDelete = async (battleId: string, opponentName: string, battleDate: string) => {
    const confirmed = window.confirm(
      `この対戦記録を削除しますか？\n\n対戦相手: ${opponentName}\n日時: ${battleDate}\n\n※この操作は取り消せません。`
    );
    
    if (!confirmed) return;

    try {
      // Firestoreから削除（展開されたデータかチェック）
      if (!battleId.includes('_game_')) {
        await deleteDoc(doc(db, 'battles', battleId));
      }
      
      // 親コンポーネントに削除を通知
      if (onBattleDelete) {
        onBattleDelete(battleId);
      }
      
      console.log('対戦記録が削除されました:', battleId);
    } catch (error) {
      console.error('対戦記録の削除に失敗:', error);
      alert('対戦記録の削除に失敗しました');
    }
  };

  // 対戦相手別の統計
  const getOpponentStats = () => {
    const opponentStats: { [opponentId: string]: { wins: number; losses: number; battles: number } } = {};

    deckBattles.forEach(battle => {
      const isPlayer1 = battle.deck1Id === deck.id;
      const opponentId = isPlayer1 ? battle.deck2Id : battle.deck1Id;
      const wins = isPlayer1 ? battle.deck1Wins : battle.deck2Wins;
      const losses = isPlayer1 ? battle.deck2Wins : battle.deck1Wins;

      if (!opponentStats[opponentId]) {
        opponentStats[opponentId] = { wins: 0, losses: 0, battles: 0 };
      }

      opponentStats[opponentId].wins += wins;
      opponentStats[opponentId].losses += losses;
      opponentStats[opponentId].battles += 1;
    });

    return opponentStats;
  };

  const opponentStats = getOpponentStats();

  // 全体統計
  const totalWins = Object.values(opponentStats).reduce((sum, stats) => sum + stats.wins, 0);
  const totalLosses = Object.values(opponentStats).reduce((sum, stats) => sum + stats.losses, 0);
  const totalGames = totalWins + totalLosses;
  const overallWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

  // 先攻・後攻統計
  const getGoingFirstStats = () => {
    let goingFirstGames = 0;
    let goingFirstWins = 0;
    let goingSecondGames = 0;
    let goingSecondWins = 0;

    deckBattles.forEach(battle => {
      const isPlayer1 = battle.deck1Id === deck.id;
      const myWins = isPlayer1 ? battle.deck1Wins : battle.deck2Wins;
      const myGoingFirst = isPlayer1 ? battle.deck1GoingFirst : battle.deck2GoingFirst;

      if (myGoingFirst === 1) {
        goingFirstGames++;
        goingFirstWins += myWins;
      } else {
        goingSecondGames++;
        goingSecondWins += myWins;
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

  // デッキ名取得
  const getDeckName = (deckId: string) => {
    const foundDeck = allDecks.find(d => d.id === deckId);
    return foundDeck ? foundDeck.name : '不明なデッキ';
  };

  // 最近の調子（直近5戦）
  const getRecentForm = () => {
    const recentBattles = deckBattles
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

    return recentBattles.map(battle => {
      const isPlayer1 = battle.deck1Id === deck.id;
      const wins = isPlayer1 ? battle.deck1Wins : battle.deck2Wins;
      const losses = isPlayer1 ? battle.deck2Wins : battle.deck1Wins;
      return wins > losses ? 'W' : losses > wins ? 'L' : 'D';
    });
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
        <div>
          <h2>{deck.name} - 詳細統計</h2>
          <p style={{ color: '#666', margin: '5px 0' }}>
            色: {deck.colors.length > 0 ? deck.colors.join(', ') : '未設定'} | 
            作成日: {deck.createdAt.toLocaleDateString()}
          </p>
        </div>
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

      {deckBattles.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px' 
        }}>
          <p style={{ color: '#6c757d', fontSize: '18px' }}>まだ対戦データがありません。</p>
        </div>
      ) : (
        <div>
          {/* 全体統計 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: '15px', 
            marginBottom: '30px' 
          }}>
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#1976d2' }}>全体勝率</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                {overallWinRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {totalWins}勝{totalLosses}敗
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#e8f5e8', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#388e3c' }}>先攻率</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
                {goingFirstStats.goingFirstRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                先攻{goingFirstStats.goingFirstGames}回/後攻{goingFirstStats.goingSecondGames}回
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#f57c00' }}>先攻時勝率</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f57c00' }}>
                {goingFirstStats.goingFirstWinRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                先攻時の成績
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fce4ec', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#c2185b' }}>後攻時勝率</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c2185b' }}>
                {goingFirstStats.goingSecondWinRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                後攻時の成績
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f3e5f5', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#7b1fa2' }}>最近の調子</h4>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7b1fa2', letterSpacing: '2px' }}>
                {recentForm.join('') || '-'}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                直近5戦
              </div>
            </div>
          </div>

          {/* 対戦相手別統計 */}
          <div style={{ marginBottom: '30px' }}>
            <h3>対戦相手別成績</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {Object.entries(opponentStats)
                .sort(([, a], [, b]) => {
                  const aRate = (a.wins / (a.wins + a.losses)) * 100;
                  const bRate = (b.wins / (b.wins + b.losses)) * 100;
                  return bRate - aRate;
                })
                .map(([opponentId, stats]) => {
                  const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1);
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
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .map(battle => {
                  const isPlayer1 = battle.deck1Id === deck.id;
                  const opponentId = isPlayer1 ? battle.deck2Id : battle.deck1Id;
                  const myWins = isPlayer1 ? battle.deck1Wins : battle.deck2Wins;
                  const opponentWins = isPlayer1 ? battle.deck2Wins : battle.deck1Wins;
                  const won = myWins > opponentWins;
                  const myGoingFirst = isPlayer1 ? battle.deck1GoingFirst : battle.deck2GoingFirst;
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
      )}
    </div>
  );
};

export default DeckDetail;
