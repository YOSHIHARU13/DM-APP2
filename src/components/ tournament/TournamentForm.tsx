import React, { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Deck, Tournament, TournamentFormat, MatchType } from '../../types';
import { generateBracket } from '../../utils/tournamentUtils';

interface TournamentFormProps {
  projectId: string;
  decks: Deck[];
  onClose: () => void;
  onSuccess: () => void;
}

export const TournamentForm: React.FC<TournamentFormProps> = ({
  projectId,
  decks,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('single');
  const [matchType, setMatchType] = useState<MatchType>('best_of_1');
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDeckToggle = (deckId: string) => {
    setSelectedDeckIds(prev =>
      prev.includes(deckId)
        ? prev.filter(id => id !== deckId)
        : [...prev, deckId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || selectedDeckIds.length < 2) {
      alert('トーナメント名と2つ以上のデッキを選択してください');
      return;
    }

    setLoading(true);

    try {
      // ランダムシード（シャッフル）
      const shuffledDeckIds = [...selectedDeckIds].sort(() => Math.random() - 0.5);
      
      // ブラケット生成
      const bracket = generateBracket(shuffledDeckIds, format);

      const tournament: Omit<Tournament, 'id'> = {
        projectId,
        name: name.trim(),
        format,
        matchType,
        participantDeckIds: shuffledDeckIds,
        status: 'in_progress',
        createdAt: Timestamp.now(),
        bracket,
      };

      await addDoc(collection(db, 'tournaments'), tournament);
      
      alert('トーナメントを作成しました！');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('トーナメント作成エラー:', error);
      alert('トーナメントの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">新規トーナメント作成</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* トーナメント名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                トーナメント名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="春季杯、新春トーナメントなど"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* 形式選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                トーナメント形式
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormat('single')}
                  className={`p-4 border-2 rounded-lg transition ${
                    format === 'single'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">シングルエリミネーション</div>
                  <div className="text-sm text-gray-600 mt-1">1回負けたら終了</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('double')}
                  className={`p-4 border-2 rounded-lg transition ${
                    format === 'double'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">ダブルエリミネーション</div>
                  <div className="text-sm text-gray-600 mt-1">敗者復活戦あり</div>
                </button>
              </div>
            </div>

            {/* 試合形式選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                試合形式
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMatchType('best_of_1')}
                  className={`p-4 border-2 rounded-lg transition ${
                    matchType === 'best_of_1'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">1本勝負</div>
                  <div className="text-sm text-gray-600 mt-1">1戦で決着</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMatchType('best_of_3')}
                  className={`p-4 border-2 rounded-lg transition ${
                    matchType === 'best_of_3'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">3本中2本先取</div>
                  <div className="text-sm text-gray-600 mt-1">Bo3形式</div>
                </button>
              </div>
            </div>

            {/* デッキ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                参加デッキ選択 ({selectedDeckIds.length}デッキ選択中)
              </label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {decks.map((deck) => (
                    <label
                      key={deck.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDeckIds.includes(deck.id)}
                        onChange={() => handleDeckToggle(deck.id)}
                        className="w-5 h-5"
                      />
                      {deck.imageUrl && (
                        <img
                          src={deck.imageUrl}
                          alt={deck.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{deck.name}</div>
                        <div className="text-sm text-gray-600">
                          {deck.wins}勝{deck.losses}敗
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
                disabled={loading || selectedDeckIds.length < 2}
              >
                {loading ? '作成中...' : 'トーナメント開始'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TournamentForm;
