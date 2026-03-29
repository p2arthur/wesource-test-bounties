import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useUnifiedWallet } from './useUnifiedWallet';
import { getAuthHeaders } from '../utils/auth';

export function useAuth() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { walletType, activeAddress, signLoginMessage } = useUnifiedWallet();

  const getAuth = useCallback(async (): Promise<HeadersInit> => {
    if (!walletType || !activeAddress) {
      return {};
    }

    try {
      return await getAuthHeaders(walletType, activeAddress, signLoginMessage);
    } catch (error) {
      console.error('Failed to get auth headers:', error);
      enqueueSnackbar('Failed to authenticate. Please reconnect wallet.', { 
        variant: 'error' 
      });
      return {};
    }
  }, [walletType, activeAddress, signLoginMessage, enqueueSnackbar]);

  const handleAuthError = useCallback((error: any) => {
    if (error.response?.status === 401) {
      enqueueSnackbar('Session expired, please login again', { 
        variant: 'error',
        autoHideDuration: 2000,
        onClose: () => navigate('/login')
      });
    }
    throw error;
  }, [enqueueSnackbar, navigate]);

  return {
    getAuth,
    handleAuthError,
    isAuthenticated: !!activeAddress,
    walletType,
    activeAddress,
  };
}
