import React, { useState, useMemo } from 'react';
import { Tournament, Deck, Match, Battle } from '../../types';

interface TournamentDetailProps {
  tournament: Tournament;
  decks: Deck[];
  battles: Battle[];
  deckRatings: { [deckId: string]: number };
  onBack: () => void;
  onMatchComplete: (tournamentId: string, matchId: string, battle: Omit<Battle, 'id'>) => Promise<void>;
  onTournamentComplete: (tournamentId: string) => Promise<void>;
}

const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournament,
  decks,
  battles,
  deckRatings,
  onBack,
  onMatchComplete,
  onTournamentComplete,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [selectedGoingFirst, setSelectedGoingFirst] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const deckStats = useMemo(() => {
    const stats: Record<string, { rating: number; wins: number; losses: number; rank: number }> = {};
    decks.forEach((deck) => {
      const deckBattles = battles.filter((b) => b.deck1Id === deck.id || b.deck2Id === deck.id);
      let wins = 0,
        losses = 0;
      deckBattles.forEach((b) => {
        if (b.deck1Id === deck.id) {
          wins += b.deck1Wins;
          losses += b.deck2Wins;
        } else {
          wins += b.deck2Wins;
          losses += b.deck1Wins;
        }
      });
      stats[deck.id] = {
        rating: deckRatings[deck.id] || 1500,
        wins,
        losses,
        rank: 0,
      };
    });
    const sortedDecks = Object.entries(stats).sort((a, b) => b[1].rating - a[1].rating);
    sortedDecks.forEach(([deckId], index) => {
      stats[deckId].rank = index + 1;
    });
    return stats;
  }, [decks, battles, deckRatings]);

  const getDeckById = (deckId: string | null) => (deckId ? decks.find((d) => d.id === deckId) : null);
  const getDeckStats = (deckId: string | null) => (deckId ? deckStats[deckId] : null);
  const getWinRate = (deckId: string) => {
    const stats = deckStats[deckId];
    if (!stats) return 0;
    const total = stats.wins + stats.losses;
    return total === 0 ? 0 : +(stats.wins / total * 100).toFixed(1);
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
      memo: `トーナメント: ${tournament.name}`,
    };

    try {
      await onMatchComplete(tournament.id, selectedMatch.matchId, battle);
      setSelectedMatch(null);
      setSelectedWinner(null);
      setSelectedGoingFirst(null);
    } catch (err) {
      console.error(err);
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

  const isUpset = (winnerId: string | null, loserId: string | null) => {
    if (!winnerId || !loserId) return false;
    const winnerStats = deckStats[winnerId];
    const loserStats = deckStats[loserId];
    if (!winnerStats || !loserStats) return false;
    return winnerStats.rank > loserStats.rank && loserStats.rank - winnerStats.rank >= 3;
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 30 }}>
        <button onClick={onBack} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, marginBottom: 15, padding: '8px 0' }}>
          ← トーナメント一覧に戻る
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 'bold' }}>{tournament.name}</h2>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
              {tournament.format === 'single' ? 'シングルエリミネーション' : 'ダブルエリミネーション'} • {tournament.matchType === 'best_of_1' ? '1本勝負' : '3本中2本先取'} • {tournament.participantDeckIds.length}デッキ参加
            </div>
          </div>
          <div style={{ padding: '10px 20px', borderRadius: 20, fontWeight: 'bold', backgroundColor: tournament.status === 'completed' ? '#d1fae5' : '#dbeafe', color: tournament.status === 'completed' ? '#065f46' : '#1e40af' }}>
            {tournament.status === 'completed' ? '✓ 完了' : '進行中'}
          </div>
        </div>
      </div>

      {/* トーナメント表 */}
      <div style={{ display: 'flex', gap: 40, overflowX: 'auto', paddingBottom: 20 }}>
        {tournament.bracket.winnersBracket.map((round, roundIndex) => (
          <div key={roundIndex} style={{ minWidth: 360, flex: '0 0 auto' }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '12px 20px', borderRadius: 8, marginBottom: 20, textAlign: 'center', fontWeight: 'bold', fontSize: 18, color: '#1f2937' }}>
              {getRoundName(roundIndex, tournament.bracket.winnersBracket.length)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
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
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: canPlay ? '0 4px 12px rgba(59,130,246,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                      cursor: canPlay ? 'pointer' : 'default',
                      position: 'relative',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => canPlay && handleMatchClick(match)}
                  >
                    {canPlay && <div style={{ position: 'absolute', top: -12, right: 12, backgroundColor: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>クリックして入力</div>}
                    {hasUpset && <div style={{ position: 'absolute', top: -12, left: 12, backgroundColor: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 'bold' }}>🔥 番狂わせ！</div>}

                    {/* デッキ1 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: match.winnerId === match.deck1Id ? '#d1fae5' : '#f9fafb',
                      border: match.winnerId === match.deck1Id ? '2px solid #10b981' : '1px solid #e5e7eb',
                      marginBottom: 8,
                    }}>
                      {deck1 && stats1 ? (
                        <>
                          <div style={{ position: 'relative' }}>
                            <img src={deck1.imageUrl || '/placeholder-deck.png'} alt={deck1.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, border: '2px solid #d1d5db', flexShrink: 0 }} />
                            <div style={{ position: 'absolute', top: -6, right: -6, backgroundColor: stats1.rank <= 3 ? '#fbbf24' : '#6b7280', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', border: '2px solid white' }}>
                              {stats1.rank}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: 15, color: '#1f2937' }}>{deck1.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>R:{stats1.rating} | {getWinRate(deck1.id)}% ({stats1.wins}-{stats1.losses})</div>
                          </div>
                          {match.winnerId === deck1.id && <span style={{ fontSize: 24 }}>🏆</span>}
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 50, height: 50, backgroundColor: '#e5e7eb', borderRadius: 6, border: '2px solid #d1d5db', flexShrink: 0 }}></div>
                          <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 14 }}>シード待ち</span>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'center', color: '#9ca3af', fontWeight: 'bold', fontSize: 14, margin: '4px 0' }}>VS</div>

                    {/* デッキ2 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: match.winnerId === match.deck2Id ? '#d1fae5' : '#f9fafb',
                      border: match.winnerId === match.deck2Id ? '2px solid #10b981' : '1px solid #e5e7eb',
                    }}>
                      {deck2 && stats2 ? (
                        <>
                          <div style={{ position: 'relative' }}>
                            <img src={deck2.imageUrl || '/placeholder-deck.png'} alt={deck2.name} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6, border: '2px solid #d1d5db', flexShrink: 0 }} />
                            <div style={{ position: 'absolute', top: -6, right: -6, backgroundColor: stats2.rank <= 3 ? '#fbbf24' : '#6b7280', color: 'white', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', border: '2px solid white' }}>
                              {stats2.rank}
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: 15, color: '#1f2937' }}>{deck2.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>R:{stats2.rating} | {getWinRate(deck2.id)}% ({stats2.wins}-{stats2.losses})</div>
                          </div>
                          {match.winnerId === deck2.id && <span style={{ fontSize: 24 }}>🏆</span>}
                        </>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 50, height: 50, backgroundColor: '#e5e7eb', borderRadius: 6, border: '2px solid #d1d5db', flexShrink: 0 }}></div>
                          <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 14 }}>シード待ち</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 試合結果入力モーダル */}
      {selectedMatch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, width: 400, maxWidth: '90%' }}>
            <h3 style={{ margin: 0, marginBottom: 16, fontWeight: 'bold' }}>試合結果入力</h3>
            <div style={{ marginBottom: 12 }}>
              <strong>勝者を選択:</strong>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {[selectedMatch.deck1Id, selectedMatch.deck2Id].map((deckId) => {
                  const deck = getDeckById(deckId);
                  if (!deck) return null;
                  return (
                    <button
                      key={deckId}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: selectedWinner === deckId ? '2px solid #3b82f6' : '1px solid #d1d5db',
                        backgroundColor: selectedWinner === deckId ? '#dbeafe' : 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                      onClick={() => setSelectedWinner(deckId)}
                    >
                      {deck.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <strong>先攻を選択:</strong>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {[selectedMatch.deck1Id, selectedMatch.deck2Id].map((deckId) => {
                  const deck = getDeckById(deckId);
                  if (!deck) return null;
                  return (
                    <button
                      key={deckId}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: selectedGoingFirst === deckId ? '2px solid #10b981' : '1px solid #d1d5db',
                        backgroundColor: selectedGoingFirst === deckId ? '#d1fae5' : 'white',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                      }}
                      onClick={() => setSelectedGoingFirst(deckId)}
                    >
                      {deck.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <button
                onClick={() => setSelectedMatch(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer' }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedWinner || !selectedGoingFirst || updating}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* トーナメント完了ボタン */}
      {tournament.status !== 'completed' && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => onTournamentComplete(tournament.id)}
            style={{ padding: '10px 20px', borderRadius: 12, backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}
          >
            トーナメントを完了する
          </button>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;

