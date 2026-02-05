import { useEffect, useMemo, useRef, useState } from 'react'
import { FaGlobe, FaWallet } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { SOCIAL_LOGIN_PROVIDERS, useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { ellipseAddress } from '../utils/ellipseAddress'

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

  const label = isConnected ? `@${githubHandle || 'github'}` : 'Connect Wallet'
  const explorerUrl = activeAddress ? `https://testnet.explorer.perawallet.app/address/${activeAddress}/` : ''

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
    }
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

          if (data.login) {
            setGithubHandle(data.login)
          }
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
      <button className="btn-primary flex items-center gap-2" onClick={() => setIsOpen((v) => !v)} type="button">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
        {githubHandle && activeAddress ? (
          <div className="flex flex-col -gap-1 rounded">
            <p>@{githubHandle}</p>
            <span className="text-xs text-muted">{truncatedAddress}</span>
          </div>
        ) : (
          label
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 border-2 border-black border-b-3 bg-white shadow-lg p-4 space-y-3">
          {isConnected ? (
            <>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-black flex items-center justify-center bg-white overflow-hidden">
                  <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-black">
                    {isFetchingGithub ? 'Searching GitHub…' : `@${githubHandle || 'github'}`}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="flex items-center gap-2 underline hover:no-underline"
                      title={activeAddress ? 'Click to copy address' : 'Algorand address not ready'}
                    >
                      <FaWallet className="h-3 w-3" />
                      <span>{truncatedAddress || 'Algorand address not ready'}</span>
                    </button>
                    {activeAddress && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1"
                        title="Open in explorer"
                      >
                        <FaGlobe className="h-3 w-3" />
                      </a>
                    )}
                    {copied && <span className="text-[10px] text-black">Copied</span>}
                  </div>
                  {activeAddress && <div className="text-[10px] text-muted break-all">{String(activeAddress)}</div>}
                </div>
              </div>

              <Link
                to={`/profile/${encodeURIComponent(activeAddress || '')}`}
                className="btn-secondary w-full text-center inline-flex items-center justify-center gap-2"
              >
                View Profile
              </Link>

              <button className="btn-primary w-full" type="button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-xl font-semibold text-black">For bounty hunters</div>
              <div className="space-y-2">
                {SOCIAL_LOGIN_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    className="btn-secondary w-full flex items-center gap-2 group"
                    onClick={() => connectSocial(provider.id)}
                    type="button"
                    disabled={isLoading}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.350-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.390-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.640 .7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.180.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium transition-colors text-sm">
                      {isLoading ? 'Connecting...' : `Connect ${provider.label}`}
                    </span>
                  </button>
                ))}
              </div>

              {traditionalWallets && traditionalWallets.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-black">
                  <div className="text-xl font-semibold text-black">For supporters</div>
                  {traditionalWallets.map((wallet) => (
                    <button
                      key={wallet.id}
                      className="btn-secondary w-full flex items-center gap-2 group"
                      onClick={() => wallet.connect()}
                      type="button"
                      disabled={isLoading}
                    >
                      <div className="rounded-full overflow-hidden flex items-center justify-center">
                        {wallet.metadata?.icon ? (
                          <img alt={`wallet_icon_${wallet.id}`} src={wallet.metadata.icon} className="w-5 h-5 object-contain" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium transition-colors text-sm">{wallet.metadata?.name || wallet.id}</span>
                    </button>
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
