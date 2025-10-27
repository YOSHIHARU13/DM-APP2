import React, { useState } from 'react';
import { TournamentFormProps } from '../../types';

export const TournamentForm: React.FC<TournamentFormProps> = ({  projectId, 
  decks, 
  onTournamentCreate, 
  onCancel 
}) => {
  const [name, setName] = useState<string>('');
  const [format, setFormat] = useState<'single' | 'double'>('single');
  const [matchType, setMatchType] = useState<'best_of_1' | 'best_of_3'>('best_of_1');
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);

  const handleDeckToggle = (deckId: string) => {
    if (selectedDeckIds.includes(deckId)) {
      setSelectedDeckIds(selectedDeckIds.filter(id => id !== deckId));
    } else {
      setSelectedDeckIds([...selectedDeckIds, deckId]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDeckIds([]);
    } else {
      setSelectedDeckIds(decks.map(d => d.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSubmit = () => {
    if (name.trim() === '') {
      alert('トーナメント名を入力してください');
      return;
    }

    if (selectedDeckIds.length < 2) {
      alert('最低2つのデッキを選択してください');
      return;
    }

    onTournamentCreate({
      projectId,
      name: name.trim(),
      format,
      matchType,
      participantDeckIds: selectedDeckIds
    });
  };

  return (
    <div style={{ 
      border: '1px solid #ccc', 
      padding: '20px', 
      margin: '10px 0', 
      borderRadius: '8px', 
      backgroundColor: '#f9f9f9',
      maxWidth: '800px'
    }}>
      <h3>新しいトーナメントを作成</h3>
      
      {/* トーナメント名 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          トーナメント名: <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 春季杯、新春トーナメント"
          style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '16px', 
            border: '1px solid #ddd', 
            borderRadius: '4px' 
          }}
        />
      </div>

      {/* 形式選択 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          トーナメント形式:
        </label>
        <div style={{ display: 'flex', gap: '15px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px 20px',
            border: `2px solid ${format === 'single' ? '#007bff' : '#ddd'}`,
            borderRadius: '8px',
            backgroundColor: format === 'single' ? '#e7f3ff' : 'white',
            cursor: 'pointer',
            flex: 1
          }}>
            <input
              type="radio"
              name="format"
              checked={format === 'single'}
              onChange={() => setFormat('single')}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>シングルエリミネーション</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                1回負けたら終了（約17試合）
              </div>
            </div>
          </label>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px 20px',
            border: `2px solid ${format === 'double' ? '#007bff' : '#ddd'}`,
            borderRadius: '8px',
            backgroundColor: format === 'double' ? '#e7f3ff' : 'white',
            cursor: 'pointer',
            flex: 1
          }}>
            <input
              type="radio"
              name="format"
              checked={format === 'double'}
              onChange={() => setFormat('double')}
            />
            <div>
              <div style={{ fontWeight: 'bold' }}>ダブルエリミネーション</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                敗者復活あり（約30試合）
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 試合形式選択 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          試合形式:
        </label>
        <div style={{ display: 'flex', gap: '15px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px 20px',
            border: `2px solid ${matchType === 'best_of_1' ? '#28a745' : '#ddd'}`,
            borderRadius: '8px',
            backgroundColor: matchType === 'best_of_1' ? '#d4edda' : 'white',
            cursor: 'pointer',
            flex: 1
          }}>
            <input
              type="radio"
              name="matchType"
              checked={matchType === 'best_of_1'}
              onChange={() => setMatchType('best_of_1')}
            />
            <div style={{ fontWeight: 'bold' }}>1本勝負</div>
          </label>
          
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px 20px',
            border: `2px solid ${matchType === 'best_of_3' ? '#28a745' : '#ddd'}`,
            borderRadius: '8px',
            backgroundColor: matchType === 'best_of_3' ? '#d4edda' : 'white',
            cursor: 'pointer',
            flex: 1
          }}>
            <input
              type="radio"
              name="matchType"
              checked={matchType === 'best_of_3'}
              onChange={() => setMatchType('best_of_3')}
            />
            <div style={{ fontWeight: 'bold' }}>3本中2本先取</div>
          </label>
        </div>
      </div>

      {/* 参加デッキ選択 */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <label style={{ fontWeight: 'bold' }}>
            参加デッキ: <span style={{ color: 'red' }}>*</span>
            <span style={{ marginLeft: '10px', color: '#666', fontWeight: 'normal' }}>
              ({selectedDeckIds.length}/{decks.length}選択中)
            </span>
          </label>
          <button
            onClick={handleSelectAll}
            style={{
              padding: '6px 12px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {selectAll ? '全解除' : '全選択'}
          </button>
        </div>
        
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto', 
          border: '1px solid #ddd', 
          borderRadius: '6px',
          backgroundColor: 'white',
          padding: '10px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {decks.map(deck => (
              <label 
                key={deck.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  border: `2px solid ${selectedDeckIds.includes(deck.id) ? '#007bff' : '#e0e0e0'}`,
                  borderRadius: '6px',
                  backgroundColor: selectedDeckIds.includes(deck.id) ? '#e7f3ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDeckIds.includes(deck.id)}
                  onChange={() => handleDeckToggle(deck.id)}
                />
                <div style={{ flex: 1 }}>
                  {deck.imageUrl && (
                    <img 
                      src={deck.imageUrl} 
                      alt={deck.name}
                      style={{ 
                        width: '30px', 
                        height: '30px', 
                        objectFit: 'cover', 
                        borderRadius: '4px',
                        marginRight: '8px'
                      }}
                    />
                  )}
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{deck.name}</span>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {deck.colors.join(', ')}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 注意事項 */}
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '6px', 
        marginBottom: '15px',
        fontSize: '13px',
        color: '#856404'
      }}>
        <strong>💡 注意事項：</strong>
        <ul style={{ margin: '5px 0 0 20px', paddingLeft: '0' }}>
          <li>参加デッキ数が2のべき乗でない場合、自動的にシードが設定されます</li>
          <li>シード順はランダムに決定されます</li>
          {format === 'single' && (
            <li>決勝の前に3位決定戦が行われます</li>
          )}
          {format === 'double' && (
            <li>グランドファイナルは1試合のみで決着します</li>
          )}
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleSubmit} 
          disabled={selectedDeckIds.length < 2 || name.trim() === ''}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: (selectedDeckIds.length < 2 || name.trim() === '') ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: (selectedDeckIds.length < 2 || name.trim() === '') ? 'not-allowed' : 'pointer',
            flex: 1,
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          トーナメント開始
        </button>
        <button 
          onClick={onCancel}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default TournamentForm;
