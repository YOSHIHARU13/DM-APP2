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
  balance: number;
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
      if (compatibility[battle.deck1Id] && compatibility[battle.deck1Id][battle.deck2Id]) {
        compatibility[battle.deck1Id][battle.deck2Id].wins += battle.deck1Wins;
        compatibility[battle.deck1Id][battle.deck2Id].losses += battle.deck2Wins;
      }

      if (compatibility[battle.deck2Id] && compatibility[battle.deck2Id][battle.deck1Id]) {
        compatibility[battle.deck2Id][battle.deck1Id].wins += battle.deck2Wins;
        compatibility[battle.deck2Id][battle.deck1Id].losses += battle.deck1Wins;
      }
    });

    Object.keys(compatibility).forEach(deckId => {
      Object.keys(compatibility[deckId]).forEach(opponentId => {
        const data = compatibility[deckId][opponentId];
        data.totalGames = data.wins + data.losses;
        data.winRate = data.totalGames > 0 ? (data.wins / data.totalGames) * 100 : 0;
      });
    });

    return compatibility;
  };

  // N-すくみ関係発見
  const findCycles = (): CycleData[] => {
    const compatibility = calculateCompatibility();
    const cycles: CycleData[] = [];
    const maxCycleSize = Math.min(5, decks.length);

    for (let cycleSize = 3; cycleSize <= maxCycleSize; cycleSize++) {
      findCyclesOfSize(cycleSize, compatibility, cycles);
    }

    return cycles.sort((a, b) => b.avgWinRate - a.avgWinRate);
  };

  const findCyclesOfSize = (size: number, compatibility: CompatibilityData, cycles: CycleData[]) => {
    const indices = Array.from({ length: decks.length }, (_, i) => i);
    
    const checkCycle = (indices: number[]) => {
      const cycleDecks = indices.map(i => decks[i]);
      const winRates: number[] = [];
      
      for (let i = 0; i < size; i++) {
        const nextIndex = (i + 1) % size;
        const deck1 = cycleDecks[i];
        const deck2 = cycleDecks[nextIndex];
        
        const winRate = compatibility[deck1.id]?.[deck2.id]?.winRate || 0;
        const totalGames = compatibility[deck1.id]?.[deck2.id]?.totalGames || 0;
        
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

        if (totalGames1 + totalGames2 >= 5) {
          const balance = Math.abs(deck1WinRate - 50);
          
          if (balance <= 15) {
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

    return rivalries.sort((a, b) => a.balance - b.balance);
  };

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

      let normalizedWinRate = 0;
      let opponentCount = 0;
      
      decks.forEach(opponent => {
        if (opponent.id !== deck.id) {
          const oppWinRate = compatibility[deck.id]?.[opponent.id]?.winRate;
          const oppTotalGames = compatibility[deck.id]?.[opponent.id]?.totalGames || 0;
          
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

  // 色の取得
  const getCellColor = (winRate: number) => {
    if (winRate === 0) return '#f8f9fa';
    if (winRate >= 70) return '#28a745';
    if (winRate >= 60) return '#5cb85c';
    if (winRate >= 55) return '#90ee90';
    if (winRate >= 45) return '#ffc107';
    if (winRate >= 40) return '#ff8c69';
    if (winRate >= 30) return '#ff6347';
    return '#dc3545';
  };

  const getTextColor = (winRate: number) => {
    if (winRate === 0) return '#999';
    if (winRate >= 55 || winRate <= 45) return 'white';
    return '#333';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '100%', margin: '0 auto' }}>
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
        <h2 style={{ margin: 0, fontSize: '20px' }}>戦績分析</h2>
      </div>

      {/* タブナビゲーション */}
      <div style={{ 
        display: 'flex', 
        gap: '5px', 
        marginBottom: '20px',
        borderBottom: '2px solid #dee2e6',
        overflowX: 'auto'
      }}>
        {[
          { key: 'matrix', label: '相性' },
          { key: 'cycles', label: 'すくみ' },
          { key: 'rivalries', label: '拮抗' },
          { key: 'rankings', label: 'ランク' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 15px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #007bff' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.key ? '#007bff' : '#6c757d',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              fontSize: '14px',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 相性マトリックス - 表形式（スマホ対応） */}
      {activeTab === 'matrix' && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>相性ヒートマップ</h3>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '12px' }}>
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>緑</span>=有利、
            <span style={{ color: '#ffc107', fontWeight: 'bold' }}>黄</span>=互角、
            <span style={{ color: '#dc3545', fontWeight: 'bold' }}>赤</span>=不利
          </p>

          {Object.keys(compatibility).length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '11px',
                minWidth: '300px'
              }}>
                <thead>
                  <tr>
                    <th style={{ 
                      padding: '8px 4px', 
                      border: '1px solid #ddd',
                      backgroundColor: '#f8f9fa',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10,
                      minWidth: '60px',
                      maxWidth: '60px'
                    }}>
                      vs
                    </th>
                    {decks.map(deck => (
                      <th key={deck.id} style={{ 
                        padding: '8px 4px', 
                        border: '1px solid #ddd',
                        backgroundColor: '#f8f9fa',
                        minWidth: '50px',
                        maxWidth: '50px',
                        fontSize: '10px',
                        lineHeight: '1.2'
                      }}>
                        <div style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {deck.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decks.map(deck => (
                    <tr key={deck.id}>
                      <th style={{ 
                        padding: '8px 4px', 
                        border: '1px solid #ddd',
                        backgroundColor: '#f8f9fa',
                        textAlign: 'left',
                        position: 'sticky',
                        left: 0,
                        zIndex: 9,
                        minWidth: '60px',
                        maxWidth: '60px',
                        fontSize: '10px',
                        lineHeight: '1.2'
                      }}>
                        <div style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {deck.name}
                        </div>
                      </th>
                      {decks.map(opponent => {
                        if (deck.id === opponent.id) {
                          return (
                            <td key={opponent.id} style={{ 
                              padding: '8px 4px',
                              border: '1px solid #ddd',
                              backgroundColor: '#e9ecef',
                              textAlign: 'center'
                            }}>
                              -
                            </td>
                          );
                        }

                        const data = compatibility[deck.id]?.[opponent.id];
                        const winRate = data?.winRate || 0;
                        const totalGames = data?.totalGames || 0;

                        return (
                          <td key={opponent.id} style={{ 
                            padding: '6px 4px',
                            border: '1px solid #ddd',
                            backgroundColor: getCellColor(winRate),
                            color: getTextColor(winRate),
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '11px'
                          }}>
                            {totalGames > 0 ? (
                              <div>
                                <div>{winRate.toFixed(0)}%</div>
                                <div style={{ fontSize: '9px', opacity: 0.8 }}>
                                  {data.wins}-{data.losses}
                                </div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '14px' }}>対戦データがありません。</p>
            </div>
          )}
        </div>
      )}

      {/* すくみ関係 */}
      {activeTab === 'cycles' && (
        <div>
          <h3 style={{ fontSize: '16px' }}>すくみ関係</h3>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '12px' }}>
            3すくみ以上の循環的な相性関係を表示
          </p>

          {cycles.length > 0 ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              {cycles.map((cycle, index) => (
                <div key={index} style={{ 
                  padding: '15px', 
                  border: '2px solid #007bff', 
                  borderRadius: '8px',
                  backgroundColor: 'white'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '10px',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#007bff' }}>
                      {cycle.decks.length}すくみ
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      padding: '3px 8px',
                      backgroundColor: '#e7f3ff',
                      borderRadius: '4px'
                    }}>
                      平均{cycle.avgWinRate.toFixed(0)}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cycle.decks.map((deck, i) => {
                      const nextDeck = cycle.decks[(i + 1) % cycle.decks.length];
                      const winRate = cycle.winRates[i];

                      return (
                        <div key={i} style={{ 
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {deck.name}
                          </div>
                          <div style={{ 
                            padding: '4px 8px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '11px'
                          }}>
                            {winRate.toFixed(0)}% →
                          </div>
                          <div style={{ fontWeight: 'bold', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nextDeck.name}
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
              <p style={{ color: '#6c757d', fontSize: '14px' }}>すくみ関係が見つかりませんでした</p>
            </div>
          )}
        </div>
      )}

      {/* 拮抗デッキ */}
      {activeTab === 'rivalries' && (
        <div>
          <h3 style={{ fontSize: '16px' }}>拮抗デッキ</h3>
          <p style={{ color: '#666', marginBottom: '15px', fontSize: '12px' }}>
            勝率が拮抗(35-65%)しているペア
          </p>

          {rivalries.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {rivalries.map((rivalry, index) => (
                <div key={index} style={{ 
                  padding: '15px', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: 'white'
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#007bff',
                    marginBottom: '8px',
                    fontWeight: 'bold'
                  }}>
                    総対戦数: {rivalry.totalGames}回
                  </div>

                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                        {rivalry.deck1.name}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: rivalry.deck1WinRate >= 50 ? '#28a745' : '#dc3545' }}>
                        {rivalry.deck1WinRate.toFixed(0)}%
                      </div>
                    </div>

                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#999' }}>
                      VS
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                        {rivalry.deck2.name}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: rivalry.deck2WinRate >= 50 ? '#28a745' : '#dc3545' }}>
                        {rivalry.deck2WinRate.toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    height: '6px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      backgroundColor: '#666'
                    }} />
                    <div style={{ 
                      height: '100%',
                      width: `${rivalry.deck1WinRate}%`,
                      backgroundColor: rivalry.deck1WinRate >= 50 ? '#28a745' : '#dc3545'
                    }} />
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
              <p style={{ color: '#6c757d', fontSize: '14px' }}>拮抗ペアが見つかりませんでした</p>
            </div>
          )}
        </div>
      )}

      {/* ランキング */}
      {activeTab === 'rankings' && (
        <div>
          <h3 style={{ fontSize: '16px' }}>デッキランキング</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <div style={{ 
              display: 'inline-flex',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '3px',
              fontSize: '12px'
            }}>
              <button
                onClick={() => setRankingSortType('normal')}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: rankingSortType === 'normal' ? '#007bff' : 'white',
                  color: rankingSortType === 'normal' ? 'white' : '#007bff',
                  cursor: 'pointer',
                  fontWeight: rankingSortType === 'normal' ? 'bold' : 'normal',
                  fontSize: '12px'
                }}
              >
                通常勝率
              </button>
              <button
                onClick={() => setRankingSortType('normalized')}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: rankingSortType === 'normalized' ? '#007bff' : 'white',
                  color: rankingSortType === 'normalized' ? 'white' : '#007bff',
                  cursor: 'pointer',
                  fontWeight: rankingSortType === 'normalized' ? 'bold' : 'normal',
                  fontSize: '12px'
                }}
              >
                均一化
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {[...rankings]
              .sort((a, b) => rankingSortType === 'normal' ? b.winRate - a.winRate : b.normalizedWinRate - a.normalizedWinRate)
              .map((ranking, index) => {
              const rank = index + 1;
              const getRankColor = (rank: number) => {
                if (rank === 1) return '#ffd700';
                if (rank === 2) return '#c0c0c0';
                if (rank === 3) return '#cd7f32';
                return '#f8f9fa';
              };

              return (
                <div key={ranking.deck.id} style={{ 
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr auto',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  backgroundColor: getRankColor(rank),
                  fontSize: '12px'
                }}>
                  <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}位`}
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {ranking.deck.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {ranking.wins}勝{ranking.losses}敗 ({ranking.totalGames}戦)
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#007bff' }}>
                      {rankingSortType === 'normal' ? ranking.winRate.toFixed(1) : ranking.normalizedWinRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
