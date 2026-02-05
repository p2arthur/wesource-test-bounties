import { useWallet } from '@txnlab/use-wallet-react'
import { WALLET_ADAPTERS } from '@web3auth/base'
import { useMemo } from 'react'
import { useWeb3Auth } from '../contexts/Web3AuthContext'
import { createWeb3AuthSigner } from '../utils/web3auth/algorandAdapter'

export type SocialLoginProvider = 'github'

export const SOCIAL_LOGIN_PROVIDERS: Array<{ id: SocialLoginProvider; label: string }> = [
  { id: 'github', label: 'GitHub' },
]

export function useUnifiedWallet() {
  const { isConnected, algorandAccount, userInfo, login, logout, isLoading } = useWeb3Auth()
  const traditional = useWallet()

  return useMemo(() => {
    const isWeb3AuthActive = isConnected && !!algorandAccount
    const isTraditionalActive = !!traditional.activeAddress

    const activeAddress = isWeb3AuthActive ? algorandAccount!.address : traditional.activeAddress || null

    const connectWithSocial = async (provider: SocialLoginProvider) => {
      await login(WALLET_ADAPTERS.AUTH, provider)
    }

    return {
      activeAddress,
      isConnected: !!activeAddress,
      walletType: isWeb3AuthActive ? 'web3auth' : isTraditionalActive ? 'traditional' : null,
      isLoading,

      connectSocial: connectWithSocial,

      disconnect: async () => {
        if (isWeb3AuthActive) await logout()
        if (isTraditionalActive) await traditional.activeWallet?.disconnect()
      },

      userInfo,
      traditionalWallets: traditional.wallets,
      signer: isWeb3AuthActive ? createWeb3AuthSigner(algorandAccount) : traditional.transactionSigner,
    }
  }, [isConnected, algorandAccount, userInfo, traditional, isLoading, login, logout])
}
