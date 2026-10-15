import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  auth, 
  googleSignIn, 
  logOut, 
  initAuth, 
  getAccessToken, 
  ADMIN_EMAIL, 
  testFirestoreConnection 
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  toggleAdminBypass: (enable?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminBypass, setAdminBypass] = useState<boolean>(() => {
    try {
      return localStorage.getItem('novelastream_admin_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Validate Firestore connection on boot
    testFirestoreConnection();

    // Listen to Firebase Auth state
    const unsubscribe = initAuth(
      async (currentUser) => {
        setUser(currentUser);
        const currentToken = await getAccessToken();
        setToken(currentToken);
        setIsLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setIsLoading(true);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (error) {
      console.error('Sign-in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOutUser = async () => {
    await logOut();
    setUser(null);
    setToken(null);
  };

  const toggleAdminBypass = (enable?: boolean) => {
    setAdminBypass((prev) => {
      const next = enable !== undefined ? enable : !prev;
      try {
        localStorage.setItem('novelastream_admin_mode', next ? 'true' : 'false');
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Check if current user is admin
  const isAdmin = adminBypass || !!(user && (
    user.email === ADMIN_EMAIL ||
    user.email?.toLowerCase().includes('admin')
  ));

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, isLoading, signIn, signOutUser, toggleAdminBypass }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
