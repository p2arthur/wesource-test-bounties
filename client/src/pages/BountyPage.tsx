import { useEffect, useMemo, useState } from 'react'
import AnimatedNumber from '../components/AnimatedNumber'
import { FaCoins, FaCheckCircle, FaGithub, FaChevronRight } from 'react-icons/fa'
import { Link, useParams } from 'react-router-dom'
import LoadingPair from '../components/LoadingPair'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Bounty, Project } from '../interfaces/entities'
import { listBounties, getBountyById, claimBounty } from '../services/api'
import { formatAlgoAmount } from '../utils/amount'
import WalletLinkModal from '../components/WalletLinkModal'
import { useSnackbar } from 'notistack'
import { useAuth } from '../hooks/useAuth'

export default function BountyPage() {
  const { bountyId } = useParams<{ bountyId: string }>()
  const { isConnected, activeAddress } = useUnifiedWallet()
  const { projects, loading: projectsLoading, error: projectsError } = useProjects()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [showWalletLinkModal, setShowWalletLinkModal] = useState(false)
  const { enqueueSnackbar } = useSnackbar()
  const { getAuth, handleAuthError } = useAuth()

  useEffect(() => {
    let isActive = true
    const loadBounties = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await listBounties()
        if (isActive) {
          setBounties(data)
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to fetch bounties')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }
    loadBounties()
    return () => {
      isActive = false
    }
  }, [])

  const parseGithubRepoInfo = (repoUrl: string) => {
    try {
      const url = new URL(repoUrl)
      const [owner, rawName] = url.pathname.replace(/^\/+/, '').split('/')
      const name = rawName?.replace(/\.git$/, '')
      if (!owner || !name) return null
      return { owner, name }
    } catch {
      return null
    }
  }

  const projectRepoMap = useMemo(() => {
    const map = new Map<string, Project>()
    projects.forEach((project) => {
      project.repositories?.forEach((repo) => {
        const info = parseGithubRepoInfo(repo.githubUrl)
        if (!info) return
        const key = `${info.owner.toLowerCase()}/${info.name.toLowerCase()}`
        map.set(key, project)
      })
    })
    return map
  }, [projects])

  const bounty = useMemo(() => {
    if (!bountyId) return null
    return bounties.find((b) => b.id === Number(bountyId)) || null
  }, [bounties, bountyId])

  const project = useMemo(() => {
    if (!bounty) return null
    const key = `${bounty.repoOwner.toLowerCase()}/${bounty.repoName.toLowerCase()}`
    return projectRepoMap.get(key) || null
  }, [bounty, projectRepoMap])

  const handleClaim = async () => {
    if (!bounty) return

    setIsClaiming(true)
    try {
      const headers = await getAuth()
      const result = await claimBounty(bounty.id, headers)
      enqueueSnackbar(`Bounty claimed! Transaction: ${result.txId}`, { variant: 'success' })

      // Refresh bounty data
      const updatedBounty = await getBountyById(bounty.id)
      setBounties(prev => prev.map(b => b.id === bounty.id ? updatedBounty : b))
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsClaiming(false)
    }
  }

  const handleLinkWallet = () => {
    setShowWalletLinkModal(true)
  }

  const handleWalletLinkSuccess = async () => {
    if (!bounty) return

    // Refresh bounty data after linking
    const updatedBounty = await getBountyById(bounty.id)
    setBounties(prev => prev.map(b => b.id === bounty.id ? updatedBounty : b))
  }

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center">
            <LoadingPair size="lg" label="Loading bounty..." />
          </div>
        </div>
      </div>
    )
  }

  if (error || projectsError) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-black">Unable to load bounty</h1>
            <p className="text-muted">{error || projectsError}</p>
            <Link to="/" className="btn-primary inline-block">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!bounty) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-black">Bounty Not Found</h1>
            <p className="text-muted">The bounty you're looking for doesn't exist.</p>
            <Link to="/" className="btn-primary inline-block">
              Browse Bounties
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="text-muted hover:text-black inline-flex items-center gap-2 mb-4">
            <FaChevronRight className="rotate-180 w-4 h-4" />
            Back to Bounties
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-black">{bounty.repoName}</h1>
          <p className="text-muted text-lg mt-2">
            Issue #{bounty.issueNumber}: {bounty.issueUrl ? <a href={bounty.issueUrl} target="_blank" rel="noreferrer" className="underline hover:no-underline">{bounty.issueUrl}</a> : 'Link not available'}
          </p>
        </div>

        {/* Bounty Card */}
        <div className="card p-8 space-y-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted">
                <FaCoins className="w-5 h-5" />
                <span>Bounty Reward</span>
              </div>
              <h2 className="text-4xl font-bold text-black mt-2">
                {formatAlgoAmount(bounty.amount)}
              </h2>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-full">
              <div className={`w-3 h-3 rounded-full ${bounty.status === 'OPEN' ? 'bg-yellow-500' : bounty.status === 'READY_FOR_CLAIM' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
              <span className="font-medium text-black">{bounty.status}</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-black mb-4">How to win this bounty</h3>
            <ul className="space-y-2 text-muted">
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                Complete the issue on GitHub
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                Create a pull request referencing this issue
              </li>
              <li className="flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                Wait for the bounty to be marked as READY_FOR_CLAIM
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="card p-8 space-y-4">
          <h2 className="text-lg font-bold text-black mb-2">Actions</h2>
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 justify-center items-center">
            {bounty.issueUrl && (
              <a
                href={bounty.issueUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[180px] btn-secondary flex items-center justify-center gap-3 py-4 text-lg font-semibold shadow-lg border-2 border-black hover:bg-gray-100 transition-all"
                style={{ maxWidth: 320 }}
              >
                <FaGithub className="w-6 h-6" />
                <span>View on GitHub</span>
              </a>
            )}

            {/* Claim Button Logic */}
            {(() => {
              const isWinner = activeAddress === bounty.winner?.wallet
              const hasWinnerWallet = !!bounty.winner?.wallet

              if (bounty.status === 'READY_FOR_CLAIM' && isConnected && isWinner && hasWinnerWallet) {
                return (
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="flex-1 min-w-[180px] btn-primary flex items-center justify-center gap-3 py-4 text-lg font-semibold shadow-lg border-2 border-black hover:bg-green-100 transition-all"
                    style={{ maxWidth: 320 }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Claim Bounty — {formatAlgoAmount(bounty.amount)}</span>
                    {isClaiming && <span className="animate-spin ml-2">⏳</span>}
                  </button>
                )
              } else if (bounty.status === 'READY_FOR_CLAIM' && bounty.winner && !hasWinnerWallet) {
                return (
                  <button
                    onClick={handleLinkWallet}
                    className="flex-1 min-w-[180px] btn-primary flex items-center justify-center gap-3 py-4 text-lg font-semibold shadow-lg border-2 border-black hover:bg-blue-100 transition-all"
                    style={{ maxWidth: 320 }}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>Link Wallet to Claim {formatAlgoAmount(bounty.amount)}</span>
                  </button>
                )
              } else if (bounty.status === 'READY_FOR_CLAIM' && bounty.winner?.wallet && !isWinner) {
                return (
                  <div className="flex-1 min-w-[180px] text-sm text-gray-600 border-2 border-black p-3 text-center" style={{ maxWidth: 320 }}>
                    This bounty has been awarded to <strong>{bounty.winner.username || 'another user'}</strong>
                  </div>
                )
              } else if (bounty.status === 'OPEN') {
                return (
                  <div className="flex-1 min-w-[180px] text-sm text-gray-600 border-2 border-black p-3 text-center" style={{ maxWidth: 320 }}>
                    Solve this issue on GitHub to win this bounty
                  </div>
                )
              } else if (bounty.status === 'CLAIMED') {
                return (
                  <div className="flex-1 min-w-[180px] text-sm text-green-600 border-2 border-green-600 p-3 text-center" style={{ maxWidth: 320 }}>
                    ✓ This bounty has been claimed
                  </div>
                )
              }
              return null
            })()}
          </div>
        </div>

        {/* Project Info */}
        {project && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-bold text-black">About {project.name}</h2>
            {project.description && <p className="text-black">{project.description}</p>}
            {project.techStack && project.techStack.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span key={tech} className="px-2 py-1 border-2 border-black text-xs font-medium text-black">
                    {tech}
                  </span>
                ))}
              </div>
            )}
            <Link to={`/project/${project.id}`} className="btn-secondary inline-flex items-center gap-2">
              View Project
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Wallet Link Modal */}
        {showWalletLinkModal && (
          <WalletLinkModal
            isOpen={showWalletLinkModal}
            onClose={() => setShowWalletLinkModal(false)}
            onSuccess={handleWalletLinkSuccess}
            bountyId={bounty.id}
          />
        )}
      </div>
    </div>
  )
}