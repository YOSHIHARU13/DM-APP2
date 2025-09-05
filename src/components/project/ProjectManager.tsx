import React, { useState, useEffect } from 'react';
import { Project, ProjectManagerProps } from '../../types';
import ProjectForm from './ProjectForm';

const ProjectManager: React.FC<ProjectManagerProps> = ({ user, onProjectSelect }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);

  // ローカルストレージからプロジェクト一覧を読み込み
  useEffect(() => {
    const savedProjects = localStorage.getItem(`projects_${user.id}`);
    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      // Date型の復元
      const projectsWithDates = parsedProjects.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt)
      }));
      setProjects(projectsWithDates);
    }
  }, [user.id]);

  // プロジェクトをローカルストレージに保存
  const saveProjects = (updatedProjects: Project[]) => {
    localStorage.setItem(`projects_${user.id}`, JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  // 新しいプロジェクトが追加されたときの処理
  const handleProjectAdd = (newProject: Project) => {
    const projectWithUserId = {
      ...newProject,
      userId: user.id
    };
    const updatedProjects = [...projects, projectWithUserId];
    saveProjects(updatedProjects);
    setShowForm(false);
  };

  // プロジェクト削除
  const handleDeleteProject = (projectId: string) => {
    if (window.confirm('このプロジェクトを削除しますか？デッキや対戦データも全て削除されます。')) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      saveProjects(updatedProjects);
      
      // 関連データも削除
      localStorage.removeItem(`decks_${projectId}`);
      localStorage.removeItem(`battles_${projectId}`);
    }
  };

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
