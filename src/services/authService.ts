import { UserProfile } from '../types';

/**
 * OAuth foi removido intencionalmente desta versão.
 * Mantemos apenas exports compatíveis para não quebrar a interface enquanto
 * o envio de e-mails não possui outro provedor de autenticação configurado.
 */

export interface GoogleUser {
  email: string;
  displayName: string;
  photoURL?: string;
}

export const SCOPES: string[] = [];

export const clearAccessToken = (): void => undefined;

export const isGoogleAuthError = (_errMsg?: string): boolean => false;

export const initAuth = (
  _onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
): (() => void) => {
  onAuthFailure?.();
  return () => undefined;
};

export const googleSignIn = async (): Promise<{
  user: GoogleUser;
  accessToken: string;
  profile: UserProfile;
} | null> => {
  throw new Error('A integração OAuth foi removida desta versão. A conexão com o Gmail e o envio de e-mails estão desativados.');
};

export const getAccessToken = async (): Promise<string | null> => null;

export const logout = async (): Promise<void> => undefined;
