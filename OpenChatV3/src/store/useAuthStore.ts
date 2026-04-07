import { create } from 'zustand';
import { 
  onAuthStateChanged, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { UserData } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface AuthState {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
  cleanup: () => void;
  togglePremium: () => Promise<void>;
  incrementAIUsage: () => Promise<void>;
  setPremiumTheme: (theme: string) => Promise<void>;
  updateProfileData: (data: Partial<UserData>) => Promise<void>;
  _authUnsubscribe?: (() => void) | null;
  _userUnsubscribe?: (() => void) | null;
  _visibilityHandler?: (() => void) | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userData: null,
  loading: true,
  theme: 'dark',
  _authUnsubscribe: null as (() => void) | null,
  _userUnsubscribe: null as (() => void) | null,
  _visibilityHandler: null as (() => void) | null,

  setTheme: (theme) => {
    set({ theme });
    const { userData } = get();
    const currentTheme = userData?.premiumTheme || '';
    
    // Remove all theme classes
    document.documentElement.classList.remove('theme-midnight', 'theme-sunset');
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      if (currentTheme) {
        document.documentElement.classList.add(`theme-${currentTheme}`);
      }
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  login: async (email, pass) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, 'users');
      }
      throw error;
    }
  },

  signup: async (email, pass, name) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(user, { displayName: name });
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        username: name,
        username_lowercase: name.toLowerCase(),
        email: user.email,
        photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        isOnline: true,
        lastSeen: Date.now(),
        createdAt: serverTimestamp(),
        isPremium: false,
        aiUsageCount: 0,
        premiumTheme: ''
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, 'users');
      }
      throw error;
    }
  },

  loginWithGoogle: async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.WRITE, 'users');
      }
      throw error;
    }
  },

  logout: async () => {
    const { user, cleanup } = get();
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, { isOnline: false, lastSeen: Date.now() }, { merge: true });
      } catch (error) {
        console.error('Error updating presence on logout:', error);
      }
    }
    cleanup();
    await signOut(auth);
  },

  cleanup: () => {
    const { _authUnsubscribe, _userUnsubscribe, _visibilityHandler } = get() as any;
    if (_authUnsubscribe) _authUnsubscribe();
    if (_userUnsubscribe) _userUnsubscribe();
    if (_visibilityHandler) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
    }
    set({ _authUnsubscribe: null, _userUnsubscribe: null, _visibilityHandler: null });
  },

  togglePremium: async () => {
    const { user, userData } = get();
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, { isPremium: !userData?.isPremium }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  },

  incrementAIUsage: async () => {
    const { user, userData } = get();
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, { aiUsageCount: (userData?.aiUsageCount || 0) + 1 }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  },

  setPremiumTheme: async (themeName: string) => {
    const { user, userData } = get();
    if (!user || !userData?.isPremium) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, { premiumTheme: themeName }, { merge: true });
      
      // Apply theme immediately if in dark mode
      if (get().theme === 'dark') {
        document.documentElement.classList.remove('theme-midnight', 'theme-sunset');
        if (themeName) {
          document.documentElement.classList.add(`theme-${themeName}`);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  },

  updateProfileData: async (data) => {
    const { user } = get();
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, data, { merge: true });
      
      // If username is updated, also update Firebase Auth profile
      if (data.username) {
        await updateProfile(user, { displayName: data.username });
      }
      // If photoURL is updated, also update Firebase Auth profile
      if (data.photoURL) {
        await updateProfile(user, { photoURL: data.photoURL });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  },

  initialize: () => {
    const { _authUnsubscribe } = get() as any;
    if (_authUnsubscribe) return;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      set({ user: authUser });
      
      // Cleanup previous user listeners if any
      const { _userUnsubscribe, _visibilityHandler } = get() as any;
      if (_userUnsubscribe) _userUnsubscribe();
      if (_visibilityHandler) {
        document.removeEventListener('visibilitychange', _visibilityHandler);
      }

      if (authUser) {
        try {
          const userRef = doc(db, 'users', authUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: authUser.uid,
              username: authUser.displayName || 'User',
              username_lowercase: (authUser.displayName || 'User').toLowerCase(),
              email: authUser.email,
              photoURL: authUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.displayName || 'User')}&background=random`,
              isOnline: true,
              lastSeen: Date.now(),
              createdAt: serverTimestamp(),
              isPremium: false,
              aiUsageCount: 0,
              premiumTheme: ''
            });
          } else {
            const data = userSnap.data() as UserData;
            // Self-heal: Add lowercase username if missing
            if (!data.username_lowercase) {
              await setDoc(userRef, { 
                username_lowercase: (data.username || 'User').toLowerCase() 
              }, { merge: true });
            }
            await setDoc(userRef, { isOnline: true, lastSeen: Date.now() }, { merge: true });
            
            if (data.isPremium && data.premiumTheme && get().theme === 'dark') {
              document.documentElement.classList.add(`theme-${data.premiumTheme}`);
            }
          }

          const unsubUserData = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              set({ userData: doc.data() as UserData });
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}`);
          });

          const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
              setDoc(userRef, { isOnline: false, lastSeen: Date.now() }, { merge: true });
            } else {
              setDoc(userRef, { isOnline: true, lastSeen: Date.now() }, { merge: true });
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);

          set({ 
            _userUnsubscribe: unsubUserData, 
            _visibilityHandler: handleVisibilityChange as any,
            loading: false 
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}`);
          set({ loading: false });
        }
      } else {
        set({ userData: null, loading: false, _userUnsubscribe: null, _visibilityHandler: null });
      }
    });

    set({ _authUnsubscribe: unsubscribe });
  }
}));
