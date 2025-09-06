import React, { useState } from 'react';
import { Battle, BattleFormProps } from '../../types';

const BattleForm: React.FC<BattleFormProps> = ({ projectId, decks, onBattleAdd, onCancel }) => {
  const [deck1Id, setDeck1Id] = useState<string>('');
  const [deck2Id, setDeck2Id] = useState<string>('');
  const [winner, setWinner] = useState<'deck1' | 'deck2' | ''>('');
  const [goingFirst, setGoingFirst] = useState<'deck1' | 'deck2' | ''>('');
  const [memo, setMemo] = useState<string>('');
  const [continuousMode, setContinuousMode] = useState<boolean>(false);

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

    if (!winner) {
      alert('勝者を選択してください');
      return;
    }

    if (!goingFirst) {
      alert('先攻を選択してください');
      return;
    }

    const newBattle: Battle = {
      id: `battle_${Date.now()}_${Math.random()}`,
      deck1Id,
      deck2Id,
      deck1Wins: winner === 'deck1' ? 1 : 0,
      deck2Wins: winner === 'deck2' ? 1 : 0,
      deck1GoingFirst: goingFirst === 'deck1' ? 1 : 0,
      deck2GoingFirst: goingFirst === 'deck2' ? 1 : 0,
      memo: memo.trim(),
      date: new Date(),
      projectId
    };

    onBattleAdd(newBattle);

    // 連続入力モードの場合、フォームをリセット（デッキ選択は保持）
    if (continuousMode) {
      setWinner('');
      setGoingFirst('');
      setMemo('');
    } else {
      // 通常モードの場合、すべてリセット
      setDeck1Id('');
      setDeck2Id('');
      setWinner('');
      setGoingFirst('');
      setMemo('');
    }
  };

  const getDeckName = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    return deck ? deck.name : '';
  };

  const swapDecks = () => {
    const temp = deck1Id;
    setDeck1Id(deck2Id);
    setDeck2Id(temp);
    
    // 勝者と先攻も入れ替え
    if (winner === 'deck1') setWinner('deck2');
    else if (winner === 'deck2') setWinner('deck1');
    
    if (goingFirst === 'deck1') setGoingFirst('deck2');
    else if (goingFirst === 'deck2') setGoingFirst('deck1');
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: '20px', 
      margin: '10px 0', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9' 
    }}>
      <h3>対戦結果を登録（1戦ずつ）</h3>
      
      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={() => handleRandomSelect('all')}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#ffc107', 
            color: '#212529', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer'
          }}
        >
          🎲 ランダムで2デッキ選択
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input
            type="checkbox"
            checked={continuousMode}
            onChange={(e) => setContinuousMode(e.target.checked)}
          />
          連続入力モード
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '15px', marginBottom: '20px', alignItems: 'end' }}>
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
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={swapDecks}
            disabled={!deck1Id || !deck2Id}
            style={{
              padding: '8px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: deck1Id && deck2Id ? 'pointer' : 'not-allowed',
              opacity: deck1Id && deck2Id ? 1 : 0.5
            }}
          >
            ⇄
          </button>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>入れ替え</div>
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
        </div>
      </div>

      {deck1Id && deck2Id && (
        <>
          {/* 勝者選択 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              勝者:
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${winner === 'deck1' ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: winner === 'deck1' ? '#d4edda' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="winner"
                  checked={winner === 'deck1'}
                  onChange={() => setWinner('deck1')}
                />
                <strong>{getDeckName(deck1Id)}</strong>
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${winner === 'deck2' ? '#28a745' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: winner === 'deck2' ? '#d4edda' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="winner"
                  checked={winner === 'deck2'}
                  onChange={() => setWinner('deck2')}
                />
                <strong>{getDeckName(deck2Id)}</strong>
              </label>
            </div>
          </div>

          {/* 先攻選択 */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              先攻:
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${goingFirst === 'deck1' ? '#007bff' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: goingFirst === 'deck1' ? '#cce7ff' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="goingFirst"
                  checked={goingFirst === 'deck1'}
                  onChange={() => setGoingFirst('deck1')}
                />
                {getDeckName(deck1Id)}
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '10px 15px',
                border: `2px solid ${goingFirst === 'deck2' ? '#007bff' : '#ddd'}`,
                borderRadius: '8px',
                backgroundColor: goingFirst === 'deck2' ? '#cce7ff' : 'white',
                cursor: 'pointer',
                flex: 1,
                justifyContent: 'center'
              }}>
                <input
                  type="radio"
                  name="goingFirst"
                  checked={goingFirst === 'deck2'}
                  onChange={() => setGoingFirst('deck2')}
                />
                {getDeckName(deck2Id)}
              </label>
            </div>
          </div>

          {/* 結果プレビュー */}
          {winner && goingFirst && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '6px', 
              marginBottom: '15px',
              textAlign: 'center',
              border: '1px solid #90caf9'
            }}>
              <strong>
                🏆 {getDeckName(winner === 'deck1' ? deck1Id : deck2Id)} の勝利
              </strong>
              <div style={{ fontSize: '14px', marginTop: '4px', color: '#555' }}>
                先攻: {getDeckName(goingFirst === 'deck1' ? deck1Id : deck2Id)}
              </div>
            </div>
          )}
        </>
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
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleSubmit} 
          disabled={!deck1Id || !deck2Id || !winner || !goingFirst}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: (!deck1Id || !deck2Id || !winner || !goingFirst) ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: (!deck1Id || !deck2Id || !winner || !goingFirst) ? 'not-allowed' : 'pointer',
            flex: 1
          }}
        >
          {continuousMode ? '登録して次へ' : '登録'}
        </button>
        <button 
          onClick={onCancel}
          style={{ 
            padding: '10px 20px', 
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

      {continuousMode && (
        <div style={{ 
          marginTop: '10px', 
          padding: '8px', 
          backgroundColor: '#fff3cd', 
          borderRadius: '4px', 
          fontSize: '14px',
          color: '#856404'
        }}>
          💡 連続入力モード：登録後もデッキ選択を保持し、勝敗・先攻のみリセットされます
        </div>
      )}
    </div>
  );
};

export default BattleForm;
