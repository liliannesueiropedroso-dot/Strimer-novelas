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

export const ADMIN_EMAILS = [
  'reinatorrez001@gmail.com',
];

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

  useEffect(() => {
    // Clear any legacy client-side admin bypasses permanently
    try {
      localStorage.removeItem('novelastream_admin_mode');
    } catch (e) {
      console.error(e);
    }

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
    try {
      localStorage.removeItem('novelastream_admin_mode');
    } catch {}
  };

  // Safe no-op kept strictly for interface backwards compatibility
  const toggleAdminBypass = (_enable?: boolean) => {
    // No-op: bypass disabled permanently for security
  };

  // Strict administrator verification: User MUST be signed in with the authorized administrator email
  const isAdmin = !!(
    user && 
    user.email && 
    (user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() ||
     ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(user.email.toLowerCase().trim()))
  );

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
