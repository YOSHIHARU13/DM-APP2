import React from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Tournament, Deck } from '../../types';

interface TournamentListProps {
  tournaments: Tournament[];
  decks: Deck[];
  onTournamentSelect: (tournament: Tournament) => void;
  onCreateNew: () => void;
}

export const TournamentList: React.FC<TournamentListProps> = ({ tournaments, decks, onTournamentSelect, onCreateNew }) => {
  const getDeckById = (deckId: string) => {
    return decks.find(d => d.id === deckId);
  };

  const getMatchTypeLabel = (matchType: string) => {
    return matchType === 'best_of_1' ? '1本勝負' : '3本中2本先取';
  };

  const handleDelete = async (e: React.MouseEvent, tournamentId: string, tournamentName: string) => {
    e.stopPropagation();
    
    if (!window.confirm(`「${tournamentName}」を削除しますか?\n\n※トーナメントの対戦記録は削除されません`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'tournaments', tournamentId));
      alert('トーナメントを削除しました');
    } catch (error) {
      console.error('トーナメント削除エラー:', error);
      alert('トーナメントの削除に失敗しました');
    }
  };

  if (tournaments.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '2px dashed #dee2e6'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏆</div>
        <p style={{ fontSize: '18px', color: '#6c757d', marginBottom: '8px', fontWeight: 'bold' }}>
          トーナメントがまだありません
        </p>
        <p style={{ fontSize: '14px', color: '#adb5bd', marginBottom: '30px' }}>
          「新規トーナメント」ボタンから最初のトーナメントを作成しましょう
        </p>
        <button
          onClick={onCreateNew}
          style={{
            padding: '16px 32px',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(13, 110, 253, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0b5ed7';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(13, 110, 253, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0d6efd';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.3)';
          }}
        >
          ✨ 新規トーナメント作成
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      <div style={{
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 'bold',
            color: '#212529',
            margin: '0 0 8px 0'
          }}>
            🏆 トーナメント一覧
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6c757d',
            margin: 0
          }}>
            {tournaments.length}件のトーナメント
          </p>
        </div>
        <button
          onClick={onCreateNew}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0d6efd',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(14px, 3vw, 16px)',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(13, 110, 253, 0.3)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0b5ed7';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0d6efd';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(13, 110, 253, 0.3)';
          }}
        >
          + 新規トーナメント
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {tournaments.map((tournament) => {
          const winnerDeck = tournament.winnerId ? getDeckById(tournament.winnerId) : null;
          const isCompleted = tournament.status === 'completed';
          
          return (
            <div
              key={tournament.id}
              onClick={() => onTournamentSelect(tournament)}
              style={{
                backgroundColor: 'white',
                border: isCompleted ? '2px solid #198754' : '2px solid #0d6efd',
                borderRadius: '16px',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.borderColor = isCompleted ? '#146c43' : '#0b5ed7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = isCompleted ? '#198754' : '#0d6efd';
              }}
            >
              {/* ステータスバッジ - 右上 */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: isCompleted ? '#d1e7dd' : '#cfe2ff',
                  color: isCompleted ? '#0a3622' : '#084298',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  {isCompleted ? '✅ 完了' : '⚔️ 進行中'}
                </div>
              </div>

              {/* トーナメント名 */}
              <h3 style={{
                fontSize: 'clamp(18px, 4vw, 22px)',
                fontWeight: 'bold',
                color: '#212529',
                marginBottom: '16px',
                marginTop: '0',
                paddingRight: '100px',
                wordBreak: 'break-word',
                lineHeight: '1.3'
              }}>
                {tournament.name}
              </h3>

              {/* トーナメント詳細情報 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  <span style={{ fontSize: '16px' }}>🎮</span>
                  <span>{getMatchTypeLabel(tournament.matchType)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  <span style={{ fontSize: '16px' }}>👥</span>
                  <span>{tournament.participantDeckIds.length}デッキ参加</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#6c757d'
                }}>
                  <span style={{ fontSize: '16px' }}>📅</span>
                  <span>
                    {tournament.createdAt && new Date(
                      (tournament.createdAt as any).toDate 
                        ? (tournament.createdAt as any).toDate() 
                        : tournament.createdAt
                    ).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* 優勝デッキ表示 */}
              {winnerDeck && (
                <div style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '2px solid #e9ecef',
                  backgroundColor: '#fff3cd',
                  margin: '20px -24px -24px -24px',
                  padding: '20px 24px',
                  borderRadius: '0 0 14px 14px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      fontSize: '48px',
                      lineHeight: '1',
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                    }}>
                      🏆
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#856404',
                        fontWeight: 'bold',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        CHAMPION
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#212529',
                        wordBreak: 'break-word'
                      }}>
                        {winnerDeck.name}
                      </div>
                    </div>
                    {winnerDeck.imageUrl && (
                      <img
                        src={winnerDeck.imageUrl}
                        alt={winnerDeck.name}
                        style={{
                          width: '72px',
                          height: '72px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '3px solid #ffc107',
                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 削除ボタン */}
              <button
                onClick={(e) => handleDelete(e, tournament.id, tournament.name)}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 0,
                  transform: 'translateY(10px)',
                  zIndex: 10
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#bb2d3b';
                  e.currentTarget.style.transform = 'translateY(0) scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc3545';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
                className="delete-btn"
              >
                🗑️ 削除
              </button>

              <style>
                {`
                  div:hover .delete-btn {
                    opacity: 1 !important;
                    transform: translateY(0) !important;
                  }
                `}
              </style>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TournamentList;
