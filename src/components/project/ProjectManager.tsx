import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Project, ProjectManagerProps } from '../../types';
import ProjectForm from './ProjectForm';

const ProjectManager: React.FC<ProjectManagerProps> = ({ user, onProjectSelect }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Firestoreからプロジェクト一覧を読み込み
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsRef = collection(db, 'projects');
        const q = query(projectsRef, where('userId', '==', user.id));
        const querySnapshot = await getDocs(q);
        
        const loadedProjects: Project[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loadedProjects.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            createdAt: data.createdAt.toDate(), // Firestoreのタイムスタンプを変換
            userId: data.userId
          });
        });

        // 作成日順でソート（新しい順）
        loadedProjects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setProjects(loadedProjects);
      } catch (error) {
        console.error('プロジェクトの読み込みに失敗:', error);
        alert('プロジェクトの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user.id]);

  // 新しいプロジェクトが追加されたときの処理
  const handleProjectAdd = async (newProject: Project) => {
    try {
      const projectData = {
        name: newProject.name,
        description: newProject.description,
        createdAt: newProject.createdAt,
        userId: user.id
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);
      
      // ローカルステートを更新
      const projectWithId = {
        ...newProject,
        id: docRef.id,
        userId: user.id
      };
      
      setProjects(prev => [projectWithId, ...prev]);
      setShowForm(false);
      
      console.log('プロジェクトが保存されました:', docRef.id);
    } catch (error) {
      console.error('プロジェクトの保存に失敗:', error);
      alert('プロジェクトの保存に失敗しました');
    }
  };

  // プロジェクト削除
  const handleDeleteProject = async (projectId: string) => {
    if (window.confirm('このプロジェクトを削除しますか？デッキや対戦データも全て削除されます。')) {
      try {
        // Firestoreからプロジェクトを削除
        await deleteDoc(doc(db, 'projects', projectId));
        
        // TODO: 関連するデッキと対戦データも削除する必要があります
        // 後でDeckListを修正した後に実装します
        
        // ローカルステートを更新
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        console.log('プロジェクトが削除されました:', projectId);
      } catch (error) {
        console.error('プロジェクトの削除に失敗:', error);
        alert('プロジェクトの削除に失敗しました');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>プロジェクトを読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>{user.username}のプロジェクト管理</h2>
      
      <div style={{ marginBottom: '20px' }}>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            + 新しいプロジェクトを追加
          </button>
        )}
      </div>

      {showForm && (
        <ProjectForm
          onProjectAdd={handleProjectAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div>
        <h3>既存のプロジェクト ({projects.length}件)</h3>
        {projects.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '8px' 
          }}>
            <p style={{ color: '#6c757d', fontSize: '18px' }}>まだプロジェクトがありません。</p>
            <p style={{ color: '#6c757d' }}>上のボタンから新しいプロジェクトを作成してください。</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {projects.map(project => (
              <div key={project.id} style={{ 
                border: '1px solid #ddd', 
                padding: '20px', 
                borderRadius: '8px',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{project.name}</h4>
                    {project.description && (
                      <p style={{ margin: '0 0 10px 0', color: '#666' }}>{project.description}</p>
                    )}
                    <p style={{ margin: '0', color: '#999', fontSize: '14px' }}>
                      作成日: {project.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                    <button 
                      onClick={() => onProjectSelect(project)} 
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      選択
                    </button>
                    <button 
                      onClick={() => handleDeleteProject(project.id)} 
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManager;

