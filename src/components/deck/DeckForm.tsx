import React, { useState } from 'react';
import { Deck, DeckFormProps } from '../../types';

const DeckForm: React.FC<DeckFormProps> = ({ projectId, onDeckAdd, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [colors, setColors] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');

  // 画像URL入力時のプレビュー
  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    if (url.trim()) {
      setImagePreview(url);
    } else {
      setImagePreview('');
    }
  };

  const handleSubmit = () => {
    if (name.trim() === '') {
      alert('デッキ名を入力してください');
      return;
    }

    const colorArray = colors
      .split(',')
      .map(c => c.trim())
      .filter(c => c !== '');

    const newDeck: Deck = {
      id: `deck_${Date.now()}`,
      name: name.trim(),
      colors: colorArray,
      imageUrl: imageUrl.trim() || undefined,
      createdAt: new Date(),
      projectId
    };

    onDeckAdd(newDeck);
    setName('');
    setColors('');
    setImageUrl('');
    setImagePreview('');
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
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '15px' }}>
        {/* 左側：画像プレビュー */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            デッキ画像:
          </label>
          <div style={{
            width: '100%',
            aspectRatio: '1',
            maxWidth: '200px',
            border: '2px dashed #ddd',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            overflow: 'hidden'
          }}>
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="プレビュー" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
                onError={() => {
                  setImagePreview('');
                  alert('画像の読み込みに失敗しました。URLを確認してください。');
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🖼️</div>
                <div style={{ fontSize: '12px' }}>画像なし</div>
              </div>
            )}
          </div>
        </div>

        {/* 右側：入力フォーム */}
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              デッキ名: <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="例: 青単コントロール"
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
              色:
            </label>
            <input
              type="text"
              value={colors}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColors(e.target.value)}
              placeholder="例: 青, 白"
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '14px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
            <small style={{ color: '#666' }}>複数の場合はカンマ区切り</small>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              画像URL:
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUrlChange(e.target.value)}
              placeholder="https://example.com/deck-image.jpg"
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '14px', 
                border: '1px solid #ddd', 
                borderRadius: '4px' 
              }}
            />
            <small style={{ color: '#666' }}>
              画像のURLを貼り付けてください（省略可）
            </small>
          </div>
        </div>
      </div>

      <div style={{ 
        padding: '10px', 
        backgroundColor: '#e7f3ff', 
        borderRadius: '4px', 
        marginBottom: '15px',
        fontSize: '13px',
        color: '#004085'
      }}>
        💡 <strong>画像の用意方法：</strong>
        <ul style={{ margin: '5px 0 0 20px', paddingLeft: '0' }}>
          <li>Google画像検索で画像を右クリック →「画像アドレスをコピー」</li>
          <li>Imgur、Gyazoなどの画像共有サイトにアップロード</li>
          <li>Discord、Twitterなどに投稿した画像のURLをコピー</li>
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleSubmit} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            flex: 1
          }}
        >
          追加
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
    </div>
  );
};

export default DeckForm;
