import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Tournament, Deck, Match, Round } from '../../types';

interface TournamentDetailProps {
  tournament: Tournament;
  decks: Deck[];
  onBack: () => void;
}

export const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournament,
  decks,
  onBack,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [updating, setUpdating] = useState(false);

  const getDeckById = (deckId: string | null) => {
    if (!deckId) return null;
    return decks.find(d => d.id === deckId);
  };

  const handleMatchResult = async (match: Match, winnerId: string) => {
    setUpdating(true);
    try {
      const updatedBracket = { ...tournament.bracket };
      
      // マッチ結果を更新
      const updateMatch = (rounds: Round[]) => {
        for (const round of rounds) {
          const matchIndex = round.matches.findIndex(m => m.matchId === match.matchId);
          if (matchIndex !== -1) {
            round.matches[matchIndex] = {
              ...match,
              winnerId,
              loserId: match.deck1Id === winnerId ? match.deck2Id : match.deck1Id,
              status: 'completed',
            };
            return true;
          }
        }
        return false;
      };

      // 勝者側ブラケットを更新
      updateMatch(updatedBracket.winnersBracket);
      
      // 敗者側ブラケットを更新（ダブルエリミの場合）
      if (updatedBracket.losersBracket) {
        updateMatch(updatedBracket.losersBracket);
      }

      // 次のラウンドに勝者を進出させる
      advanceWinner(updatedBracket, match, winnerId);

      // トーナメント完了チェック
      const isCompleted = checkTournamentCompletion(updatedBracket);
      
      await updateDoc(doc(db, 'tournaments', tournament.id), {
        bracket: updatedBracket,
        status: isCompleted ? 'completed' : 'in_progress',
        winnerId: isCompleted ? winnerId : null,
        completedAt: isCompleted ? new Date() : null,
      });

      setSelectedMatch(null);
    } catch (error) {
      console.error('試合結果更新エラー:', error);
      alert('試合結果の更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const advanceWinner = (bracket: any, match: Match, winnerId: string) => {
    // 実装簡略化：次ラウンドへの進出ロジック
    // 実際は各ラウンドの試合番号から次の試合を特定して更新
  };

  const checkTournamentCompletion = (bracket: any): boolean => {
    const finalRound = bracket.winnersBracket[bracket.winnersBracket.length - 1];
    return finalRound.matches.every((m: Match) => m.status === 'completed');
  };

  const getRoundName = (roundIndex: number, totalRounds: number) => {
    const remaining = totalRounds - roundIndex;
    if (remaining === 1) return '決勝';
    if (remaining === 2) return '準決勝';
    if (remaining === 3) return '準々決勝';
    return `${roundIndex + 1}回戦`;
  };

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-500 hover:text-blue-600 mb-4"
        >
          ← トーナメント一覧に戻る
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{tournament.name}</h2>
            <div className="text-sm text-gray-600 mt-1">
              {tournament.format === 'single' ? 'シングルエリミネーション' : 'ダブルエリミネーション'}
              {' • '}
              {tournament.matchType === 'best_of_1' ? '1本勝負' : '3本中2本先取'}
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-full font-medium ${
            tournament.status === 'completed'
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {tournament.status === 'completed' ? '完了' : '進行中'}
          </div>
        </div>
      </div>

      {/* ブラケット表示 */}
      <div className="space-y-8">
        {tournament.bracket.winnersBracket.map((round, roundIndex) => (
          <div key={roundIndex}>
            <h3 className="text-lg font-bold mb-4">
              {getRoundName(roundIndex, tournament.bracket.winnersBracket.length)}
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {round.matches.map((match) => {
                const deck1 = getDeckById(match.deck1Id);
                const deck2 = getDeckById(match.deck2Id);
                
                return (
                  <div
                    key={match.matchId}
                    className={`border-2 rounded-lg p-4 ${
                      match.status === 'completed'
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-blue-300 bg-white hover:shadow-md cursor-pointer'
                    }`}
                    onClick={() => match.status === 'pending' && setSelectedMatch(match)}
                  >
                    {/* デッキ1 */}
                    <div className={`flex items-center gap-3 p-3 rounded ${
                      match.winnerId === match.deck1Id ? 'bg-green-100' : ''
                    }`}>
                      {deck1 ? (
                        <>
                          {deck1.imageUrl && (
                            <img
                              src={deck1.imageUrl}
                              alt={deck1.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <span className="font-medium flex-1">{deck1.name}</span>
                          {match.winnerId === deck1.id && <span className="text-xl">🏆</span>}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">シード待ち</span>
                      )}
                    </div>

                    <div className="text-center text-gray-400 text-sm my-2">VS</div>

                    {/* デッキ2 */}
                    <div className={`flex items-center gap-3 p-3 rounded ${
                      match.winnerId === match.deck2Id ? 'bg-green-100' : ''
                    }`}>
                      {deck2 ? (
                        <>
                          {deck2.imageUrl && (
                            <img
                              src={deck2.imageUrl}
                              alt={deck2.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <span className="font-medium flex-1">{deck2.name}</span>
                          {match.winnerId === deck2.id && <span className="text-xl">🏆</span>}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">シード待ち</span>
                      )}
                    </div>

                    {match.status === 'pending' && deck1 && deck2 && (
                      <div className="mt-3 text-center text-sm text-blue-600">
                        クリックして結果を入力
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 結果入力モーダル */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-6">試合結果入力</h3>
            
            <div className="space-y-4 mb-6">
              {[selectedMatch.deck1Id, selectedMatch.deck2Id].map((deckId) => {
                const deck = getDeckById(deckId);
                if (!deck) return null;
                
                return (
                  <button
                    key={deckId}
                    onClick={() => handleMatchResult(selectedMatch, deckId)}
                    disabled={updating}
                    className="w-full flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    {deck.imageUrl && (
                      <img
                        src={deck.imageUrl}
                        alt={deck.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <span className="font-bold text-lg flex-1 text-left">{deck.name}</span>
                    <span className="text-2xl">🏆</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedMatch(null)}
              disabled={updating}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
