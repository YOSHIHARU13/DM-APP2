import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Deck {
  id: string;
  name: string;
  createdAt: Date;
  memo?: string;
  projectId?: string;
}

interface Battle {
  id: string;
  deck1Id: string;
  deck2Id: string;
  deck1Wins: number;
  deck2Wins: number;
  deck1GoingFirst: number;
  deck2GoingFirst: number;
  memo?: string;
  date: Date;
  projectId?: string;
}

const DeckList: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // デッキ情報を取得
        const decksSnapshot = await getDocs(collection(db, 'decks'));
        const loadedDecks: Deck[] = [];
        decksSnapshot.forEach((doc) => {
          const data = doc.data();
          loadedDecks.push({
            id: doc.id,
            name: data.name || '',
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            memo: data.memo || '',
            projectId: data.projectId || '',
          });
        });
        setDecks(loadedDecks);

        // バトル情報を取得
        const battlesSnapshot = await getDocs(collection(db, 'battles'));
        const loadedBattles: Battle[] = [];
        battlesSnapshot.forEach((doc) => {
          const data = doc.data();
          loadedBattles.push({
            id: doc.id,
            deck1Id: data.deck1Id || '',
            deck2Id: data.deck2Id || '',
            deck1Wins: data.deck1Wins || 0,
            deck2Wins: data.deck2Wins || 0,
            deck1GoingFirst: data.deck1GoingFirst || 0,
            deck2GoingFirst: data.deck2GoingFirst || 0,
            memo: data.memo || '',
            date: data.date ? data.date.toDate() : new Date(),
            projectId: data.projectId || '',
          });
        });
        setBattles(loadedBattles);

        setLoading(false);
      } catch (error) {
        console.error('データ取得エラー:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <p>読み込み中...</p>;
  }

  return (
    <div>
      <h2>デッキ一覧</h2>
      <ul>
        {decks.map((deck) => (
          <li key={deck.id}>
            {deck.name}（作成日: {deck.createdAt.toLocaleDateString()}）
          </li>
        ))}
      </ul>

      <h2>バトル一覧</h2>
      <ul>
        {battles.map((battle) => (
          <li key={battle.id}>
            {battle.date.toLocaleDateString()} - {battle.deck1Id} vs {battle.deck2Id}  
            （{battle.deck1Wins}勝 - {battle.deck2Wins}勝）
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DeckList;

