import { useEffect } from 'react'
import { SOCIAL_LOGIN_PROVIDERS, useUnifiedWallet } from '../hooks/useUnifiedWallet'
import Modal from './Modal'

interface ConnectWalletModalProps {
  open: boolean
  onClose: () => void
}

export default function ConnectWalletModal({ open, onClose }: ConnectWalletModalProps) {
  const { isConnected, isLoading, connectSocial, traditionalWallets } = useUnifiedWallet()

  useEffect(() => {
    if (isConnected && open) {
      onClose()
    }
  }, [isConnected, open, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Connect Wallet" panelClassName="max-w-md">
      <div className="space-y-3">
        <div className="text-sm font-semibold text-black">Connect with Web3Auth</div>
        <div className="space-y-2">
          {SOCIAL_LOGIN_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              className="btn-secondary w-full flex items-center gap-2"
              onClick={() => connectSocial(provider.id)}
              type="button"
              disabled={isLoading}
            >
              <span className="font-medium text-black group-hover:text-white transition-colors text-sm">
                {isLoading ? 'Connecting...' : `Connect ${provider.label}`}
              </span>
            </button>
          ))}
        </div>

        {traditionalWallets && traditionalWallets.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-black">
            <div className="text-sm font-semibold text-black">Connect Wallet</div>
            {traditionalWallets.map((wallet) => (
              <button
                key={wallet.id}
                className="btn-secondary w-full flex items-center gap-2"
                onClick={() => wallet.connect()}
                type="button"
                disabled={isLoading}
              >
                <span className="font-medium text-black group-hover:text-white transition-colors text-sm">{wallet.metadata?.name || wallet.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
