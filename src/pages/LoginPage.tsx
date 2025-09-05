import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase'; // パスは適宜調整
import { doc, getDoc } from 'firebase/firestore';
import LoginForm from '../components/auth/LoginForm';
import ProjectManager from '../components/project/ProjectManager';
import DeckList from '../components/deck/DeckList';
import { User, Project } from '../types';

const LoginPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // 認証状態確認中

  // Firebase認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Firestoreからユーザーデータを取得
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userWithDate: User = {
              ...userData,
              createdAt: userData.createdAt.toDate() // Firestoreのタイムスタンプを変換
            } as User;
            setCurrentUser(userWithDate);
          }
        } catch (error) {
          console.error('ユーザーデータの取得に失敗:', error);
        }
      } else {
        setCurrentUser(null);
        setSelectedProject(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // クリーンアップ
  }, []);

  // ログインが成功したときの処理（Firebaseで自動的に呼ばれる）
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // LocalStorageは不要（Firebaseが管理）
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // setCurrentUserとsetSelectedProjectはonAuthStateChangedで自動的にnullになる
    } catch (error) {
      console.error('ログアウトに失敗:', error);
    }
  };

  // プロジェクト選択処理
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
  };

  // プロジェクト選択画面に戻る
  const handleBackToProject = () => {
    setSelectedProject(null);
  };

  // 認証状態確認中
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        fontSize: '18px',
        color: '#6c757d'
      }}>
        読み込み中...
      </div>
    );
  }

  // プロジェクト選択済み：デッキ管理画面
  if (selectedProject && currentUser) {
    return (
      <div>
        {/* ヘッダー */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '10px 20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h1 style={{ margin: 0, color: '#495057' }}>デュエマ戦績管理アプリ</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#6c757d' }}>ようこそ、{currentUser.username}さん</span>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '6px 12px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* デッキ管理画面 */}
        <DeckList 
          project={selectedProject}
          onBackToProject={handleBackToProject}
        />
      </div>
    );
  }

  // ログイン済み：プロジェクト管理画面
  if (currentUser) {
    return (
      <div>
        {/* ヘッダー */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '10px 20px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h1 style={{ margin: 0, color: '#495057' }}>デュエマ戦績管理アプリ</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#6c757d' }}>ようこそ、{currentUser.username}さん</span>
            <button 
              onClick={handleLogout}
              style={{ 
                padding: '6px 12px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ログアウト
            </button>
          </div>
        </div>

        {/* プロジェクト管理画面 */}
        <ProjectManager 
          user={currentUser}
          onProjectSelect={handleProjectSelect}
        />
      </div>
    );
  }

  // 未ログイン：ログイン画面
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          color: '#495057', 
          marginBottom: '10px' 
        }}>
          デュエマ戦績管理アプリ
        </h1>
        <p style={{ 
          fontSize: '1.1rem', 
          color: '#6c757d',
          margin: 0
        }}>
          デッキの対戦成績を記録・分析しよう
        </p>
      </div>
      
      <LoginForm onLogin={handleLogin} />
      
      <div style={{ 
        marginTop: '30px', 
        textAlign: 'center',
        color: '#6c757d',
        fontSize: '14px'
      }}>
        <p>このアプリでできること:</p>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0,
          margin: '10px 0'
        }}>
          <li>📝 デッキ・対戦結果の登録</li>
          <li>📊 勝率・相性の分析</li>
          <li>🔍 三すくみ関係の発見</li>
          <li>🎲 ランダムマッチング</li>
        </ul>
      </div>
    </div>
  );
};

export default LoginPage;