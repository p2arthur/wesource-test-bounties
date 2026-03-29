import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { listWonBounties, WonBounty } from '../services/api'
import { formatAlgoAmount } from '../utils/amount'
import LoadingPair from './LoadingPair'

export default function WonBountiesSidebar() {
  const { userInfo, isConnected } = useUnifiedWallet()
  const [wonBounties, setWonBounties] = useState<WonBounty[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract GitHub username from Web3Auth userInfo
  // When using GitHub login, verifierId contains the GitHub username
  const githubUsername =
    typeof userInfo?.name === 'string' ? userInfo.name : typeof userInfo?.verifierId === 'string' ? userInfo.verifierId : null

  useEffect(() => {
    if (!isConnected || !githubUsername) {
      setWonBounties([])
      return
    }

    let isActive = true
    const fetchWonBounties = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await listWonBounties(githubUsername)
        if (isActive) {
          setWonBounties(data)
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to fetch won bounties')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchWonBounties()
    return () => {
      isActive = false
    }
  }, [isConnected, githubUsername])

  // Don't show sidebar if not connected
  if (!isConnected) {
    return null
  }

  // Don't show if no GitHub username available
  if (!githubUsername) {
    return null
  }

  const readyToClaim = wonBounties.filter((b) => b.status === 'READY_FOR_CLAIM')
  const claimed = wonBounties.filter((b) => b.status === 'CLAIMED')
  const totalEarned = claimed.reduce((sum, b) => sum + b.amount, 0)
  const pendingAmount = readyToClaim.reduce((sum, b) => sum + b.amount, 0)

  return (
    <aside className="card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
        <h3 className="text-lg font-bold text-black">Your Bounties</h3>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <LoadingPair size="sm" label="Loading..." />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : wonBounties.length === 0 ? (
        <p className="text-sm text-muted">No bounties won yet. Start contributing to earn rewards!</p>
      ) : (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 border-2 border-green-600 p-3 text-center">
              <p className="text-xl font-bold text-green-700">{totalEarned}</p>
              <p className="text-xs text-green-600">ALGO Earned</p>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-600 p-3 text-center">
              <p className="text-xl font-bold text-yellow-700">{pendingAmount}</p>
              <p className="text-xs text-yellow-600">ALGO Pending</p>
            </div>
          </div>

          {/* Ready to Claim Section */}
          {readyToClaim.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-black flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                Ready to Claim ({readyToClaim.length})
              </h4>
              <ul className="space-y-2">
                {readyToClaim.map((bounty) => (
                  <li key={bounty.id}>
                    <Link
                      to={`/bounty/${bounty.id}`}
                      className="block p-2 border-2 border-yellow-500 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-black truncate">
                          {bounty.repoOwner}/{bounty.repoName} #{bounty.issueNumber}
                        </span>
                        <span className="text-sm font-bold text-yellow-700">{formatAlgoAmount(bounty.amount)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Claimed Section */}
          {claimed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-black flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Claimed ({claimed.length})
              </h4>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {claimed.slice(0, 5).map((bounty) => (
                  <li key={bounty.id}>
                    <Link to={`/bounty/${bounty.id}`} className="block p-2 border border-gray-200 hover:border-gray-400 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted truncate">
                          {bounty.repoOwner}/{bounty.repoName} #{bounty.issueNumber}
                        </span>
                        <span className="text-xs font-medium text-green-600">{formatAlgoAmount(bounty.amount)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
                {claimed.length > 5 && <p className="text-xs text-muted text-center pt-1">+ {claimed.length - 5} more</p>}
              </ul>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
