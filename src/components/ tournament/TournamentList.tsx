import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Tournament, Deck } from '../../types';
import { TournamentDetail } from './TournamentDetail';

interface TournamentListProps {
  projectId: string;
  decks: Deck[];
}

export const TournamentList: React.FC<TournamentListProps> = ({ projectId, decks }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
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

  if (selectedTournament) {
    return (
      <TournamentDetail
        tournament={selectedTournament}
        decks={decks}
        onBack={() => setSelectedTournament(null)}
      />
    );
  }

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
            onClick={() => setSelectedTournament(tournament)}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition cursor-pointer"
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
              
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                tournament.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {tournament.status === 'completed' ? '完了' : '進行中'}
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
              {tournament.createdAt && new Date(tournament.createdAt.toDate()).toLocaleDateString('ja-JP')}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TournamentList;
