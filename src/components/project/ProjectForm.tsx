import React, { useState } from 'react';
import { Project, ProjectFormProps } from '../../types';

const ProjectForm: React.FC<ProjectFormProps> = ({ onProjectAdd, onCancel }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const handleSubmit = () => {
    if (name.trim() === '') {
      alert('プロジェクト名を入力してください');
      return;
    }

    const newProject: Project = {
      id: `project_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date(),
      userId: 'current_user'
    };

    onProjectAdd(newProject);
    setName('');
    setDescription('');
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '10px', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h3>新しいプロジェクトを追加</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>プロジェクト名:</label>
        <input
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="例: シーズン1, メインデッキ戦"
          style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>説明:</label>
        <textarea
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="このプロジェクトの説明（省略可）"
          style={{ width: '100%', padding: '8px', height: '60px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
        />
      </div>
      
      <div>
        <button 
          onClick={handleSubmit} 
          style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          追加
        </button>
        <button 
          onClick={onCancel}
          style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};

export default ProjectForm;