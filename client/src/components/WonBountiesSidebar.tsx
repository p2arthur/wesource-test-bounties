import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiAward } from 'react-icons/fi'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { listWonBounties, WonBounty } from '../services/api'
import { formatAlgoAmount } from '../utils/amount'
import LoadingPair from './LoadingPair'

export default function WonBountiesSidebar() {
  const { userInfo, isConnected } = useUnifiedWallet()
  const [wonBounties, setWonBounties] = useState<WonBounty[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        if (isActive) setWonBounties(data)
      } catch (err) {
        if (isActive) setError(err instanceof Error ? err.message : 'Failed to fetch won bounties')
      } finally {
        if (isActive) setLoading(false)
      }
    }

    fetchWonBounties()
    return () => { isActive = false }
  }, [isConnected, githubUsername])

  if (!isConnected || !githubUsername) return null

  const readyToClaim = wonBounties.filter((b) => b.status === 'READY_FOR_CLAIM')
  const claimed = wonBounties.filter((b) => b.status === 'CLAIMED')
  const totalEarned = claimed.reduce((sum, b) => sum + b.amount, 0)
  const pendingAmount = readyToClaim.reduce((sum, b) => sum + b.amount, 0)

  return (
    <aside className="rounded-lg border border-border-default bg-bg-surface p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FiAward className="w-5 h-5 text-accent" />
        <h3 className="text-base font-semibold text-text-primary">Your Bounties</h3>
      </div>

      {loading ? (
        <div className="py-4 text-center">
          <LoadingPair size="sm" label="Loading..." />
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : wonBounties.length === 0 ? (
        <p className="text-sm text-text-secondary">No bounties won yet. Start contributing to earn rewards!</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-center">
              <p className="text-lg font-bold text-success font-mono">{formatAlgoAmount(totalEarned)}</p>
              <p className="text-xs text-success/70 mt-0.5">Earned</p>
            </div>
            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-center">
              <p className="text-lg font-bold text-warning font-mono">{formatAlgoAmount(pendingAmount)}</p>
              <p className="text-xs text-warning/70 mt-0.5">Pending</p>
            </div>
          </div>

          {/* Ready to Claim */}
          {readyToClaim.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
                Ready to Claim ({readyToClaim.length})
              </h4>
              <ul className="space-y-1.5">
                {readyToClaim.map((bounty) => (
                  <li key={bounty.id}>
                    <Link
                      to={`/bounty/${bounty.id}`}
                      className="flex items-center justify-between p-2 rounded-md border border-warning/40 bg-warning/10 hover:border-warning/70 transition-colors"
                    >
                      <span className="text-xs text-text-primary truncate">
                        {bounty.repoOwner}/{bounty.repoName} #{bounty.issueNumber}
                      </span>
                      <span className="text-xs font-bold text-warning ml-2 flex-shrink-0">{formatAlgoAmount(bounty.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Claimed */}
          {claimed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full" />
                Claimed ({claimed.length})
              </h4>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {claimed.slice(0, 5).map((bounty) => (
                  <li key={bounty.id}>
                    <Link
                      to={`/bounty/${bounty.id}`}
                      className="flex items-center justify-between p-2 rounded-md border border-border-default hover:border-success/40 transition-colors"
                    >
                      <span className="text-xs text-text-secondary truncate">
                        {bounty.repoOwner}/{bounty.repoName} #{bounty.issueNumber}
                      </span>
                      <span className="text-xs font-medium text-success ml-2 flex-shrink-0">{formatAlgoAmount(bounty.amount)}</span>
                    </Link>
                  </li>
                ))}
                {claimed.length > 5 && (
                  <p className="text-xs text-text-muted text-center pt-1">+ {claimed.length - 5} more</p>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
