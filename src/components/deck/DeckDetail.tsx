import React from 'react';
import { DeckDetailProps } from '../../types';

const DeckDetail: React.FC<DeckDetailProps> = ({ deck, battles, allDecks, onBack }) => {
  // このデッキの対戦データを取得
  const deckBattles = battles.filter(b => b.deck1Id === deck.id || b.deck2Id === deck.id);

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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
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
              <h4 style={{ margin: '0 0 5px 0', color: '#388e3c' }}>総対戦回数</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
                {deckBattles.length}回
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {totalGames}ゲーム
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 5px 0', color: '#f57c00' }}>最近の調子</h4>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f57c00', letterSpacing: '2px' }}>
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

                  return (
                    <div key={battle.id} style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      borderRadius: '4px',
                      backgroundColor: won ? '#e8f5e8' : '#ffebee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <span style={{ fontWeight: 'bold' }}>
                          vs {getDeckName(opponentId)}
                        </span>
                        <span style={{ 
                          marginLeft: '10px',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          backgroundColor: won ? '#4caf50' : '#f44336',
                          color: 'white'
                        }}>
                          {won ? '勝利' : '敗北'}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {myWins} - {opponentWins}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {battle.date.toLocaleDateString()}
                        </div>
                      </div>
                      {battle.memo && (
                        <div style={{ 
                          marginLeft: '15px', 
                          padding: '4px 8px', 
                          backgroundColor: 'rgba(0,0,0,0.1)', 
                          borderRadius: '4px',
                          fontSize: '12px',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {battle.memo}
                        </div>
                      )}
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