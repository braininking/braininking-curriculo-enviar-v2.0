import { UserProfile } from '../types';

// Google Identity Services (OAuth 2.0) replaces Firebase Authentication.
// This is a public OAuth client ID, not a client secret.
const GOOGLE_CLIENT_ID = '137886819853-93sl727bl4ppaqtfogfd0vmnu6hv0ipk.apps.googleusercontent.com';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export interface GoogleUser {
  email: string;
  displayName: string;
  photoURL?: string;
}

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => GoogleTokenClient;
          revoke?: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;
let cachedUser: GoogleUser | null = null;
let pendingTokenClient: GoogleTokenClient | null = null;
let scriptPromise: Promise<void> | null = null;

const clearAccessToken = (): void => {
  cachedAccessToken = null;
  tokenExpiresAt = null;
};

export { clearAccessToken };

export const isGoogleAuthError = (errMsg?: string): boolean => {
  if (!errMsg) return false;
  const lower = errMsg.toLowerCase();
  return (
    lower.includes('invalid authentication credentials') ||
    lower.includes('unauthenticated') ||
    lower.includes('expected oauth 2 access token') ||
    lower.includes('insufficient authentication scopes') ||
    lower.includes('token expired') ||
    lower.includes('401') ||
    lower.includes('invalid credentials')
  );
};

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity-services]');
    const script = existing || document.createElement('script');
    const onLoad = () => window.google?.accounts?.oauth2
      ? resolve()
      : reject(new Error('A biblioteca oficial de login do Google não foi carregada.'));
    const onError = () => reject(new Error('Não foi possível carregar o login do Google. Verifique sua conexão e tente novamente.'));

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentityServices = 'true';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
};

export const initAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
): (() => void) => {
  if (cachedUser && cachedAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    onAuthSuccess?.(cachedUser, cachedAccessToken);
  } else {
    onAuthFailure?.();
  }
  // Authentication state is held in memory only; no access token is persisted.
  return () => undefined;
};

export const googleSignIn = async (): Promise<{ user: GoogleUser; accessToken: string; profile: UserProfile } | null> => {
  await loadGoogleIdentityServices();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('O login OAuth do Google não está disponível.');

  const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
    try {
      pendingTokenClient = oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES.join(' '),
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error(response.error_description || response.error || 'O Google não forneceu autorização para acessar o Gmail.'));
            return;
          }
          resolve(response);
        },
        error_callback: (error) => reject(new Error(error.message || error.type || 'A janela de autorização do Google foi bloqueada ou fechada.')),
      });
      pendingTokenClient.requestAccessToken({ prompt: 'consent select_account' });
    } catch (error) {
      reject(error);
    }
  });

  const accessToken = tokenResponse.access_token!;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    clearAccessToken();
    throw new Error('O Google autorizou o acesso, mas não foi possível ler o perfil da conta. Tente conectar novamente.');
  }

  const details = await response.json() as { email?: string; name?: string; picture?: string };
  if (!details.email) {
    clearAccessToken();
    throw new Error('O Google não retornou o endereço de e-mail da conta.');
  }

  const user: GoogleUser = {
    email: details.email,
    displayName: details.name || details.email.split('@')[0],
    photoURL: details.picture,
  };
  cachedAccessToken = accessToken;
  tokenExpiresAt = Date.now() + Math.max(60, (tokenResponse.expires_in || 3600) - 60) * 1000;
  cachedUser = user;

  const profile: UserProfile = {
    email: user.email,
    name: user.displayName,
    picture: user.photoURL,
  };
  return { user, accessToken, profile };
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && tokenExpiresAt && Date.now() >= tokenExpiresAt) {
    clearAccessToken();
    cachedUser = null;
    return null;
  }
  return cachedAccessToken;
};

export const logout = async (): Promise<void> => {
  const token = cachedAccessToken;
  clearAccessToken();
  cachedUser = null;
  pendingTokenClient = null;
  if (token && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(token, () => undefined);
  }
};
