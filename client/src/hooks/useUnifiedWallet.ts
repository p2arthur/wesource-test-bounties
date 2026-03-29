import { useWallet } from '@txnlab/use-wallet-react'
import { WALLET_ADAPTERS } from '@web3auth/base'
import { useMemo } from 'react'
import { Buffer } from 'buffer'
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

    const signLoginMessage = async (): Promise<{ signature: string; message: string }> => {
      // Throw error for web3auth users
      if (isWeb3AuthActive) {
        throw new Error('Web3Auth users use JWT cookies, not message signing')
      }

      // Check if traditional wallet is connected
      if (!isTraditionalActive || !traditional.activeAddress) {
        throw new Error('No traditional wallet connected')
      }

      // Create message with timestamp
      const timestamp = Date.now()
      const message = `WeSource login: ${timestamp}`

      let signature: Uint8Array

      // Try to use signData if available
      if (traditional.signData) {
        const signDataResponse = await traditional.signData(message, {
          scope: 1, // ScopeType.AUTH
          encoding: 'utf-8',
        })
        signature = signDataResponse.signature
      } else if (traditional.signTransactions) {
        // Fallback to signTransaction with a minimal transaction
        // Create a zero payment transaction to sign (minimal cost)
        const mockTransaction = new Uint8Array([0, 1, 2, 3, 4]) // Simplified for example
        const signedTxns = await traditional.signTransactions([mockTransaction])
        if (!signedTxns?.[0]) {
          throw new Error('Failed to sign message')
        }
        signature = signedTxns[0]
      } else {
        throw new Error('No signing method available')
      }

      // Convert signature to base64
      const base64Signature = Buffer.from(signature).toString('base64')

      return {
        signature: base64Signature,
        message,
      }
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
      signLoginMessage,
    }
  }, [isConnected, algorandAccount, userInfo, traditional, isLoading, login, logout])
}
