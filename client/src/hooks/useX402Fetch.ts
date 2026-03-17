import { useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { x402Client } from '@x402-avm/fetch'
import { wrapFetchWithPayment } from '@x402-avm/fetch'
import { registerExactAvmScheme } from '@x402-avm/avm/exact/client'
import type { ClientAvmSigner } from '@x402-avm/avm'
import { useWeb3Auth } from '../contexts/Web3AuthContext'
import algosdk from 'algosdk'

/**
 * Hook that returns a payment-aware `fetch` function.
 *
 * When the server responds with 402 Payment Required, the wrapped fetch
 * automatically signs the Algorand USDC payment transaction using the
 * connected wallet and retries the request with the X-PAYMENT header.
 *
 * Works with both traditional wallets (Pera, Defly) and Web3Auth social login.
 */
export function useX402Fetch(): typeof fetch {
  const { isConnected, algorandAccount } = useWeb3Auth()
  const traditional = useWallet()

  return useMemo(() => {
    // Determine if we have a connected wallet to build a signer from
    const isWeb3AuthActive = isConnected && !!algorandAccount
    const isTraditionalActive = !!traditional.activeAddress

    if (!isWeb3AuthActive && !isTraditionalActive) {
      // No wallet connected – return plain fetch (402 will propagate as error)
      return fetch.bind(globalThis)
    }

    let signer: ClientAvmSigner

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
    } else {
      // Traditional wallet signer (Pera, Defly, etc.) via @txnlab/use-wallet
      signer = {
        address: traditional.activeAddress!,
        signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
          // @txnlab/use-wallet signTransactions expects the same format
          return traditional.signTransactions(txns, indexesToSign)
        },
      }
    }

    // Build x402 client and register AVM scheme
    const client = new x402Client()
    registerExactAvmScheme(client, { signer })

    // Return a fetch wrapped with automatic 402 payment handling
    return wrapFetchWithPayment(fetch, client)
  }, [isConnected, algorandAccount, traditional.activeAddress, traditional.signTransactions])
}
