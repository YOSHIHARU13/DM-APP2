import React, { useState } from 'react';
import { AnalysisProps, CompatibilityData, TriangleData } from '../../types';

const Analysis: React.FC<AnalysisProps> = ({ project, decks, battles, onBack }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'triangles' | 'rankings'>('matrix');

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

  // 三すくみ関係発見
  const findTriangles = (): TriangleData[] => {
    const compatibility = calculateCompatibility();
    const triangles: TriangleData[] = [];

    for (let i = 0; i < decks.length; i++) {
      for (let j = i + 1; j < decks.length; j++) {
        for (let k = j + 1; k < decks.length; k++) {
          const deck1 = decks[i];
          const deck2 = decks[j];
          const deck3 = decks[k];

          const rate12 = compatibility[deck1.id]?.[deck2.id]?.winRate || 0;
          const rate23 = compatibility[deck2.id]?.[deck3.id]?.winRate || 0;
          const rate31 = compatibility[deck3.id]?.[deck1.id]?.winRate || 0;

          const games12 = compatibility[deck1.id]?.[deck2.id]?.totalGames || 0;
          const games23 = compatibility[deck2.id]?.[deck3.id]?.totalGames || 0;
          const games31 = compatibility[deck3.id]?.[deck1.id]?.totalGames || 0;

          // 全ての組み合わせで最低2戦以上、かつ勝率が55%以上の三すくみを検出
          if (games12 >= 2 && games23 >= 2 && games31 >= 2 &&
              rate12 >= 55 && rate23 >= 55 && rate31 >= 55) {
            triangles.push({
              deck1,
              deck2,
              deck3,
              relationships: {
                deck1VsDeck2: rate12,
                deck2VsDeck3: rate23,
                deck3VsDeck1: rate31
              }
            });
          }
        }
      }
    }

    return triangles.sort((a, b) => {
      const avgA = (a.relationships.deck1VsDeck2 + a.relationships.deck2VsDeck3 + a.relationships.deck3VsDeck1) / 3;
      const avgB = (b.relationships.deck1VsDeck2 + b.relationships.deck2VsDeck3 + b.relationships.deck3VsDeck1) / 3;
      return avgB - avgA;
    });
  };

  // デッキランキング計算
  const calculateRankings = () => {
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

      return {
        deck,
        wins,
        losses,
        totalGames,
        winRate,
        battles: deckBattles.length
      };
    }).sort((a, b) => b.winRate - a.winRate);
  };

  const compatibility = calculateCompatibility();
  const triangles = findTriangles();
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
        marginBottom: '20px' 
      }}>
        {[
          { key: 'matrix', label: '相性マトリックス' },
          { key: 'triangles', label: '三すくみ関係' },
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
              minWidth: '600px',
              borderCollapse: 'collapse', 
              fontSize: '12px' 
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    padding: '8px', 
                    border: '1px solid #ddd', 
                    backgroundColor: '#f8f9fa',
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    minWidth: '120px'
                  }}>
                    使用デッキ \ 相手
                  </th>
                  {decks.map(deck => (
                    <th key={deck.id} style={{ 
                      padding: '8px', 
                      border: '1px solid #ddd', 
                      backgroundColor: '#f8f9fa',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      minWidth: '80px',
                      maxWidth: '80px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
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
                      padding: '8px', 
                      border: '1px solid #ddd', 
                      backgroundColor: '#f8f9fa',
                      fontWeight: 'bold',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5,
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {deck.name}
                    </td>
                    {decks.map(opponent => (
                      <td key={opponent.id} style={{ 
                        padding: '8px', 
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        backgroundColor: deck.id === opponent.id 
                          ? '#e9ecef' 
                          : getCellColor(
                              compatibility[deck.id]?.[opponent.id]?.winRate || 0,
                              compatibility[deck.id]?.[opponent.id]?.totalGames || 0
                            ),
                        color: deck.id === opponent.id 
                          ? '#6c757d' 
                          : getCellTextColor(
                              compatibility[deck.id]?.[opponent.id]?.winRate || 0,
                              compatibility[deck.id]?.[opponent.id]?.totalGames || 0
                            ),
                        fontWeight: deck.id === opponent.id ? 'normal' : 'bold'
                      }}>
                        {deck.id === opponent.id 
                          ? '-' 
                          : compatibility[deck.id]?.[opponent.id]?.totalGames > 0
                            ? `${compatibility[deck.id][opponent.id].winRate.toFixed(0)}%`
                            : '未'
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px',
            fontSize: '12px' 
          }}>
            <strong>凡例:</strong>
            <span style={{ marginLeft: '15px', padding: '2px 6px', backgroundColor: '#d4edda' }}>70%以上(圧勝)</span>
            <span style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: '#d1ecf1' }}>60-69%(有利)</span>
            <span style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: '#fff3cd' }}>40-59%(互角)</span>
            <span style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: '#f8d7da' }}>40%未満(不利)</span>
            <span style={{ marginLeft: '10px', padding: '2px 6px', backgroundColor: '#f8f9fa' }}>未対戦</span>
          </div>
        </div>
      )}

      {/* 三すくみ関係 */}
      {activeTab === 'triangles' && (
        <div>
          <h3>三すくみ関係</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            A → B → C → A の循環する有利不利関係を自動検出しています。
          </p>

          {triangles.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '8px' 
            }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>三すくみ関係が見つかりませんでした。</p>
              <p style={{ color: '#6c757d' }}>
                各デッキ間で2戦以上かつ55%以上の勝率が必要です。
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {triangles.map((triangle, index) => (
                <div key={index} style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '20px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 15px 0' }}>三すくみ {index + 1}</h4>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    minHeight: '200px',
                    position: 'relative'
                  }}>
                    {/* 三角形の描画 */}
                    <svg width="300" height="200" viewBox="0 0 300 200">
                      {/* 三角形の線 */}
                      <path
                        d="M 150 20 L 250 160 L 50 160 Z"
                        fill="none"
                        stroke="#ddd"
                        strokeWidth="2"
                      />
                      
                      {/* 矢印 */}
                      <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                          refX="0" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="#007bff" />
                        </marker>
                      </defs>
                      
                      {/* 矢印線 */}
                      <line x1="170" y1="40" x2="230" y2="140" 
                        stroke="#007bff" strokeWidth="3" markerEnd="url(#arrowhead)" />
                      <line x1="230" y1="160" x2="70" y2="160" 
                        stroke="#007bff" strokeWidth="3" markerEnd="url(#arrowhead)" />
                      <line x1="70" y1="140" x2="130" y2="40" 
                        stroke="#007bff" strokeWidth="3" markerEnd="url(#arrowhead)" />
                      
                      {/* デッキ名 */}
                      <text x="150" y="15" textAnchor="middle" fontSize="14" fontWeight="bold">
                        {triangle.deck1.name}
                      </text>
                      <text x="260" y="170" textAnchor="middle" fontSize="14" fontWeight="bold">
                        {triangle.deck2.name}
                      </text>
                      <text x="40" y="170" textAnchor="middle" fontSize="14" fontWeight="bold">
                        {triangle.deck3.name}
                      </text>
                      
                      {/* 勝率表示 */}
                      <text x="200" y="90" textAnchor="middle" fontSize="12" fill="#007bff">
                        {triangle.relationships.deck1VsDeck2.toFixed(0)}%
                      </text>
                      <text x="150" y="175" textAnchor="middle" fontSize="12" fill="#007bff">
                        {triangle.relationships.deck2VsDeck3.toFixed(0)}%
                      </text>
                      <text x="100" y="90" textAnchor="middle" fontSize="12" fill="#007bff">
                        {triangle.relationships.deck3VsDeck1.toFixed(0)}%
                      </text>
                    </svg>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr 1fr', 
                    gap: '10px',
                    marginTop: '15px'
                  }}>
                    <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 'bold' }}>{triangle.deck1.name}</div>
                      <div style={{ fontSize: '12px', color: '#007bff' }}>
                        vs {triangle.deck2.name}: {triangle.relationships.deck1VsDeck2.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 'bold' }}>{triangle.deck2.name}</div>
                      <div style={{ fontSize: '12px', color: '#007bff' }}>
                        vs {triangle.deck3.name}: {triangle.relationships.deck2VsDeck3.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <div style={{ fontWeight: 'bold' }}>{triangle.deck3.name}</div>
                      <div style={{ fontSize: '12px', color: '#007bff' }}>
                        vs {triangle.deck1.name}: {triangle.relationships.deck3VsDeck1.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* デッキランキング */}
      {activeTab === 'rankings' && (
        <div>
          <h3>デッキランキング</h3>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            全体勝率順にデッキをランキング表示しています。
          </p>

          <div style={{ display: 'grid', gap: '10px' }}>
            {rankings.map((ranking, index) => {
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
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#007bff' }}>
                      {ranking.winRate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>勝率</div>
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