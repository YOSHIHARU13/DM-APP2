import React, { useState } from 'react';
import { Tournament, Deck, Match, Battle } from '../../types';
import BattleForm from '../battle/BattleForm';

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

  const getDeckById = (deckId: string | null) => {
    if (!deckId) return null;
    return decks.find(d => d.id === deckId);
  };

  const handleBattleAdd = async (battle: Omit<Battle, 'id'>) => {
    if (!selectedMatch) return;
    
    await onMatchComplete(tournament.id, selectedMatch.matchId, battle);
    setSelectedMatch(null);
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
          className="text-blue-500 hover:text-blue-600 mb-4 font-medium"
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
            <h3 className="text-lg font-bold mb-4 text-gray-800">
              {getRoundName(roundIndex, tournament.bracket.winnersBracket.length)}
            </h3>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {round.matches.map((match) => {
                const deck1 = getDeckById(match.deck1Id);
                const deck2 = getDeckById(match.deck2Id);
                const canPlay = match.status === 'pending' && deck1 && deck2;
                
                return (
                  <div
                    key={match.matchId}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      match.status === 'completed'
                        ? 'border-gray-300 bg-gray-50'
                        : canPlay
                        ? 'border-blue-400 bg-white hover:shadow-lg hover:border-blue-600 cursor-pointer transform hover:scale-105'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    onClick={() => canPlay && setSelectedMatch(match)}
                  >
                    {/* デッキ1 */}
                    <div className={`flex items-center gap-3 p-3 rounded-lg mb-2 ${
                      match.winnerId === match.deck1Id ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100'
                    }`}>
                      {deck1 ? (
                        <>
                          <img
                            src={deck1.imageUrl || '/placeholder-deck.png'}
                            alt={deck1.name}
                            className="w-16 h-16 object-cover rounded border-2 border-gray-300"
                            style={{ aspectRatio: '1/1' }}
                          />
                          <span className="font-bold flex-1 text-gray-800">{deck1.name}</span>
                          {match.winnerId === deck1.id && (
                            <span className="text-3xl">🏆</span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300"></div>
                          <span className="text-gray-400 italic">シード待ち</span>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-gray-400 font-bold my-2">VS</div>

                    {/* デッキ2 */}
                    <div className={`flex items-center gap-3 p-3 rounded-lg ${
                      match.winnerId === match.deck2Id ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100'
                    }`}>
                      {deck2 ? (
                        <>
                          <img
                            src={deck2.imageUrl || '/placeholder-deck.png'}
                            alt={deck2.name}
                            className="w-16 h-16 object-cover rounded border-2 border-gray-300"
                            style={{ aspectRatio: '1/1' }}
                          />
                          <span className="font-bold flex-1 text-gray-800">{deck2.name}</span>
                          {match.winnerId === deck2.id && (
                            <span className="text-3xl">🏆</span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 bg-gray-200 rounded border-2 border-gray-300"></div>
                          <span className="text-gray-400 italic">シード待ち</span>
                        </div>
                      )}
                    </div>

                    {canPlay && (
                      <div className="mt-4 text-center">
                        <div className="text-sm font-bold text-blue-600 bg-blue-50 py-2 px-4 rounded-lg">
                          ⚔️ クリックして対戦結果を入力
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 対戦入力フォーム */}
      {selectedMatch && selectedMatch.deck1Id && selectedMatch.deck2Id && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">トーナメント対戦結果入力</h3>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <BattleForm
                projectId={tournament.projectId}
                decks={decks.filter(d => d.id === selectedMatch.deck1Id || d.id === selectedMatch.deck2Id)}
                battles={battles}
                onBattleAdd={handleBattleAdd}
                onCancel={() => setSelectedMatch(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;
