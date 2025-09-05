import React, { useState } from 'react';
import { Deck, DeckFormProps } from '../../types';

const DeckForm: React.FC<DeckFormProps> = ({ projectId, onDeckAdd, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const availableColors = ['白', '青', '黒', '赤', '緑', '多色', '無色'];

  const handleColorToggle = (color: string) => {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter(c => c !== color));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  const handleSubmit = () => {
    if (name.trim() === '') {
      alert('デッキ名を入力してください');
      return;
    }

    const newDeck: Deck = {
      id: `deck_${Date.now()}`,
      name: name.trim(),
      colors: selectedColors,
      createdAt: new Date(),
      projectId: projectId
    };

    onDeckAdd(newDeck);
    setName('');
    setSelectedColors([]);
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: '20px', 
      margin: '10px 0', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9' 
    }}>
      <h3>新しいデッキを追加</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          デッキ名:
        </label>
        <input
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="例: 赤単速攻, 青白コントロール"
          style={{ 
            width: '100%', 
            padding: '8px', 
            fontSize: '14px', 
            border: '1px solid #ddd', 
            borderRadius: '4px' 
          }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          色 (複数選択可):
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {availableColors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorToggle(color)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: selectedColors.includes(color) ? '#007bff' : 'white',
                color: selectedColors.includes(color) ? 'white' : '#333',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {color}
            </button>
          ))}
        </div>
        {selectedColors.length > 0 && (
          <p style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
            選択中: {selectedColors.join(', ')}
          </p>
        )}
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
          追加
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

export default DeckForm;