import { useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { x402Client } from '@x402-avm/fetch'
import { wrapFetchWithPayment } from '@x402-avm/fetch'
import { registerExactAvmScheme } from '@x402-avm/avm/exact/client'
import type { ClientAvmSigner } from '@x402-avm/avm'
import { useWeb3Auth } from '../contexts/Web3AuthContext'
import algosdk from 'algosdk'

/**
 * Hook that returns a payment-aware `fetch` function with auth headers support.
 *
 * When the server responds with 402 Payment Required, the wrapped fetch
 * automatically signs the Algorand USDC payment transaction using the
 * connected wallet and retries the request with the X-PAYMENT header.
 *
 * Works with both traditional wallets (Pera, Defly) and Web3Auth social login.
 */
export function useX402Fetch(authHeaders?: HeadersInit): typeof fetch {
  const { isConnected, algorandAccount } = useWeb3Auth()
  const traditional = useWallet()

  return useMemo(() => {
    // Determine if we have a connected wallet to build a signer from
    const isWeb3AuthActive = isConnected && !!algorandAccount
    const isTraditionalActive = !!traditional.activeAddress

    let signer: ClientAvmSigner | null = null

    if (isWeb3AuthActive && algorandAccount) {
      // Web3Auth signer – we have the secret key
      const sk = algorandAccount.secretKey
      const secretKey: Uint8Array =
        sk instanceof Uint8Array
          ? sk
          : Array.isArray(sk)
            ? Uint8Array.from(sk)
            : (() => {
                throw new Error('Web3Auth secretKey is not a Uint8Array')
              })()

      signer = {
        address: algorandAccount.address,
        signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
          return txns.map((txn, i) => {
            if (indexesToSign && !indexesToSign.includes(i)) return null
            const decoded = algosdk.decodeUnsignedTransaction(txn)
            const signed = algosdk.signTransaction(decoded, secretKey)
            return signed.blob
          })
        },
      }
    } else if (isTraditionalActive && traditional.activeAddress) {
      // Traditional wallet signer (Pera, Defly, etc.) via @txnlab/use-wallet
      signer = {
        address: traditional.activeAddress,
        signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
          // @txnlab/use-wallet signTransactions expects the same format
          return traditional.signTransactions(txns, indexesToSign)
        },
      }
    }

    // Build x402 client and register AVM scheme if we have a signer
    const client = signer ? new x402Client() : null
    if (client && signer) {
      registerExactAvmScheme(client, { signer })
    }

    // Return a fetch function that merges auth headers with request
    return (input: RequestInfo | URL, init?: RequestInit) => {
      const mergedInit = {
        ...init,
        headers: {
          ...authHeaders,
          ...init?.headers,
        },
        credentials: isWeb3AuthActive ? ('include' as const) : ('omit' as const),
      }

      // If we have a signer, wrap with x402 payment handling
      if (client) {
        return wrapFetchWithPayment(fetch, client)(input, mergedInit)
      }

      // No signer – return plain fetch with auth headers
      return fetch(input, mergedInit)
    }
  }, [isConnected, algorandAccount, traditional.activeAddress, traditional.signTransactions, authHeaders])
}
