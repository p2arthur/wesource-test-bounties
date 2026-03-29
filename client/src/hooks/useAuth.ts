import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useUnifiedWallet } from './useUnifiedWallet';
import { getAuthHeaders } from '../utils/auth';

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

  const getAuth = useCallback(async (): Promise<HeadersInit> => {
    // If JWT is available, use it
    if (jwtToken) {
      return {
        Authorization: `Bearer ${jwtToken}`,
      };
    }

    // Fall back to wallet-based auth
    if (!walletType || !activeAddress) {
      return {};
    }

    try {
      return await getAuthHeaders(walletType as any, activeAddress, signLoginMessage);
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      enqueueSnackbar('Failed to authenticate. Please reconnect wallet.', {
        variant: 'error'
      });
      return {};
    }
  }, [walletType, activeAddress, signLoginMessage, jwtToken, enqueueSnackbar]);

  const login = useCallback(async () => {
    if (!activeAddress || !signLoginMessage) {
      enqueueSnackbar('Wallet not connected', { variant: 'error' });
      return;
    }

    try {
      const { signature, message } = await signLoginMessage();

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: activeAddress,
          message,
          signature,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || `Login failed (status ${response.status})`);
      }

      const data = await response.json();
      const token = data.token || data.jwt;

      if (!token) {
        throw new Error('No token received from backend');
      }

      localStorage.setItem('auth_token', token);
      setJwtToken(token);
      enqueueSnackbar('Logged in successfully', { variant: 'success' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      console.error('AUTH LOGIN:', error);
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  }, [activeAddress, signLoginMessage, enqueueSnackbar]);

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
    isAuthenticated: !!activeAddress && !!jwtToken,
    walletType,
    activeAddress,
    jwtToken,
  };
}
