import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User, LoginFormProps } from '../../types';

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const firebaseUser = result.user;
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      let userData: User;
      
      if (userDoc.exists()) {
        userData = userDoc.data() as User;
      } else {
        userData = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || 'Unknown User',
          createdAt: new Date()
        };
        
        await setDoc(userDocRef, userData);
      }
      
      onLogin(userData);
    } catch (error) {
      alert('ログインに失敗しました');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>ログイン</h2>
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#db4437',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'default' : 'pointer'
        }}
      >
        {loading ? 'ログイン中...' : '🔍 Googleでログイン'}
      </button>
    </div>
  );
};

export default LoginForm;