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

  // セルの色を決定
  const getCellColor = (winRate: number, totalGames: number) => {
    if (totalGames === 0) return '#f8f9fa';
    if (winRate >= 70) return '#d4edda';
    if (winRate >= 60) return '#d1ecf1';
    if (winRate >= 40) return '#fff3cd';
    return '#f8d7da';
  };

  // セルのテキスト色を決定
  const getCellTextColor = (winRate: number, totalGames: number) => {
    if (totalGames === 0) return '#6c757d';
    if (winRate >= 60) return '#155724';
    if (winRate >= 40) return '#856404';
    return '#721c24';
  };

  // 勝率に応じた矢印の太さを計算
  const getArrowWidth = (winRate: number) => {
    if (winRate >= 80) return 4;
    if (winRate >= 70) return 3.5;
    if (winRate >= 60) return 3;
    return 2.5;
  };

  // 勝率に応じた矢印の色を計算
  const getArrowColor = (winRate: number) => {
    if (winRate >= 80) return '#0056b3'; // 濃い青
    if (winRate >= 70) return '#007bff'; // 通常の青
    if (winRate >= 60) return '#17a2b8'; // シアン系
    return '#6c757d'; // グレー
  };

  // サイクルのSVG描画（3-5すくみに対応）
  const renderCycleSVG = (cycle: CycleData, index: number) => {
    const size = cycle.decks.length;
    const centerX = 150;
    const centerY = 120;
    const radius = 80;

    // デッキの配置位置を計算
    const positions = cycle.decks.map((_, i) => {
      const angle = (i * 2 * Math.PI) / size - Math.PI / 2; // -90度から開始
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    return (
      <svg width="300" height="260" viewBox="0 0 300 260">
        {/* 背景の多角形 */}
        <polygon
          points={positions.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#ddd"
          strokeWidth="2"
        />

        {/* 矢印の定義（複数の色に対応） */}
        <defs>
          {[
            { id: 'arrow-strong', color: '#0056b3' },
            { id: 'arrow-medium', color: '#007bff' },
            { id: 'arrow-weak', color: '#17a2b8' },
            { id: 'arrow-veryWeak', color: '#6c757d' }
          ].map(arrow => (
            <marker key={arrow.id} id={arrow.id} markerWidth="10" markerHeight="7" 
              refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={arrow.color} />
            </marker>
          ))}
        </defs>

        {/* 矢印線 */}
        {cycle.decks.map((_, i) => {
          const nextIndex = (i + 1) % size;
          const start = positions[i];
          const end = positions[nextIndex];
          
          // 矢印を短くするための計算
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const shortenStart = 25; // 開始点からの距離
          const shortenEnd = 25; // 終了点からの距離
          
          const startX = start.x + (dx / length) * shortenStart;
          const startY = start.y + (dy / length) * shortenStart;
          const endX = end.x - (dx / length) * shortenEnd;
          const endY = end.y - (dy / length) * shortenEnd;

          const winRate = cycle.winRates[i];
          const arrowWidth = getArrowWidth(winRate);
          const arrowColor = getArrowColor(winRate);
          
          const markerUrl = winRate >= 80 ? 'url(#arrow-strong)' :
                           winRate >= 70 ? 'url(#arrow-medium)' :
                           winRate >= 60 ? 'url(#arrow-weak)' :
                           'url(#arrow-veryWeak)';

          return (
            <g key={i}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={arrowColor}
                strokeWidth={arrowWidth}
                markerEnd={markerUrl}
              />
              {/* 勝率表示 */}
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 5}
                textAnchor="middle"
                fontSize="11"
                fill={arrowColor}
                fontWeight="bold"
              >
                {winRate.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* デッキ名とアイコン */}
        {cycle.decks.map((deck, i) => {
          const pos = positions[i];
          return (
            <g key={i}>
              {/* 背景円 */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="20"
                fill="white"
                stroke="#007bff"
                strokeWidth="2"
              />
              {/* デッキ名 */}
              <text
                x={pos.x}
                y={pos.y + 35}
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
              >
                {deck.name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

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
          <h2>{project.name} - 詳細分析</h2>
          <p style={{ color: '#666', margin: '5px 0' }}>
            {decks.length}デッキ, {battles.length}対戦, {battles.reduce((sum, b) => sum + b.deck1Wins + b.deck2Wins, 0)}ゲーム
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

      {/* タブナビゲーション */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #ddd', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {[
          { key: 'matrix', label: '相性マトリックス' },
          { key: 'cycles', label: '循環関係' },
          { key: 'rivalries', label: '拮抗デッキ' },
          { key: 'rankings', label: 'デッキランキング' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #007bff' : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              color: activeTab === tab.key ? '#007bff' : '#666'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 相性マトリックス */}
      {activeTab === 'matrix' && (
        <div>
          <h3>相性マトリックス</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            縦軸が使用デッキ、横軸が対戦相手です。数値は勝率(%)を表示しています。
          </p>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              minWidth: '600px' 
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    backgroundColor: '#f8f9fa',
                    position: 'sticky',
                    left: 0,
                    zIndex: 10
                  }}>
                    使用デッキ \ 対戦相手
                  </th>
                  {decks.map(deck => (
                    <th key={deck.id} style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      backgroundColor: '#f8f9fa',
                      minWidth: '100px'
                    }}>
                      {deck.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decks.map(deck => (
                  <tr key={deck.id}>
                    <td style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd', 
                      fontWeight: 'bold',
                      backgroundColor: '#f8f9fa',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5
                    }}>
                      {deck.name}
                    </td>
                    {decks.map(opponent => {
                      if (deck.id === opponent.id) {
                        return (
                          <td key={opponent.id} style={{ 
                            padding: '10px', 
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
                          padding: '10px', 
                          border: '1px solid #ddd',
                          backgroundColor: getCellColor(winRate, totalGames),
                          color: getCellTextColor(winRate, totalGames),
                          textAlign: 'center',
                          fontWeight: totalGames > 0 ? 'bold' : 'normal'
                        }}>
                          {totalGames > 0 ? (
                            <>
                              <div>{winRate.toFixed(1)}%</div>
                              <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                ({data.wins}-{data.losses})
                              </div>
                            </>
                          ) : (
                            <span style={{ opacity: 0.5 }}>未対戦</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px' 
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>凡例</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#d4edda', border: '1px solid #ddd' }} />
                <span>有利 (70%+)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#d1ecf1', border: '1px solid #ddd' }} />
                <span>やや有利 (60-69%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#fff3cd', border: '1px solid #ddd' }} />
                <span>五分 (40-59%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: '#f8d7da', border: '1px solid #ddd' }} />
                <span>不利 (-39%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 循環関係（N-すくみ） */}
      {activeTab === 'cycles' && (
        <div>
          <h3>循環関係（じゃんけん構造）</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            A → B → C → A のような循環する有利不利関係を自動検出しています。
            3すくみから5すくみまで対応しています。矢印の太さと色は勝率の強さを表します。
          </p>

          {cycles.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>循環関係が見つかりませんでした。</p>
              <p style={{ color: '#6c757d' }}>
                各デッキ間で2戦以上かつ55%以上の勝率が必要です。
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {cycles.map((cycle, index) => (
                <div key={index} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '20px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 15px 0' }}>
                    {cycle.decks.length}すくみ #{index + 1} 
                    <span style={{ 
                      marginLeft: '10px', 
                      fontSize: '14px', 
                      color: '#007bff',
                      fontWeight: 'normal' 
                    }}>
                      (平均勝率: {cycle.avgWinRate.toFixed(1)}%)
                    </span>
                  </h4>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    minHeight: '260px'
                  }}>
                    {renderCycleSVG(cycle, index)}
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${cycle.decks.length}, 1fr)`, 
                    gap: '10px',
                    marginTop: '15px'
                  }}>
                    {cycle.decks.map((deck, i) => {
                      const nextIndex = (i + 1) % cycle.decks.length;
                      const nextDeck = cycle.decks[nextIndex];
                      const winRate = cycle.winRates[i];
                      
                      return (
                        <div key={i} style={{ 
                          textAlign: 'center', 
                          padding: '8px', 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: '4px' 
                        }}>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{deck.name}</div>
                          <div style={{ fontSize: '12px', color: getArrowColor(winRate) }}>
                            vs {nextDeck.name}
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold',
                            color: getArrowColor(winRate) 
                          }}>
                            {winRate.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px' 
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>矢印の意味</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '4px', 
                  backgroundColor: '#0056b3' 
                }} />
                <span>非常に有利 (80%+) - 太い濃い青</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '3.5px', 
                  backgroundColor: '#007bff' 
                }} />
                <span>有利 (70-79%) - 太い青</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '3px', 
                  backgroundColor: '#17a2b8' 
                }} />
                <span>やや有利 (60-69%) - シアン</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '40px', 
                  height: '2.5px', 
                  backgroundColor: '#6c757d' 
                }} />
                <span>微有利 (55-59%) - グレー</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 拮抗デッキ */}
      {activeTab === 'rivalries' && (
        <div>
          <h3>拮抗デッキ</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            勝率が拮抗している（35-65%の範囲）デッキペアを表示します。
            実力が試される好カードです。
          </p>

          {rivalries.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>拮抗しているデッキペアが見つかりませんでした。</p>
              <p style={{ color: '#6c757d' }}>
                最低5戦以上のデータが必要です。
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {rivalries.map((rivalry, index) => {
                const balancePercent = 50 - rivalry.balance;
                const isVeryClose = rivalry.balance <= 5;
                
                return (
                  <div key={index} style={{ 
                    border: isVeryClose ? '2px solid #28a745' : '1px solid #ddd',
                    borderRadius: '8px', 
                    padding: '20px',
                    backgroundColor: 'white',
                    boxShadow: isVeryClose ? '0 4px 8px rgba(40,167,69,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '15px'
                    }}>
                      <h4 style={{ margin: 0 }}>
                        拮抗ペア #{index + 1}
                        {isVeryClose && (
                          <span style={{ 
                            marginLeft: '10px',
                            fontSize: '12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            超接戦
                          </span>
                        )}
                      </h4>
                      <div style={{ 
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        総対戦数: {rivalry.totalGames}戦
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '20px',
                      alignItems: 'center'
                    }}>
                      {/* デッキ1 */}
                      <div style={{ 
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '8px'
                        }}>
                          {rivalry.deck1.name}
                        </div>
                        <div style={{ 
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: rivalry.deck1WinRate >= 50 ? '#28a745' : '#dc3545'
                        }}>
                          {rivalry.deck1WinRate.toFixed(1)}%
                        </div>
                        <div style={{ 
                          fontSize: '12px',
                          color: '#666',
                          marginTop: '4px'
                        }}>
                          {rivalry.deck1.colors.join(', ')}
                        </div>
                      </div>

                      {/* VS表示 */}
                      <div style={{ 
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#007bff'
                      }}>
                        VS
                      </div>

                      {/* デッキ2 */}
                      <div style={{ 
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '8px'
                        }}>
                          {rivalry.deck2.name}
                        </div>
                        <div style={{ 
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: rivalry.deck2WinRate >= 50 ? '#28a745' : '#dc3545'
                        }}>
                          {rivalry.deck2WinRate.toFixed(1)}%
                        </div>
                        <div style={{ 
                          fontSize: '12px',
                          color: '#666',
                          marginTop: '4px'
                        }}>
                          {rivalry.deck2.colors.join(', ')}
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
