import { useEffect } from 'react'
import { SOCIAL_LOGIN_PROVIDERS, useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Button } from './ui/button'
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
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Social Login</p>
          {SOCIAL_LOGIN_PROVIDERS.map((provider) => (
            <Button
              key={provider.id}
              variant="secondary"
              className="w-full justify-start"
              onClick={() => connectSocial(provider.id)}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : `Connect with ${provider.label}`}
            </Button>
          ))}
        </div>

        {traditionalWallets && traditionalWallets.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border-default">
            <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Wallet Apps</p>
            {traditionalWallets.map((wallet) => (
              <Button
                key={wallet.id}
                variant="secondary"
                className="w-full justify-start"
                onClick={() => wallet.connect()}
                disabled={isLoading}
              >
                {wallet.metadata?.name || wallet.id}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
