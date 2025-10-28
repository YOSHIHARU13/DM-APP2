import React, { useState } from 'react';
import { AnalysisProps, CompatibilityData, TriangleData } from '../../types';

// 新しい型定義
interface CycleData {
  decks: any[];
  winRates: number[];
  avgWinRate: number;
}

interface RivalryData {
  deck1: any;
  deck2: any;
  deck1WinRate: number;
  deck2WinRate: number;
  totalGames: number;
  balance: number; // 50%からの乖離度（小さいほど拮抗）
}

const Analysis: React.FC<AnalysisProps> = ({ project, decks, battles, onBack }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'cycles' | 'rivalries' | 'rankings'>('matrix');
  const [rankingSortType, setRankingSortType] = useState<'normal' | 'normalized'>('normal');

  // 相性マトリックス計算
  const calculateCompatibility = (): CompatibilityData => {
    const compatibility: CompatibilityData = {};

    decks.forEach(deck => {
      compatibility[deck.id] = {};
      decks.forEach(opponent => {
        if (deck.id !== opponent.id) {
          compatibility[deck.id][opponent.id] = {
            wins: 0,
            losses: 0,
            winRate: 0,
            totalGames: 0
          };
        }
      });
    });

    battles.forEach(battle => {
      // デッキ1の視点
      if (compatibility[battle.deck1Id] && compatibility[battle.deck1Id][battle.deck2Id]) {
        compatibility[battle.deck1Id][battle.deck2Id].wins += battle.deck1Wins;
        compatibility[battle.deck1Id][battle.deck2Id].losses += battle.deck2Wins;
      }

      // デッキ2の視点
      if (compatibility[battle.deck2Id] && compatibility[battle.deck2Id][battle.deck1Id]) {
        compatibility[battle.deck2Id][battle.deck1Id].wins += battle.deck2Wins;
        compatibility[battle.deck2Id][battle.deck1Id].losses += battle.deck1Wins;
      }
    });

    // 勝率計算
    Object.keys(compatibility).forEach(deckId => {
      Object.keys(compatibility[deckId]).forEach(opponentId => {
        const data = compatibility[deckId][opponentId];
        data.totalGames = data.wins + data.losses;
        data.winRate = data.totalGames > 0 ? (data.wins / data.totalGames) * 100 : 0;
      });
    });

    return compatibility;
  };

  // N-すくみ関係発見（3すくみ、4すくみ、5すくみに対応）
  const findCycles = (): CycleData[] => {
    const compatibility = calculateCompatibility();
    const cycles: CycleData[] = [];
    const maxCycleSize = Math.min(5, decks.length); // 最大5すくみまで

    // 3すくみから順に探索
    for (let cycleSize = 3; cycleSize <= maxCycleSize; cycleSize++) {
      findCyclesOfSize(cycleSize, compatibility, cycles);
    }

    // 平均勝率でソート
    return cycles.sort((a, b) => b.avgWinRate - a.avgWinRate);
  };

  // 指定サイズのサイクルを探索
  const findCyclesOfSize = (size: number, compatibility: CompatibilityData, cycles: CycleData[]) => {
    const indices = Array.from({ length: decks.length }, (_, i) => i);
    
    const checkCycle = (indices: number[]) => {
      const cycleDecks = indices.map(i => decks[i]);
      const winRates: number[] = [];
      
      // サイクルの各辺をチェック
      for (let i = 0; i < size; i++) {
        const nextIndex = (i + 1) % size;
        const deck1 = cycleDecks[i];
        const deck2 = cycleDecks[nextIndex];
        
        const winRate = compatibility[deck1.id]?.[deck2.id]?.winRate || 0;
        const totalGames = compatibility[deck1.id]?.[deck2.id]?.totalGames || 0;
        
        // 最低2戦以上、かつ55%以上の勝率が必要
        if (totalGames < 2 || winRate < 55) {
          return null;
        }
        
        winRates.push(winRate);
      }
      
      const avgWinRate = winRates.reduce((sum, rate) => sum + rate, 0) / winRates.length;
      
      return {
        decks: cycleDecks,
        winRates,
        avgWinRate
      };
    };

    // 組み合わせを生成して探索
    const combinations = (arr: number[], k: number): number[][] => {
      if (k === 0) return [[]];
      if (arr.length === 0) return [];
      
      const [first, ...rest] = arr;
      const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
      const withoutFirst = combinations(rest, k);
      
      return [...withFirst, ...withoutFirst];
    };

    const combs = combinations(indices, size);
    
    for (const comb of combs) {
      const cycle = checkCycle(comb);
      if (cycle) {
        // 重複チェック（同じデッキの組み合わせは除外）
        const isDuplicate = cycles.some(existing => {
          const existingIds = new Set(existing.decks.map(d => d.id));
          return cycle.decks.every(d => existingIds.has(d.id)) && 
                 existing.decks.length === cycle.decks.length;
        });
        
        if (!isDuplicate) {
          cycles.push(cycle);
        }
      }
    }
  };

  // 拮抗デッキの検出
  const findRivalries = (): RivalryData[] => {
    const compatibility = calculateCompatibility();
    const rivalries: RivalryData[] = [];

    for (let i = 0; i < decks.length; i++) {
      for (let j = i + 1; j < decks.length; j++) {
        const deck1 = decks[i];
        const deck2 = decks[j];

        const deck1WinRate = compatibility[deck1.id]?.[deck2.id]?.winRate || 0;
        const deck2WinRate = compatibility[deck2.id]?.[deck1.id]?.winRate || 0;
        const totalGames1 = compatibility[deck1.id]?.[deck2.id]?.totalGames || 0;
        const totalGames2 = compatibility[deck2.id]?.[deck1.id]?.totalGames || 0;

        // 最低5戦以上あり、両者の勝率が45-55%の範囲内
        if (totalGames1 + totalGames2 >= 5) {
          const balance = Math.abs(deck1WinRate - 50);
          
          if (balance <= 15) { // 35-65%の範囲を拮抗とみなす
            rivalries.push({
              deck1,
              deck2,
              deck1WinRate,
              deck2WinRate,
              totalGames: totalGames1 + totalGames2,
              balance
            });
          }
        }
      }
    }

    // バランス度（50%に近い順）でソート
    return rivalries.sort((a, b) => a.balance - b.balance);
  };

  // デッキランキング計算（通常勝率と均一化勝率）
  const calculateRankings = () => {
    const compatibility = calculateCompatibility();
    
    return decks.map(deck => {
      const deckBattles = battles.filter(b => b.deck1Id === deck.id || b.deck2Id === deck.id);
      let wins = 0;
      let losses = 0;

      deckBattles.forEach(battle => {
        if (battle.deck1Id === deck.id) {
          wins += battle.deck1Wins;
          losses += battle.deck2Wins;
        } else {
          wins += battle.deck2Wins;
          losses += battle.deck1Wins;
        }
      });

      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      // 均一化勝率の計算
      let normalizedWinRate = 0;
      let opponentCount = 0;
      
      decks.forEach(opponent => {
        if (opponent.id !== deck.id) {
          const oppWinRate = compatibility[deck.id]?.[opponent.id]?.winRate;
          const oppTotalGames = compatibility[deck.id]?.[opponent.id]?.totalGames || 0;
          
          // 対戦がある相手のみカウント
          if (oppTotalGames > 0) {
            normalizedWinRate += oppWinRate || 0;
            opponentCount++;
          }
        }
      });
      
      normalizedWinRate = opponentCount > 0 ? normalizedWinRate / opponentCount : 0;

      return {
        deck,
        wins,
        losses,
        totalGames,
        winRate,
        normalizedWinRate,
        opponentCount,
        battles: deckBattles.length
      };
    }).sort((a, b) => b.winRate - a.winRate);
  };

  const compatibility = calculateCompatibility();
  const cycles = findCycles();
  const rivalries = findRivalries();
  const rankings = calculateRankings();

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={onBack} style={{ 
          color: '#007bff', 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer', 
          fontSize: '16px',
          padding: '5px 0',
          marginBottom: '10px'
        }}>
          ← 戻る
        </button>
        <h2 style={{ margin: 0 }}>戦績分析</h2>
      </div>

      {/* タブナビゲーション */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #dee2e6',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'matrix' ? '3px solid #007bff' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'matrix' ? '#007bff' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'matrix' ? 'bold' : 'normal',
            fontSize: '15px'
          }}
        >
          相性
        </button>
        <button
          onClick={() => setActiveTab('cycles')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'cycles' ? '3px solid #007bff' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'cycles' ? '#007bff' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'cycles' ? 'bold' : 'normal',
            fontSize: '15px'
          }}
        >
          すくみ
        </button>
        <button
          onClick={() => setActiveTab('rivalries')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'rivalries' ? '3px solid #007bff' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'rivalries' ? '#007bff' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'rivalries' ? 'bold' : 'normal',
            fontSize: '15px'
          }}
        >
          拮抗
        </button>
        <button
          onClick={() => setActiveTab('rankings')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'rankings' ? '3px solid #007bff' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'rankings' ? '#007bff' : '#6c757d',
            cursor: 'pointer',
            fontWeight: activeTab === 'rankings' ? 'bold' : 'normal',
            fontSize: '15px'
          }}
        >
          ランキング
        </button>
      </div>

      {/* 相性マトリックス - スマホ対応版 */}
      {activeTab === 'matrix' && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>相性ヒートマップ</h3>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '13px' }}>
            各デッキの相性を色で表示。<span style={{ color: '#28a745', fontWeight: 'bold' }}>緑</span>=有利、<span style={{ color: '#dc3545', fontWeight: 'bold' }}>赤</span>=不利
          </p>

          {Object.keys(compatibility).length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gap: '12px'
            }}>
              {decks.map(deck => {
                const deckCompat = compatibility[deck.id];
                if (!deckCompat) return null;

                // このデッキの全対戦相手との勝率を計算
                const matchups = decks
                  .filter(opp => opp.id !== deck.id)
                  .map(opponent => ({
                    opponent,
                    ...deckCompat[opponent.id]
                  }))
                  .filter(m => m.totalGames > 0);

                if (matchups.length === 0) return null;

                return (
                  <div 
                    key={deck.id} 
                    style={{ 
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* デッキ名 */}
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      paddingBottom: '8px',
                      borderBottom: '2px solid #f0f0f0'
                    }}>
                      {deck.imageUrl && (
                        <img 
                          src={deck.imageUrl} 
                          alt={deck.name}
                          style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid #ddd'
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                          {deck.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          {deck.colors.join(', ')}
                        </div>
                      </div>
                    </div>

                    {/* 対戦相手一覧 */}
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {matchups
                        .sort((a, b) => b.winRate - a.winRate)
                        .map(matchup => {
                          const getColor = (winRate: number) => {
                            if (winRate >= 65) return '#28a745';
                            if (winRate >= 55) return '#90ee90';
                            if (winRate >= 45) return '#ffc107';
                            if (winRate >= 35) return '#ff8c69';
                            return '#dc3545';
                          };

                          const getIcon = (winRate: number) => {
                            if (winRate >= 65) return '✓✓';
                            if (winRate >= 55) return '✓';
                            if (winRate >= 45) return '=';
                            if (winRate >= 35) return '✗';
                            return '✗✗';
                          };

                          return (
                            <div
                              key={matchup.opponent.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '28px 1fr 60px',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#f8f9fa',
                                fontSize: '13px'
                              }}
                            >
                              {/* アイコン */}
                              <div style={{ 
                                textAlign: 'center',
                                fontWeight: 'bold',
                                color: getColor(matchup.winRate),
                                fontSize: '14px'
                              }}>
                                {getIcon(matchup.winRate)}
                              </div>

                              {/* 相手デッキ名 */}
                              <div style={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {matchup.opponent.name}
                              </div>

                              {/* 勝率 */}
                              <div style={{ 
                                textAlign: 'right',
                                fontWeight: 'bold',
                                color: getColor(matchup.winRate),
                                fontSize: '14px'
                              }}>
                                {matchup.winRate.toFixed(0)}%
                                <span style={{ 
                                  fontSize: '10px',
                                  color: '#999',
                                  marginLeft: '3px'
                                }}>
                                  ({matchup.wins}-{matchup.losses})
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '16px' }}>対戦データがありません。</p>
            </div>
          )}
        </div>
      )}

      {/* すくみ関係 */}
      {activeTab === 'cycles' && (
        <div>
          <h3>すくみ関係</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            3すくみ以上の関係を自動検出。A→B→C→Aのような循環的な相性関係を表示します。
          </p>

          {cycles.length > 0 ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              {cycles.map((cycle, index) => (
                <div key={index} style={{ 
                  padding: '20px', 
                  border: '2px solid #007bff', 
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '15px' 
                  }}>
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 'bold',
                      color: '#007bff'
                    }}>
                      {cycle.decks.length}すくみ
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      padding: '4px 10px',
                      backgroundColor: '#e7f3ff',
                      borderRadius: '4px'
                    }}>
                      平均勝率: {cycle.avgWinRate.toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {cycle.decks.map((deck, i) => {
                      const nextDeck = cycle.decks[(i + 1) % cycle.decks.length];
                      const winRate = cycle.winRates[i];

                      return (
                        <div key={i}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '15px',
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px'
                          }}>
                            {/* 現在のデッキ */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                {deck.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {deck.colors.join(', ')}
                              </div>
                            </div>

                            {/* 勝率 */}
                            <div style={{ 
                              padding: '6px 12px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              whiteSpace: 'nowrap'
                            }}>
                              {winRate.toFixed(0)}% →
                            </div>

                            {/* 次のデッキ */}
                            <div style={{ flex: 1, textAlign: 'right' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                {nextDeck.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {nextDeck.colors.join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>すくみ関係が見つかりませんでした。</p>
              <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
                （各対戦相手に2戦以上、55%以上の勝率で循環する関係を検出）
              </p>
            </div>
          )}
        </div>
      )}

      {/* 拮抗デッキ */}
      {activeTab === 'rivalries' && (
        <div>
          <h3>拮抗デッキ</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            勝率が拮抗している（35-65%）デッキペアを表示。好勝負が期待できる組み合わせです。
          </p>

          {rivalries.length > 0 ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              {rivalries.map((rivalry, index) => {
                return (
                  <div key={index} style={{ 
                    padding: '20px', 
                    border: '1px solid #ddd', 
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                  }}>
                    {/* 対戦回数 */}
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#007bff',
                      marginBottom: '10px',
                      fontWeight: 'bold'
                    }}>
                      総対戦数: {rivalry.totalGames}回
                    </div>

                    {/* デッキ情報 */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '15px',
                      marginBottom: '15px'
                    }}>
                      {/* デッキ1 */}
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px',
                          marginBottom: '5px'
                        }}>
                          {rivalry.deck1.name}
                        </div>
                        <div style={{ 
                          fontSize: '13px',
                          color: '#666',
                          marginBottom: '8px'
                        }}>
                          {rivalry.deck1.colors.join(', ')}
                        </div>
                        <div style={{ 
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: rivalry.deck1WinRate >= 50 ? '#28a745' : '#dc3545'
                        }}>
                          {rivalry.deck1WinRate.toFixed(1)}%
                        </div>
                      </div>

                      {/* VS */}
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: '#999'
                      }}>
                        VS
                      </div>

                      {/* デッキ2 */}
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px',
                          marginBottom: '5px'
                        }}>
                          {rivalry.deck2.name}
                        </div>
                        <div style={{ 
                          fontSize: '13px',
                          color: '#666',
                          marginBottom: '8px'
                        }}>
                          {rivalry.deck2.colors.join(', ')}
                        </div>
                        <div style={{ 
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: rivalry.deck2WinRate >= 50 ? '#28a745' : '#dc3545'
                        }}>
                          {rivalry.deck2WinRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* バランスバー */}
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ 
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '5px',
                        textAlign: 'center'
                      }}>
                        拮抗度: {(100 - rivalry.balance * 2).toFixed(0)}% 
                        <span style={{ marginLeft: '8px', fontSize: '11px' }}>
                          (50%±{rivalry.balance.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ 
                        height: '8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{ 
                          position: 'absolute',
                          left: '50%',
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          backgroundColor: '#666'
                        }} />
                        <div style={{ 
                          height: '100%',
                          width: `${rivalry.deck1WinRate}%`,
                          backgroundColor: rivalry.deck1WinRate >= 50 ? '#28a745' : '#dc3545',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>拮抗しているデッキペアが見つかりませんでした。</p>
              <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
                （5戦以上、35-65%の勝率範囲のペアを検出）
              </p>
            </div>
          )}
        </div>
      )}

      {/* デッキランキング */}
      {activeTab === 'rankings' && (
        <div>
          <h3>デッキランキング</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            デッキの強さをランキング表示。「通常勝率」と「均一化勝率」で切り替えできます。
          </p>

          {/* 勝率タイプ切り替え */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'inline-flex',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '4px'
            }}>
              <button
                onClick={() => setRankingSortType('normal')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: rankingSortType === 'normal' ? '#007bff' : 'white',
                  color: rankingSortType === 'normal' ? 'white' : '#007bff',
                  cursor: 'pointer',
                  fontWeight: rankingSortType === 'normal' ? 'bold' : 'normal',
                  marginRight: '4px',
                  transition: 'all 0.2s'
                }}
              >
                通常勝率
              </button>
              <button
                onClick={() => setRankingSortType('normalized')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: rankingSortType === 'normalized' ? '#007bff' : 'white',
                  color: rankingSortType === 'normalized' ? 'white' : '#007bff',
                  cursor: 'pointer',
                  fontWeight: rankingSortType === 'normalized' ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                均一化勝率
              </button>
            </div>
            <div style={{ 
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#e7f3ff',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#004085'
            }}>
              💡 <strong>均一化勝率</strong>: 各対戦相手への勝率を平均化した値。特定デッキばかりと対戦している偏りを補正します。
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {[...rankings]
              .sort((a, b) => rankingSortType === 'normal' 
                ? b.winRate - a.winRate 
                : b.normalizedWinRate - a.normalizedWinRate
              )
              .map((ranking, index) => {
              const rank = index + 1;
              const getRankColor = (rank: number) => {
                if (rank === 1) return '#ffd700';
                if (rank === 2) return '#c0c0c0';
                if (rank === 3) return '#cd7f32';
                return '#f8f9fa';
              };

              const getRankIcon = (rank: number) => {
                if (rank === 1) return '🥇';
                if (rank === 2) return '🥈';
                if (rank === 3) return '🥉';
                return `${rank}位`;
              };

              const winRateDiff = ranking.normalizedWinRate - ranking.winRate;
              const showNormalizedInfo = ranking.opponentCount > 0;

              return (
                <div key={ranking.deck.id} style={{ 
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr auto auto auto',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '15px', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: getRankColor(rank),
                  boxShadow: rank <= 3 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}>
                  <div style={{ 
                    textAlign: 'center', 
                    fontSize: '18px', 
                    fontWeight: 'bold' 
                  }}>
                    {getRankIcon(rank)}
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      {ranking.deck.name}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px' }}>
                      {ranking.deck.colors.join(', ')}
                    </div>
                    {showNormalizedInfo && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        marginTop: '4px'
                      }}>
                        対戦相手: {ranking.opponentCount}種類
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#007bff' }}>
                      {ranking.winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>通常勝率</div>
                    {showNormalizedInfo && (
                      <>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: '14px', 
                          color: '#28a745',
                          marginTop: '4px'
                        }}>
                          {ranking.normalizedWinRate.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          均一化 ({winRateDiff >= 0 ? '+' : ''}{winRateDiff.toFixed(1)}%)
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {ranking.wins}勝{ranking.losses}敗
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {ranking.totalGames}ゲーム
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {ranking.battles}回
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>対戦</div>
                  </div>
                </div>
              );
            })}
          </div>

          {rankings.length === 0 && (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>対戦データがありません。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analysis;
