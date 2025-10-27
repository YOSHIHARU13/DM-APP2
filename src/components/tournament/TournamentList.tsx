import React from 'react';
import { TournamentListProps } from '../../types';

const TournamentList: React.FC<TournamentListProps> = ({ 
  tournaments, 
  decks, 
  onTournamentSelect,
  onCreateNew
}) => {
  const getDeckById = (deckId: string | undefined) => {
    if (!deckId) return null;
    return decks.find(d => d.id === deckId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: '✅ 完了', color: '#28a745', bgColor: '#d4edda' };
      case 'in_progress':
        return { text: '⚡ 進行中', color: '#ffc107', bgColor: '#fff3cd' };
      default:
        return { text: '📝 準備中', color: '#007bff', bgColor: '#e7f3ff' };
    }
  };

  const sortedTournaments = [...tournaments].sort((a, b) => 
    b.createdAt.getTime() - a.createdAt.getTime()
  );

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2>トーナメント一覧</h2>
        <button
          onClick={onCreateNew}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '20px' }}>+</span>
          新規トーナメント
        </button>
      </div>

      {tournaments.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
          <h3 style={{ color: '#6c757d', marginBottom: '8px' }}>
            トーナメントがまだありません
          </h3>
          <p style={{ color: '#999', marginBottom: '20px' }}>
            最初のトーナメントを作成して、デッキ同士を対戦させましょう！
          </p>
          <button
            onClick={onCreateNew}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            トーナメントを作成
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {sortedTournaments.map(tournament => {
            const status = getStatusBadge(tournament.status);
            const winnerDeck = getDeckById(tournament.winnerId);
            const runnerUpDeck = getDeckById(tournament.runnerUpId);
            
            return (
              <div
                key={tournament.id}
                onClick={() => onTournamentSelect(tournament)}
                style={{
                  padding: '20px',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* ヘッダー行 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
                      {tournament.name}
                    </h3>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {tournament.createdAt.toLocaleDateString('ja-JP')} 開催
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: status.bgColor,
                    color: status.color,
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }}>
                    {status.text}
                  </div>
                </div>

                {/* トーナメント情報 */}
                <div style={{ 
                  display: 'flex', 
                  gap: '20px',
                  marginBottom: '15px',
                  fontSize: '14px',
                  color: '#666'
                }}>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#495057' }}>形式: </span>
                    {tournament.format === 'single' ? 'シングルエリミネーション' : 'ダブルエリミネーション'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#495057' }}>試合: </span>
                    {tournament.matchType === 'best_of_1' ? '1本勝負' : '3本中2本先取'}
                  </div>
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#495057' }}>参加: </span>
                    {tournament.participantDeckIds.length}デッキ
                  </div>
                </div>

                {/* 優勝デッキ表示 */}
                {tournament.status === 'completed' && winnerDeck && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fff8e1',
                    borderRadius: '6px',
                    border: '1px solid #ffd54f'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '24px' }}>🏆</span>
                      {winnerDeck.imageUrl && (
                        <img 
                          src={winnerDeck.imageUrl}
                          alt={winnerDeck.name}
                          style={{
                            width: '50px',
                            height: '50px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: '2px solid #ffd54f'
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#f57f17' }}>
                          優勝: {winnerDeck.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {winnerDeck.colors.join(', ')}
                        </div>
                      </div>
                    </div>

                    {/* 準優勝 */}
                    {runnerUpDeck && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #ffe082'
                      }}>
                        <span style={{ fontSize: '20px' }}>🥈</span>
                        {runnerUpDeck.imageUrl && (
                          <img 
                            src={runnerUpDeck.imageUrl}
                            alt={runnerUpDeck.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '6px'
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            準優勝: {runnerUpDeck.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {runnerUpDeck.colors.join(', ')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3位 */}
                    {tournament.thirdPlaceIds && tournament.thirdPlaceIds.length > 0 && (
                      <div style={{ 
                        display: 'flex',
                        gap: '10px',
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #ffe082',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ fontSize: '18px' }}>🥉</span>
                        <div style={{ flex: 1, fontSize: '14px' }}>
                          <span style={{ fontWeight: 'bold' }}>3位: </span>
                          {tournament.thirdPlaceIds.map((deckId, index) => {
                            const thirdDeck = getDeckById(deckId);
                            return thirdDeck ? (
                              <span key={deckId}>
                                {index > 0 && ', '}
                                {thirdDeck.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 進行中の場合 */}
                {tournament.status === 'in_progress' && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#856404'
                  }}>
                    ⚡ トーナメント進行中...クリックして続きを見る
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TournamentList;
