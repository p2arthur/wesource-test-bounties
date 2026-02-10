import { Link, useParams } from 'react-router-dom'
import WalletInterface from '../components/WalletInterface'
import { ellipseAddress } from '../utils/ellipseAddress'

export default function ProfilePage() {
  const { walletAddress } = useParams<{ walletAddress: string }>()
  const githubHandle = localStorage.getItem('wesource_github_handle') || ''

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-black hover:underline font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 border-2 border-black flex items-center justify-center bg-white overflow-hidden">
              {githubHandle ? (
                <img src={`https://github.com/${githubHandle}.png`} alt={githubHandle} className="h-full w-full object-cover" />
              ) : (
                <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black">@{githubHandle || 'set-github'}</h1>
              <p className="text-sm text-muted">{walletAddress ? ellipseAddress(walletAddress) : 'Wallet not found'}</p>
            </div>
          </div>

          <div className="border-t-2 border-black pt-4 grid sm:grid-cols-3 gap-3">
            <div className="border-2 border-black p-3 text-center">
              <div className="text-2xl font-bold text-black">0</div>
              <div className="text-xs text-muted uppercase">Projects</div>
            </div>
            <div className="border-2 border-black p-3 text-center">
              <div className="text-2xl font-bold text-black">0</div>
              <div className="text-xs text-muted uppercase">Bounties</div>
            </div>
            <div className="border-2 border-black p-3 text-center">
              <div className="text-2xl font-bold text-black">0</div>
              <div className="text-xs text-muted uppercase">Wins</div>
            </div>
          </div>
        </div>
        <div className="card p-6 text-center space-y-2">
          <div className="text-black font-medium">No activity yet</div>
          <p className="text-sm text-muted">Once this wallet creates projects or completes bounties, they’ll show up here.</p>
        </div>
        {/* Wallet Interface */}
        <WalletInterface />{' '}
      </div>
    </div>
  )
}
