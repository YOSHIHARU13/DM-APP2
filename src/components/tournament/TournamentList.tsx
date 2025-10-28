import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Tournament, Deck } from '../../types';

interface TournamentListProps {
  decks: Deck[];
  tournaments: Tournament[];
  onTournamentSelect: (tournament: Tournament) => void;
  onCreateNew: () => void;
}

export const TournamentList: React.FC<TournamentListProps> = ({ decks, tournaments, onTournamentSelect, onCreateNew }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'tournaments'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tournamentsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Tournament[];
      
      setTournaments(tournamentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const getDeckById = (deckId: string) => {
    return decks.find(d => d.id === deckId);
  };

  const getFormatLabel = (format: string) => {
    return format === 'single' ? 'シングルエリミネーション' : 'ダブルエリミネーション';
  };

  const getMatchTypeLabel = (matchType: string) => {
    return matchType === 'best_of_1' ? '1本勝負' : '3本中2本先取';
  };

  const handleDelete = async (tournamentId: string, tournamentName: string) => {
    if (!window.confirm(`「${tournamentName}」を削除しますか？\n\n※トーナメントの対戦記録は削除されません`)) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">トーナメントがまだありません</p>
        <p className="text-sm text-gray-400 mt-2">「新規トーナメント」ボタンから作成してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => {
        const winnerDeck = tournament.winnerId ? getDeckById(tournament.winnerId) : null;
        
        return (
          <div
            key={tournament.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{tournament.name}</h3>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{getFormatLabel(tournament.format)}</span>
                  <span>•</span>
                  <span>{getMatchTypeLabel(tournament.matchType)}</span>
                  <span>•</span>
                  <span>{tournament.participantDeckIds.length}デッキ参加</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  tournament.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {tournament.status === 'completed' ? '完了' : '進行中'}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(tournament.id, tournament.name);
                  }}
                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                >
                  削除
                </button>
              </div>
            </div>

            {/* 優勝デッキ表示 */}
            {winnerDeck && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  {winnerDeck.imageUrl && (
                    <img
                      src={winnerDeck.imageUrl}
                      alt={winnerDeck.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <div className="font-semibold text-lg">{winnerDeck.name}</div>
                    <div className="text-sm text-gray-600">優勝</div>
                  </div>
                </div>
              </div>
            )}

           <div className="mt-4 text-sm text-gray-500">
  {tournament.createdAt && new Date((tournament.createdAt as any).toDate()).toLocaleDateString('ja-JP')}
</div>
          </div>
        );
      })}
    </div>
  );
};

export default TournamentList;




