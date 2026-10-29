import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { UserProfile } from '../types';

// Configuração do aplicativo Web Firebase "enviar curriculo".
const firebaseConfig = {
  apiKey: 'AIzaSyCQ1UEFncKstx8IyYqb59yxmEGvsnTNx0Q',
  authDomain: 'enviar-curriculo-421d5.firebaseapp.com',
  projectId: 'enviar-curriculo-421d5',
  storageBucket: 'enviar-curriculo-421d5.firebasestorage.app',
  messagingSenderId: '680490857211',
  appId: '1:680490857211:web:74d20da2d7c4650513365e',
  measurementId: 'G-0P2Z5M7HV2',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export interface GoogleUser {
  email: string;
  displayName: string;
  photoURL?: string;
}

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'consent select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;

export const clearAccessToken = (): void => {
  cachedAccessToken = null;
  tokenExpiresAt = null;
};

export const isGoogleAuthError = (errMsg?: string): boolean => {
  const msg = (errMsg || '').toLowerCase();
  return (
    msg.includes('unauthenticated') ||
    msg.includes('invalid token') ||
    msg.includes('insufficient') ||
    msg.includes('401') ||
    msg.includes('invalid_grant') ||
    msg.includes('expired')
  );
};

export const initAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
): (() => void) =>
  onAuthStateChanged(auth, (user) => {
    // O login do Firebase persiste, mas o token de acesso da Gmail API fica em memória.
    if (user && cachedAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
      onAuthSuccess?.(
        {
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
          photoURL: user.photoURL || undefined,
        },
        cachedAccessToken
      );
    } else {
      if (!user) clearAccessToken();
      onAuthFailure?.();
    }
  });

export const googleSignIn = async (): Promise<{
  user: GoogleUser;
  accessToken: string;
  profile: UserProfile;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'O Google autenticou a conta, mas não retornou o token da Gmail API. Confira se a Gmail API está ativada no projeto Google Cloud e se o escopo gmail.send está autorizado.'
      );
    }

    cachedAccessToken = credential.accessToken;
    tokenExpiresAt = Date.now() + 50 * 60 * 1000;

    const user: GoogleUser = {
      email: result.user.email || '',
      displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Usuário',
      photoURL: result.user.photoURL || undefined,
    };
    const profile: UserProfile = {
      email: user.email,
      name: user.displayName,
      picture: user.photoURL,
    };

    return { user, accessToken: cachedAccessToken, profile };
  } catch (error) {
    console.error('Erro ao conectar Gmail via Firebase/Google OAuth:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && tokenExpiresAt && Date.now() >= tokenExpiresAt) {
    clearAccessToken();
  }
  return cachedAccessToken;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  clearAccessToken();
};
