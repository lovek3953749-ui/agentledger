import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { SCHEMA_LIMITS, sanitizeText } from '../types/agent';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  signingIn: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncUserProfile(firebaseUser: User): Promise<void> {
  const path = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);

  try {
    const snapshot = await getDoc(userRef);
    const displayName = sanitizeText(
      firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      SCHEMA_LIMITS.DISPLAY_NAME_MAX
    );
    const email = sanitizeText(
      firebaseUser.email || 'unknown@example.com',
      SCHEMA_LIMITS.EMAIL_MAX
    );
    const photoUrl = sanitizeText(
      firebaseUser.photoURL || '',
      SCHEMA_LIMITS.PHOTO_URL_MAX
    );

    if (!snapshot.exists()) {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        displayName,
        email,
        photoUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName,
        email,
        photoUrl,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        setUser(nextUser);
        setAuthReady(true);
        try {
          await syncUserProfile(nextUser);
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
      } else {
        setUser(null);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in with Google.';
      if (message.includes('popup-closed-by-user')) {
        setAuthError('Sign-in window was closed before completing authentication.');
      } else if (message.includes('popup-blocked')) {
        setAuthError('Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.');
      } else {
        setAuthError('Authentication failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOutUser = async () => {
    setAuthError(null);
    try {
      await signOut(auth);
    } catch {
      setAuthError('Failed to sign out. Please refresh and try again.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        signingIn,
        authError,
        signInWithGoogle,
        signOutUser,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
