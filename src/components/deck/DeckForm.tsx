import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { Deck, DeckFormProps } from '../../types';

const DeckForm: React.FC<DeckFormProps> = ({ projectId, onDeckAdd, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [colors, setColors] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

  // 画像ファイル選択時
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 画像サイズチェック（5MB以下）
      if (file.size > 5 * 1024 * 1024) {
        alert('画像サイズは5MB以下にしてください');
        return;
      }

      // 画像タイプチェック
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください');
        return;
      }

      setImageFile(file);
      
      // プレビュー生成
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 画像をFirebase Storageにアップロード
  const uploadImage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const filename = `deck-images/${projectId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  };

  const handleSubmit = async () => {
    if (name.trim() === '') {
      alert('デッキ名を入力してください');
      return;
    }

    setUploading(true);

    try {
      const colorArray = colors
        .split(',')
        .map(c => c.trim())
        .filter(c => c !== '');

      let imageUrl: string | undefined = undefined;

      // 画像がある場合はアップロード
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const newDeck: Deck = {
        id: `deck_${Date.now()}`,
        name: name.trim(),
        colors: colorArray,
        imageUrl: imageUrl,
        createdAt: new Date(),
        projectId
      };

      onDeckAdd(newDeck);
      
      // リセット
      setName('');
      setColors('');
      setImageFile(null);
      setImagePreview('');
    } catch (error) {
      console.error('画像アップロードに失敗:', error);
      alert('画像のアップロードに失敗しました。もう一度試してください。');
    } finally {
      setUploading(false);
    }
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
        {/* 左側：画像アップロード */}
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
            overflow: 'hidden',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={() => document.getElementById('imageInput')?.click()}
          >
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="プレビュー" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: '10px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '12px' }}>クリックして画像を選択</div>
              </div>
            )}
          </div>

          <input
            id="imageInput"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />

          {imageFile && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              ✅ {imageFile.name}
            </div>
          )}

          {imagePreview && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setImageFile(null);
                setImagePreview('');
              }}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '6px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              画像を削除
            </button>
          )}
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
        💡 <strong>画像について：</strong>
        <ul style={{ margin: '5px 0 0 20px', paddingLeft: '0' }}>
          <li>対応形式: JPG, PNG, GIF, WebP</li>
          <li>最大サイズ: 5MB</li>
          <li>画像は安全にFirebaseに保存されます</li>
        </ul>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={handleSubmit}
          disabled={uploading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: uploading ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: uploading ? 'not-allowed' : 'pointer',
            flex: 1
          }}
        >
          {uploading ? 'アップロード中...' : '追加'}
        </button>
        <button 
          onClick={onCancel}
          disabled={uploading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default DeckForm;
