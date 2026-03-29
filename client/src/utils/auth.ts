export type WalletType = 'web3auth' | 'traditional' | undefined

export async function getAuthHeaders(
  walletType: WalletType,
  activeAddress: string | undefined,
  signMessage?: () => Promise<{ signature: string; message: string }>
): Promise<HeadersInit> {
  // If no wallet or address, return empty headers
  if (!walletType || !activeAddress) {
    return {}
  }

  // For web3auth, cookies are sent automatically
  if (walletType === 'web3auth') {
    return {}
  }

  // For traditional wallet, we need a signature
  if (walletType === 'traditional') {
    if (!signMessage) {
      throw new Error('signMessage function is required for traditional wallet')
    }

    const { signature, message } = await signMessage()
    return {
      'Authorization': `Wallet ${activeAddress}:${signature}:${message}`
    }
  }

  // Default case (should not happen with proper typing)
  return {}
}