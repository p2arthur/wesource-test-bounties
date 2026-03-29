import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useUnifiedWallet } from './useUnifiedWallet';
import { getAuthHeaders } from '../utils/auth';
import { getWeb3AuthInstance } from '../utils/web3auth/web3authConfig';

export function useAuth() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { walletType, activeAddress, signLoginMessage } = useUnifiedWallet();
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  // Load JWT from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setJwtToken(storedToken);
    }
  }, []);

  // Auto-fetch Web3Auth ID token when connected via Web3Auth
  useEffect(() => {
    if (walletType !== 'web3auth' || !activeAddress || jwtToken) return;
    getWeb3AuthInstance()?.authenticateUser()
      .then(({ idToken }) => {
        localStorage.setItem('auth_token', idToken);
        setJwtToken(idToken);
      })
      .catch(console.error);
  }, [walletType, activeAddress, jwtToken]);

  const getAuth = useCallback(async (): Promise<HeadersInit> => {
    if (jwtToken) {
      return { Authorization: `Bearer ${jwtToken}` };
    }
    if (!walletType || !activeAddress) {
      return {};
    }
    try {
      return await getAuthHeaders(walletType as any, activeAddress, signLoginMessage);
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      enqueueSnackbar('Failed to authenticate. Please reconnect wallet.', { variant: 'error' });
      return {};
    }
  }, [walletType, activeAddress, signLoginMessage, jwtToken, enqueueSnackbar]);

  const login = useCallback(async () => {
    if (!activeAddress) {
      enqueueSnackbar('Wallet not connected', { variant: 'error' });
      return;
    }

    try {
      if (walletType === 'web3auth') {
        const instance = getWeb3AuthInstance();
        if (!instance) throw new Error('Web3Auth not initialized');
        const { idToken } = await instance.authenticateUser();
        localStorage.setItem('auth_token', idToken);
        setJwtToken(idToken);
        return;
      }

      const { signature, message } = await signLoginMessage();
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/wallet-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: activeAddress, message, signature }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || `Login failed (status ${response.status})`);
      }

      const data = await response.json();
      const token = data.token || data.jwt;
      if (!token) throw new Error('No token received from backend');

      localStorage.setItem('auth_token', token);
      setJwtToken(token);
      enqueueSnackbar('Logged in successfully', { variant: 'success' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      console.error('AUTH LOGIN:', error);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  }, [walletType, activeAddress, signLoginMessage, enqueueSnackbar]);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    setJwtToken(null);
    enqueueSnackbar('Logged out', { variant: 'success' });
  }, [enqueueSnackbar]);

  const handleAuthError = useCallback((error: any) => {
    if (error.response?.status === 401) {
      logout();
      enqueueSnackbar('Session expired, please login again', {
        variant: 'error',
        autoHideDuration: 2000,
        onClose: () => navigate('/login')
      });
    }
    throw error;
  }, [logout, enqueueSnackbar, navigate]);

  return {
    getAuth,
    handleAuthError,
    login,
    logout,
    isAuthenticated: !!activeAddress && (walletType === 'web3auth' ? true : !!jwtToken),
    walletType,
    activeAddress,
    jwtToken,
  };
}
