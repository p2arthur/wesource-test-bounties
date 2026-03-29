import { useEffect, useMemo, useState } from 'react'
import AnimatedNumber from '../components/AnimatedNumber'
import { FiExternalLink, FiArrowLeft, FiCheckCircle, FiZap, FiAlertTriangle } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import LoadingPair from '../components/LoadingPair'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Bounty, Project } from '../interfaces/entities'
import { listBounties, getBountyById, claimBounty, refundBounty } from '../services/api'
import { formatAlgoAmount } from '../utils/amount'
import WalletLinkModal from '../components/WalletLinkModal'
import { useSnackbar } from 'notistack'
import { useAuth } from '../hooks/useAuth'

function getBountyStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline' {
  switch (status) {
    case 'OPEN': return 'warning'
    case 'READY_FOR_CLAIM': return 'info'
    case 'CLAIMED': return 'success'
    default: return 'secondary'
  }
}

export default function BountyPage() {
  const { bountyId } = useParams<{ bountyId: string }>()
  const { isConnected, activeAddress } = useUnifiedWallet()
  const { projects, loading: projectsLoading, error: projectsError } = useProjects()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [showWalletLinkModal, setShowWalletLinkModal] = useState(false)
  const { enqueueSnackbar } = useSnackbar()
  const { jwtToken, handleAuthError, login, isAuthenticated } = useAuth()

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

    // Ensure user is authenticated
    if (!isAuthenticated) {
      await login()
    }

    if (!jwtToken) {
      enqueueSnackbar('Authentication required. Please login first.', { variant: 'error' })
      return
    }

    setIsClaiming(true)
    try {
      const result = await claimBounty(bounty.id, jwtToken)
      enqueueSnackbar(`Bounty claimed! Transaction: ${result.txId}`, { variant: 'success' })
      const updatedBounty = await getBountyById(bounty.id)
      setBounties(prev => prev.map(b => b.id === bounty.id ? updatedBounty : b))
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsClaiming(false)
    }
  }

  const handleRefund = async () => {
    if (!bounty) return

    // Ensure user is authenticated
    if (!isAuthenticated) {
      await login()
    }

    if (!jwtToken) {
      enqueueSnackbar('Authentication required. Please login first.', { variant: 'error' })
      return
    }

    setIsRefunding(true)
    try {
      const result = await refundBounty(bounty.id, jwtToken)
      enqueueSnackbar(`Bounty refunded! Transaction: ${result.txId}`, { variant: 'success' })
      const updatedBounty = await getBountyById(bounty.id)
      setBounties(prev => prev.map(b => b.id === bounty.id ? updatedBounty : b))
    } catch (error) {
      handleAuthError(error)
    } finally {
      setIsRefunding(false)
    }
  }

  const handleWalletLinkSuccess = async () => {
    if (!bounty) return
    const updatedBounty = await getBountyById(bounty.id)
    setBounties(prev => prev.map(b => b.id === bounty.id ? updatedBounty : b))
  }

  if (loading || projectsLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <LoadingPair size="lg" label="Loading bounty..." />
          </Card>
        </div>
      </div>
    )
  }

  if (error || projectsError) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-text-primary">Unable to load bounty</h1>
            <p className="text-text-secondary">{error || projectsError}</p>
            <Button asChild><Link to="/">Go Home</Link></Button>
          </Card>
        </div>
      </div>
    )
  }

  if (!bounty) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-text-primary">Bounty Not Found</h1>
            <p className="text-text-secondary">The bounty you're looking for doesn't exist.</p>
            <Button asChild><Link to="/">Browse Bounties</Link></Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back nav */}
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm">
          <FiArrowLeft className="w-4 h-4" />
          Back to Bounties
        </Link>

        {/* Title */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary">{bounty.repoName}</h1>
          <p className="text-text-secondary text-sm mt-2">
            Issue #{bounty.issueNumber}
            {bounty.issueUrl && (
              <>
                {' · '}
                <a href={bounty.issueUrl} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">
                  View on GitHub
                </a>
              </>
            )}
          </p>
        </div>

        {/* Reward Card */}
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Bounty Reward</p>
                <h2 className="text-5xl font-bold text-accent font-mono">
                  <AnimatedNumber value={bounty.amount} formatValue={formatAlgoAmount} />
                </h2>
              </div>
              <Badge variant={getBountyStatusVariant(bounty.status)} className="text-sm px-3 py-1">
                {bounty.status}
              </Badge>
            </div>

            <div className="border-t border-border-default pt-6">
              <h3 className="text-sm font-semibold text-text-primary mb-3">How to win this bounty</h3>
              <ul className="space-y-2">
                {[
                  'Complete the issue on GitHub',
                  'Create a pull request referencing this issue',
                  'Wait for the bounty to be marked as READY_FOR_CLAIM',
                ].map((step) => (
                  <li key={step} className="flex items-center gap-2 text-sm text-text-secondary">
                    <FiCheckCircle className="text-success flex-shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 justify-center items-center">
            {bounty.issueUrl && (
              <Button variant="secondary" asChild className="flex-1 max-w-xs py-5 text-base">
                <a href={bounty.issueUrl} target="_blank" rel="noreferrer">
                  <FiExternalLink className="w-5 h-5" />
                  View on GitHub
                </a>
              </Button>
            )}

            {(() => {
              const isWinner = activeAddress === bounty.winner?.wallet
              const isCreator = activeAddress === bounty.creatorWallet
              const hasWinnerWallet = !!bounty.winner?.wallet

              if (bounty.status === 'READY_FOR_CLAIM' && isConnected && isWinner && hasWinnerWallet) {
                return (
                  <Button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="flex-1 max-w-xs py-5 text-base"
                  >
                    <FiZap className="w-5 h-5" />
                    Claim Bounty — {formatAlgoAmount(bounty.amount)}
                  </Button>
                )
              } else if (bounty.status === 'READY_FOR_CLAIM' && bounty.winner && !hasWinnerWallet) {
                return (
                  <Button
                    onClick={() => setShowWalletLinkModal(true)}
                    className="flex-1 max-w-xs py-5 text-base"
                  >
                    Link Wallet to Claim {formatAlgoAmount(bounty.amount)}
                  </Button>
                )
              } else if (bounty.status === 'READY_FOR_CLAIM' && bounty.winner?.wallet && !isWinner) {
                return (
                  <div className="flex-1 max-w-xs text-sm text-text-secondary rounded-md border border-border-default p-3 text-center">
                    Awarded to <strong className="text-text-primary">{bounty.winner.username || 'another user'}</strong>
                  </div>
                )
              } else if (bounty.status === 'OPEN') {
                return (
                  <div className="flex-1 max-w-xs text-sm text-text-secondary rounded-md border border-border-default p-3 text-center">
                    Solve this issue on GitHub to win this bounty
                  </div>
                )
              } else if (bounty.status === 'CLAIMED') {
                return (
                  <div className="flex-1 max-w-xs text-sm text-success rounded-md border border-success/30 bg-success/10 p-3 text-center">
                    ✓ This bounty has been claimed
                  </div>
                )
              } else if (bounty.status === 'REFUNDABLE' && isCreator && isConnected) {
                return (
                  <Button
                    onClick={handleRefund}
                    disabled={isRefunding}
                    variant="destructive"
                    className="flex-1 max-w-xs py-5 text-base"
                  >
                    <FiAlertTriangle className="w-5 h-5" />
                    Refund Bounty — {formatAlgoAmount(bounty.amount)}
                  </Button>
                )
              }
              return null
            })()}
          </CardContent>
        </Card>

        {/* Project Info */}
        {project && (
          <Card>
            <CardHeader>
              <CardTitle>About {project.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && <p className="text-text-secondary text-sm">{project.description}</p>}
              {project.techStack && project.techStack.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <Badge key={tech} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              )}
              <Button variant="outline" asChild>
                <Link to={`/project/${project.id}`}>
                  View Project
                  <FiExternalLink className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

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
