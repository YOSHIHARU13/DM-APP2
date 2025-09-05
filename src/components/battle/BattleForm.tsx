import React, { useState } from 'react';
import { Battle, BattleFormProps } from '../../types';

const BattleForm: React.FC<BattleFormProps> = ({ projectId, decks, onBattleAdd, onCancel }) => {
  const [deck1Id, setDeck1Id] = useState<string>('');
  const [deck2Id, setDeck2Id] = useState<string>('');
  const [deck1Wins, setDeck1Wins] = useState<number>(0);
  const [deck2Wins, setDeck2Wins] = useState<number>(0);
  const [memo, setMemo] = useState<string>('');

  const handleRandomSelect = (type: 'all' | 'deck1' | 'deck2') => {
    const availableDecks = type === 'deck1' 
      ? decks.filter(d => d.id !== deck2Id)
      : type === 'deck2'
      ? decks.filter(d => d.id !== deck1Id)
      : decks;

    if (availableDecks.length === 0) return;

    const randomDeck = availableDecks[Math.floor(Math.random() * availableDecks.length)];
    
    if (type === 'all') {
      const secondDeck = decks.filter(d => d.id !== randomDeck.id)[Math.floor(Math.random() * (decks.length - 1))];
      setDeck1Id(randomDeck.id);
      setDeck2Id(secondDeck.id);
    } else if (type === 'deck1') {
      setDeck1Id(randomDeck.id);
    } else {
      setDeck2Id(randomDeck.id);
    }
  };

  const handleSubmit = () => {
    if (!deck1Id || !deck2Id) {
      alert('両方のデッキを選択してください');
      return;
    }

    if (deck1Id === deck2Id) {
      alert('異なるデッキを選択してください');
      return;
    }

    if (deck1Wins + deck2Wins === 0) {
      alert('勝敗数を入力してください');
      return;
    }

    const newBattle: Battle = {
      id: `battle_${Date.now()}`,
      deck1Id,
      deck2Id,
      deck1Wins,
      deck2Wins,
      memo: memo.trim(),
      date: new Date(),
      projectId
    };

    onBattleAdd(newBattle);
    setDeck1Id('');
    setDeck2Id('');
    setDeck1Wins(0);
    setDeck2Wins(0);
    setMemo('');
  };

  const getDeckName = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    return deck ? deck.name : '';
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: '20px', 
      margin: '10px 0', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9' 
    }}>
      <h3>対戦結果を登録</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={() => handleRandomSelect('all')}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#ffc107', 
            color: '#212529', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          🎲 ランダムで2デッキ選択
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            デッキ1:
          </label>
          <select
            value={deck1Id}
            onChange={(e) => setDeck1Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              fontSize: '14px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          >
            <option value="">デッキを選択</option>
            {decks.filter(d => d.id !== deck2Id).map(deck => (
              <option key={deck.id} value={deck.id}>
                {deck.name} ({deck.colors.join(', ')})
              </option>
            ))}
          </select>
          <button 
            onClick={() => handleRandomSelect('deck1')}
            style={{ 
              width: '100%',
              padding: '4px 8px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🎲 ランダム選択
          </button>
          
          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>勝利数:</label>
            <input
              type="number"
              min="0"
              value={deck1Wins}
              onChange={(e) => setDeck1Wins(parseInt(e.target.value) || 0)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '14px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            デッキ2:
          </label>
          <select
            value={deck2Id}
            onChange={(e) => setDeck2Id(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '8px', 
              fontSize: '14px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          >
            <option value="">デッキを選択</option>
            {decks.filter(d => d.id !== deck1Id).map(deck => (
              <option key={deck.id} value={deck.id}>
                {deck.name} ({deck.colors.join(', ')})
              </option>
            ))}
          </select>
          <button 
            onClick={() => handleRandomSelect('deck2')}
            style={{ 
              width: '100%',
              padding: '4px 8px', 
              backgroundColor: '#17a2b8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🎲 ランダム選択
          </button>
          
          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>勝利数:</label>
            <input
              type="number"
              min="0"
              value={deck2Wins}
              onChange={(e) => setDeck2Wins(parseInt(e.target.value) || 0)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '14px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
          </div>
        </div>
      </div>

      {deck1Id && deck2Id && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e9ecef', 
          borderRadius: '4px', 
          marginBottom: '15px',
          textAlign: 'center' 
        }}>
          <strong>
            {getDeckName(deck1Id)} {deck1Wins}勝 - {deck2Wins}勝 {getDeckName(deck2Id)}
          </strong>
        </div>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          メモ (省略可):
        </label>
        <textarea
          value={memo}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemo(e.target.value)}
          placeholder="対戦の感想、特記事項など"
          style={{ 
            width: '100%', 
            padding: '8px', 
            height: '60px', 
            fontSize: '14px', 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            resize: 'vertical' 
          }}
        />
      </div>
      
      <div>
        <button 
          onClick={handleSubmit} 
          style={{ 
            marginRight: '10px', 
            padding: '8px 16px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          登録
        </button>
        <button 
          onClick={onCancel}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};
export default BattleForm;