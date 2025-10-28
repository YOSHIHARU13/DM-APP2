import React, { useState, useMemo } from 'react';
import { Tournament, Deck, Match, Battle } from '../../types';

interface TournamentDetailProps {
  tournament: Tournament;
  decks: Deck[];
  battles: Battle[];
  onBack: () => void;
  onMatchComplete: (tournamentId: string, matchId: string, battle: Omit<Battle, 'id'>) => Promise<void>;
  onTournamentComplete: (tournamentId: string) => Promise<void>;
}

export const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournament,
  decks,
  battles,
  onBack,
  onMatchComplete,
  onTournamentComplete,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [selectedGoingFirst, setSelectedGoingFirst] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // デッキのレーティング・勝率を計算
  const deckStats = useMemo(() => {
    const stats: Record<string, { rating: number; wins: number; losses: number; rank: number }> = {};
    
    decks.forEach(deck => {
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
      
      stats[deck.id] = {
        rating: deck.rating || 1500,
        wins,
        losses,
        rank: 0
      };
    });
    
    // ランキング計算
    const sortedDecks = Object.entries(stats).sort((a, b) => b[1].rating - a[1].rating);
    sortedDecks.forEach(([deckId], index) => {
      stats[deckId].rank = index + 1;
    });
    
    return stats;
  }, [decks, battles]);

  const getDeckById = (deckId: string | null) => {
    if (!deckId) return null;
    return decks.find(d => d.id === deckId);
  };

  const getDeckStats = (deckId: string | null) => {
    if (!deckId) return null;
    return deckStats[deckId];
  };

  const getWinRate = (deckId: string) => {
    const stats = deckStats[deckId];
    if (!stats) return 0;
    const total = stats.wins + stats.losses;
    if (total === 0) return 0;
    return (stats.wins / total * 100).toFixed(1);
  };

  const handleSubmit = async () => {
    if (!selectedMatch || !selectedWinner || !selectedGoingFirst || updating) return;
    
    setUpdating(true);

    const battle: Omit<Battle, 'id'> = {
      projectId: tournament.projectId,
      deck1Id: selectedMatch.deck1Id!,
      deck2Id: selectedMatch.deck2Id!,
      deck1Wins: selectedWinner === selectedMatch.deck1Id ? 1 : 0,
      deck2Wins: selectedWinner === selectedMatch.deck2Id ? 1 : 0,
      deck1GoingFirst: selectedGoingFirst === selectedMatch.deck1Id ? 1 : 0,
      deck2GoingFirst: selectedGoingFirst === selectedMatch.deck2Id ? 1 : 0,
      date: new Date(),
      memo: `トーナメント: ${tournament.name}`
    };

    try {
      await onMatchComplete(tournament.id, selectedMatch.matchId, battle);
      setSelectedMatch(null);
      setSelectedWinner(null);
      setSelectedGoingFirst(null);
    } catch (error) {
      console.error('試合結果の保存に失敗:', error);
      alert('試合結果の保存に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setSelectedWinner(null);
    setSelectedGoingFirst(null);
  };

  const getRoundName = (roundIndex: number, totalRounds: number) => {
    const remaining = totalRounds - roundIndex;
    if (remaining === 1) return '決勝';
    if (remaining === 2) return '準決勝';
    if (remaining === 3) return '準々決勝';
    return `${roundIndex + 1}回戦`;
  };

  // アップセット判定（下位が上位を倒した）
  const isUpset = (winnerId: string | null, loserId: string | null) => {
    if (!winnerId || !loserId) return false;
    const winnerStats = deckStats[winnerId];
    const loserStats = deckStats[loserId];
    if (!winnerStats || !loserStats) return false;
    return winnerStats.rank > loserStats.rank && loserStats.rank - winnerStats.rank >= 3;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={onBack}
          style={{
            color: '#3b82f6',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            marginBottom: '15px',
            padding: '8px 0'
          }}
        >
          ← トーナメント一覧に戻る
        </button>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>{tournament.name}</h2>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              {tournament.format === 'single' ? 'シングルエリミネーション' : 'ダブルエリミネーション'}
              {' • '}
              {tournament.matchType === 'best_of_1' ? '1本勝負' : '3本中2本先取'}
              {' • '}
              {tournament.participantDeckIds.length}デッキ参加
            </div>
          </div>
          
          <div style={{
            padding: '10px 20px',
            borderRadius: '20px',
            fontWeight: 'bold',
            backgroundColor: tournament.status === 'completed' ? '#d1fae5' : '#dbeafe',
            color: tournament.status === 'completed' ? '#065f46' : '#1e40af'
          }}>
            {tournament.status === 'completed' ? '✓ 完了' : '進行中'}
          </div>
        </div>
      </div>

      {/* トーナメント表 */}
      <div style={{ 
        display: 'flex', 
        gap: '40px', 
        overflowX: 'auto',
        paddingBottom: '20px'
      }}>
        {tournament.bracket.winnersBracket.map((round, roundIndex) => (
          <div key={roundIndex} style={{ minWidth: '360px', flex: '0 0 auto' }}>
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '12px 20px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '18px',
              color: '#1f2937'
            }}>
              {getRoundName(roundIndex, tournament.bracket.winnersBracket.length)}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {round.matches.map((match) => {
                const deck1 = getDeckById(match.deck1Id);
                const deck2 = getDeckById(match.deck2Id);
                const stats1 = getDeckStats(match.deck1Id);
                const stats2 = getDeckStats(match.deck2Id);
                const canPlay = match.status === 'pending' && deck1 && deck2;
                const isCompleted = match.status === 'completed';
                const hasUpset = isCompleted && isUpset(match.winnerId, match.winnerId === match.deck1Id ? match.deck2Id : match.deck1Id);
                
                return (
                  <div
                    key={match.matchId}
                    style={{
                      backgroundColor: 'white',
                      border: canPlay ? '3px solid #3b82f6' : isCompleted ? '2px solid #d1d5db' : '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: canPlay ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: canPlay ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onClick={() => canPlay && handleMatchClick(match)}
                    onMouseEnter={(e) => {
                      if (canPlay) {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (canPlay) {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                      }
                    }}
                  >
                    {canPlay && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        right: '12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        クリックして入力
                      </div>
                    )}

                    {hasUpset && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '12px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        🔥 番狂わせ！
                      </div>
                    )}

                    {/* デッキ1 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: match.winnerId === match.deck1Id ? '#d1fae5' : '#f9fafb',
                      border: match.winnerId === match.deck1Id ? '2px solid #10b981' : '1px solid #e5e7eb',
                      marginBottom: '8px'
                    }}>
                      {deck1 && stats1 ? (
                        <>
                          <div style={{ position: 'relative' }}>
                            <img
                              src={deck1.imageUrl || '/placeholder-deck.png'}
                              alt={deck1.name}
                              style={{ 
                                width: '50px', 
                                height: '50px', 
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '2px solid #d1d5db',
                                flexShrink: 0
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              backgroundColor: stats1.rank <= 3 ? '#fbbf24' : '#6b7280',
                              color: 'white',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              border: '2px solid white'
                            }}>
                              {stats1.rank}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontWeight: 'bold', 
                              fontSize: '15px',
                              color: '#1f2937'
                            }}>
                              {deck1.name}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#6b7280',
                              marginTop: '2px'
                            }}>
                              R:{stats1.rating} | {getWinRate(deck1.id)}% ({stats1.wins}-{stats1.losses})
                            </div>
                          </div>
                          {match.winnerId === deck1.id && (
                            <span style={{ fontSize: '24px' }}>🏆</span>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '50px', 
                            height: '50px', 
                            backgroundColor: '#e5e7eb',
                            borderRadius: '6px',
                            border: '2px solid #d1d5db',
                            flexShrink: 0
                          }}></div>
                          <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '14px' }}>
                            シード待ち
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ 
                      textAlign: 'center', 
                      color: '#9ca3af', 
                      fontWeight: 'bold',
                      fontSize: '14px',
                      margin: '4px 0'
                    }}>
                      VS
                    </div>

                    {/* デッキ2 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: match.winnerId === match.deck2Id ? '#d1fae5' : '#f9fafb',
                      border: match.winnerId === match.deck2Id ? '2px solid #10b981' : '1px solid #e5e7eb'
                    }}>
                      {deck2 && stats2 ? (
                        <>
                          <div style={{ position: 'relative' }}>
                            <img
                              src={deck2.imageUrl || '/placeholder-deck.png'}
                              alt={deck2.name}
                              style={{ 
                                width: '50px', 
                                height: '50px', 
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '2px solid #d1d5db',
                                flexShrink: 0
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              backgroundColor: stats2.rank <= 3 ? '#fbbf24' : '#6b7280',
                              color: 'white',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              border: '2px solid white'
                            }}>
                              {stats2.rank}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontWeight: 'bold', 
                              fontSize: '15px',
                              color: '#1f2937'
                            }}>
                              {deck2.name}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#6b7280',
                              marginTop: '2px'
                            }}>
                              R:{stats2.rating} | {getWinRate(deck2.id)}% ({stats2.wins}-{stats2.losses})
                            </div>
                          </div>
                          {match.winnerId === deck2.id && (
                            <span style={{ fontSize: '24px' }}>🏆</span>
                          )}
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '50px', 
                            height: '50px', 
                            backgroundColor: '#e5e7eb',
                            borderRadius: '6px',
                            border: '2px solid #d1d5db',
                            flexShrink: 0
                          }}></div>
                          <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '14px' }}>
                            シード待ち
                          </span>
                        </div>
                      )}
                    </div>

                    {canPlay && (
                      <div style={{
                        marginTop: '12px',
                        padding: '8px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#1e40af',
                        fontWeight: 'bold'
                      }}>
                        ⚔️ 勝者と先攻を選択してください
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 勝者・先攻選択モーダル */}
      {selectedMatch && selectedMatch.deck1Id && selectedMatch.deck2Id && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>
                試合結果を入力
              </h3>
              <button
                onClick={() => {
                  setSelectedMatch(null);
                  setSelectedWinner(null);
                  setSelectedGoingFirst(null);
                }}
                disabled={updating}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: updating ? 'not-allowed' : 'pointer',
                  color: '#9ca3af',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* 勝者選択 */}
            <div style={{ marginBottom: '32px' }}>
              <h4 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: '#374151'
              }}>
                🏆 勝者を選択
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[selectedMatch.deck1Id, selectedMatch.deck2Id].map((deckId) => {
                  const deck = getDeckById(deckId);
                  const stats = getDeckStats(deckId);
                  if (!deck || !stats) return null;

                  return (
                    <button
                      key={deckId}
                      onClick={() => setSelectedWinner(deckId)}
                      disabled={updating}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        border: selectedWinner === deckId ? '3px solid #10b981' : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        backgroundColor: selectedWinner === deckId ? '#d1fae5' : 'white',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: updating ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!updating && selectedWinner !== deckId) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updating && selectedWinner !== deckId) {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <img
                        src={deck.imageUrl || '/placeholder-deck.png'}
                        alt={deck.name}
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #d1d5db'
                        }}
                      />
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1f2937' }}>
                          {deck.name} <span style={{ fontSize: '14px', color: '#6b7280' }}>#{stats.rank}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          レート:{stats.rating} | 勝率:{getWinRate(deckId)}%
                        </div>
                      </div>
                      {selectedWinner === deckId && (
                        <span style={{ fontSize: '28px' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 先攻選択 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: '#374151'
              }}>
                ⚡ 先攻を選択
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[selectedMatch.deck1Id, selectedMatch.deck2Id].map((deckId) => {
                  const deck = getDeckById(deckId);
                  if (!deck) return null;

                  return (
                    <button
                      key={deckId}
                      onClick={() => setSelectedGoingFirst(deckId)}
                      disabled={updating}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '16px',
                        border: selectedGoingFirst === deckId ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                        borderRadius: '12px',
                        backgroundColor: selectedGoingFirst === deckId ? '#dbeafe' : 'white',
                        cursor: updating ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: updating ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!updating && selectedGoingFirst !== deckId) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!updating && selectedGoingFirst !== deckId) {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <img
                        src={deck.imageUrl || '/placeholder-deck.png'}
                        alt={deck.name}
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #d1d5db'
                        }}
                      />
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1f2937' }}>
                          {deck.name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                          {deck.colors.join(', ')}
                        </div>
                      </div>
                      {selectedGoingFirst === deckId && (
                        <span style={{ fontSize: '28px' }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 送信ボタン */}
            <button
              onClick={handleSubmit}
              disabled={!selectedWinner || !selectedGoingFirst || updating}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: (!selectedWinner || !selectedGoingFirst || updating) ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: (!selectedWinner || !selectedGoingFirst || updating) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedWinner && selectedGoingFirst && !updating) {
                  e.currentTarget.style.backgroundColor = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedWinner && selectedGoingFirst && !updating) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }
              }}
            >
              {updating ? '保存中...' : '結果を登録'}
            </button>

            {(!selectedWinner || !selectedGoingFirst) && (
              <div style={{
                marginTop: '12px',
                textAlign: 'center',
                color: '#ef4444',
                fontSize: '14px'
              }}>
                勝者と先攻の両方を選択してください
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
