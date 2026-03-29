import { useEffect, useMemo, useRef, useState } from 'react'
import { FiGlobe, FiCreditCard, FiLogOut, FiUser, FiCopy, FiCheck } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { SOCIAL_LOGIN_PROVIDERS, useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { ellipseAddress } from '../utils/ellipseAddress'
import { Button } from './ui/button'

const GitHubIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
)

export default function WalletMenu() {
  const { activeAddress, isConnected, isLoading, connectSocial, disconnect, userInfo, traditionalWallets } = useUnifiedWallet()
  const [isOpen, setIsOpen] = useState(false)
  const [githubHandle, setGithubHandle] = useState<string>('')
  const [isFetchingGithub, setIsFetchingGithub] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const truncatedAddress = useMemo(() => {
    return typeof activeAddress === 'string' && activeAddress.length > 0 ? ellipseAddress(activeAddress) : ''
  }, [activeAddress])

  const explorerUrl = activeAddress ? `https://testnet.explorer.perawallet.app/address/${activeAddress}/` : ''

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleLogout = async () => {
    await disconnect()
    setIsOpen(false)
  }

  useEffect(() => {
    const fetchGithubUsername = async () => {
      if (isConnected && userInfo?.verifierId) {
        setIsFetchingGithub(true)
        try {
          const githubNumericId = userInfo.verifierId.split('|')[1]
          const response = await fetch(`https://api.github.com/user/${githubNumericId}`)
          const data = await response.json()
          if (data.login) setGithubHandle(data.login)
        } catch (error) {
          console.error('Error fetching GitHub username:', error)
        } finally {
          setIsFetchingGithub(false)
        }
      }
    }
    fetchGithubUsername()
  }, [isConnected, userInfo])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  const handleCopyAddress = async () => {
    if (!activeAddress) return
    try {
      await navigator.clipboard.writeText(String(activeAddress))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="relative flex items-center gap-4" ref={menuRef}>
      <Button
        variant={isConnected ? 'secondary' : 'default'}
        className="gap-2"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <FiCreditCard className="w-4 h-4" />
        {isConnected && githubHandle ? (
          <div className="flex flex-col items-start leading-none gap-0.5">
            <span>@{githubHandle}</span>
            <span className="text-[10px] text-text-muted font-normal">{truncatedAddress}</span>
          </div>
        ) : isConnected ? (
          truncatedAddress || 'Connected'
        ) : (
          'Connect Wallet'
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-lg border border-border-default bg-bg-elevated shadow-lg p-4 space-y-3">
          {isConnected ? (
            <>
              {/* Connected User Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-border-default">
                <div className="h-9 w-9 rounded-full border border-border-default bg-bg-hover flex items-center justify-center flex-shrink-0">
                  <GitHubIcon />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {isFetchingGithub ? 'Fetching…' : `@${githubHandle || 'github'}`}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="flex items-center gap-1 hover:text-text-primary transition-colors"
                      title="Click to copy address"
                    >
                      {copied ? <FiCheck className="h-3 w-3 text-success" /> : <FiCopy className="h-3 w-3" />}
                      <span className="font-mono">{truncatedAddress || 'No address'}</span>
                    </button>
                    {activeAddress && (
                      <a href={explorerUrl} target="_blank" rel="noreferrer" title="Open in explorer" className="hover:text-accent transition-colors">
                        <FiGlobe className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <Button variant="secondary" className="w-full justify-start gap-2" asChild>
                <Link to={`/profile/${encodeURIComponent(activeAddress || '')}`} onClick={() => setIsOpen(false)}>
                  <FiUser className="w-4 h-4" />
                  View Profile
                </Link>
              </Button>

              <Button variant="ghost" className="w-full justify-start gap-2 text-danger hover:text-danger hover:bg-danger/10" onClick={handleLogout}>
                <FiLogOut className="w-4 h-4" />
                Log out
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">For bounty hunters</p>
                {SOCIAL_LOGIN_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.id}
                    variant="secondary"
                    className="w-full justify-start gap-2"
                    onClick={() => connectSocial(provider.id)}
                    disabled={isLoading}
                  >
                    <GitHubIcon />
                    {isLoading ? 'Connecting...' : `Connect ${provider.label}`}
                  </Button>
                ))}
              </div>

              {traditionalWallets && traditionalWallets.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border-default">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">For supporters</p>
                  {traditionalWallets.map((wallet) => (
                    <Button
                      key={wallet.id}
                      variant="secondary"
                      className="w-full justify-start gap-2"
                      onClick={() => wallet.connect()}
                      disabled={isLoading}
                    >
                      {wallet.metadata?.icon ? (
                        <img alt={`wallet_icon_${wallet.id}`} src={wallet.metadata.icon} className="w-4 h-4 object-contain" />
                      ) : (
                        <FiCreditCard className="w-4 h-4" />
                      )}
                      {wallet.metadata?.name || wallet.id}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
