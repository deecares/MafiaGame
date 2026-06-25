import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously as fbSignInAnonymously, onAuthStateChanged as fbOnAuthStateChanged } from 'firebase/auth';

export interface AuthUser {
  uid: string;
  isAnonymous: boolean;
}

export interface AuthProvider {
  signInAnonymously: () => Promise<AuthUser>;
  onAuthStateChanged: (callback: (user: AuthUser | null) => void) => () => void;
  getCurrentUser: () => AuthUser | null;
}

// Local Fallback Auth Provider using localStorage
class LocalAuthProvider implements AuthProvider {
  private listeners: ((user: AuthUser | null) => void)[] = [];
  private user: AuthUser | null = null;

  constructor() {
    // Load existing user from localStorage if present
    const cachedUid = localStorage.getItem('mafia_local_uid');
    if (cachedUid) {
      this.user = { uid: cachedUid, isAnonymous: true };
    }
  }

  public async signInAnonymously(): Promise<AuthUser> {
    let cachedUid = localStorage.getItem('mafia_local_uid');
    if (!cachedUid) {
      cachedUid = 'local_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('mafia_local_uid', cachedUid);
    }
    this.user = { uid: cachedUid, isAnonymous: true };
    this.triggerListeners();
    return this.user;
  }

  public onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    // Immediately call callback with current user
    callback(this.user);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public getCurrentUser(): AuthUser | null {
    return this.user;
  }

  private triggerListeners() {
    this.listeners.forEach(callback => callback(this.user));
  }
}

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let authProvider: AuthProvider;

// Determine if config is populated
const hasConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_FIREBASE_API_KEY' &&
  firebaseConfig.projectId;

if (hasConfig) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const auth = getAuth(app);
    
    authProvider = {
      signInAnonymously: async () => {
        const credential = await fbSignInAnonymously(auth);
        return {
          uid: credential.user.uid,
          isAnonymous: credential.user.isAnonymous,
        };
      },
      onAuthStateChanged: (callback) => {
        return fbOnAuthStateChanged(auth, (user) => {
          if (user) {
            callback({ uid: user.uid, isAnonymous: user.isAnonymous });
          } else {
            callback(null);
          }
        });
      },
      getCurrentUser: () => {
        const user = auth.currentUser;
        return user ? { uid: user.uid, isAnonymous: user.isAnonymous } : null;
      }
    };
    console.log('Firebase Auth initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Firebase Auth, falling back to local auth:', error);
    authProvider = new LocalAuthProvider();
  }
} else {
  console.log('No Firebase credentials found. Running with Local Auth Fallback.');
  authProvider = new LocalAuthProvider();
}

export { authProvider };
