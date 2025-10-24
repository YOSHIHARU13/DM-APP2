import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCyD3vfOLS1GLnZmDs3e9R55z52D8Y8d7g",
  authDomain: "duelmasters-app.firebaseapp.com",
  projectId: "duelmasters-app",
  storageBucket: "duelmasters-app.firebasestorage.app",
  messagingSenderId: "896204652022",
  appId: "1:896204652022:web:086564bfa08beb6261dbd7"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
