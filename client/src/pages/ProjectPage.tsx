import { useEffect, useState } from 'react'
import AnimatedNumber from '../components/AnimatedNumber'
import { FiArrowLeft, FiExternalLink, FiGitBranch, FiStar, FiUsers, FiPlus } from 'react-icons/fi'
import { Link, useParams } from 'react-router-dom'
import ConnectWalletModal from '../components/ConnectWalletModal'
import CreateBountyModal from '../components/CreateBountyModal'
import LoadingPair from '../components/LoadingPair'
import VoteWidget from '../components/VoteWidget'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { useX402Fetch } from '../hooks/useX402Fetch'
import { Issue, Project } from '../interfaces/entities'
import { Bounty, checkBountyExists, createBounty, listBounties, preflightBountyCreation } from '../services/api'
import { X402PaymentRequirements } from '../services/api'
import { createBountyOnChain } from '../services/bountyContract'
import { formatAlgoAmount } from '../utils/amount'

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { getProjectById } = useProjects()
  const x402Fetch = useX402Fetch()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [selectedRepoOwner, setSelectedRepoOwner] = useState<string>('')
  const [selectedRepoName, setSelectedRepoName] = useState<string>('')
  const [isBountyModalOpen, setIsBountyModalOpen] = useState(false)
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const [bounties, setBounties] = useState<Bounty[]>([])
  const { isConnected, activeAddress, signer } = useUnifiedWallet()

  const getIssueBounty = (repoUrl: string, issueNumber: number): Bounty | undefined => {
    const repoInfo = parseGithubRepoInfo(repoUrl)
    if (!repoInfo) return undefined
    const issueUrl = `https://github.com/${repoInfo.owner}/${repoInfo.name}/issues/${issueNumber}`
    return bounties.find((b) => b.issueUrl === issueUrl)
  }

  const parseGithubRepoInfo = (repoUrl: string) => {
    try {
      const url = new URL(repoUrl)
      const [owner, rawName] = url.pathname.replace(/^\/+/, '').split('/')
      const name = rawName?.replace(/\.git$/, '')
      if (!owner || !name) {
        return null
      }
      return { owner, name }
    } catch {
      return null
    }
  }

  const openBountyModal = (issue: Issue, repoUrl: string) => {
    if (!isConnected) {
      setIsConnectModalOpen(true)
      return
    }
    const repoInfo = parseGithubRepoInfo(repoUrl)
    if (!repoInfo) {
      console.error('Unable to parse GitHub repository info for bounty creation.')
      return
    }
    setSelectedIssue(issue)
    setSelectedRepoOwner(repoInfo.owner)
    setSelectedRepoName(repoInfo.name)
    setIsBountyModalOpen(true)
  }

  const closeBountyModal = () => {
    setIsBountyModalOpen(false)
    setSelectedIssue(null)
    setSelectedRepoOwner('')
    setSelectedRepoName('')
  }

  /**
   * Phase 1: Create bounty on-chain + preflight the server to get x402 payment requirements.
   * Returns the requirements so the modal can display them for user confirmation.
   * Returns null when x402 middleware is disabled (bounty already created).
   */
  const handleInitBounty = async (
    issueNumber: number,
    amount: number,
    creatorWallet: string,
    repoOwner: string,
    repoName: string,
  ): Promise<X402PaymentRequirements | null> => {
    if (!repoOwner || !repoName) {
      throw new Error('Missing repository info for bounty creation.')
    }

    if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
      throw new Error('Issue number must be a positive integer.')
    }
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0.')
    }
    if (!creatorWallet.trim()) {
      throw new Error('Creator wallet is required.')
    }
    if (!signer) {
      throw new Error('Wallet signer not available. Please reconnect your wallet.')
    }
    if (!activeAddress) {
      throw new Error('No active wallet address. Please connect your wallet.')
    }

    // Step 0: Check if bounty already exists for this issue
    const existingBounty = await checkBountyExists(repoOwner, repoName, issueNumber)
    if (existingBounty) {
      throw new Error(`A bounty already exists for issue #${issueNumber}. Check the bounties list.`)
    }

    // Step 1: Create bounty on-chain first
    console.log('Creating bounty on-chain...', { repoOwner, repoName, issueNumber, amount })
    const onChainResult = await createBountyOnChain({
      repoOwner,
      repoName,
      issueNumber: Math.trunc(issueNumber),
      amountAlgo: amount,
      senderAddress: activeAddress,
      signer,
    })
    console.log('On-chain bounty created:', onChainResult)

    // Step 2: Preflight the server to get x402 payment requirements
    const payload = {
      repoOwner,
      repoName,
      issueNumber: Math.trunc(issueNumber),
      amount,
      creatorWallet: creatorWallet.trim(),
    }

    const { requirements, alreadyCreated } = await preflightBountyCreation(payload)

    if (alreadyCreated) {
      console.log('Bounty registered with server (no x402):', alreadyCreated)
      localStorage.setItem(`bountyKey:${alreadyCreated.id}`, alreadyCreated.bountyKey)
      listBounties().then(setBounties).catch(console.error)
      return null
    }

    console.log('x402 payment requirements:', requirements)
    return requirements
  }

  /**
   * Phase 2: Sign the x402 USDC payment and complete server registration.
   * Called after the user reviews and confirms the x402 payment requirements.
   */
  const handleConfirmX402Payment = async (
    issueNumber: number,
    amount: number,
    creatorWallet: string,
    repoOwner: string,
    repoName: string,
  ): Promise<void> => {
    const created = await createBounty(
      {
        repoOwner,
        repoName,
        issueNumber: Math.trunc(issueNumber),
        amount,
        creatorWallet: creatorWallet.trim(),
      },
      x402Fetch,
    )

    console.log('Bounty registered with server:', created)
    localStorage.setItem(`bountyKey:${created.id}`, created.bountyKey)

    listBounties().then(setBounties).catch(console.error)
  }

  useEffect(() => {
    async function loadProject() {
      if (!projectId) return
      setLoading(true)
      setError(null)
      try {
        const data = await getProjectById(Number(projectId))
        console.log('Fetched project data:', data)
        setProject(data)
        if (!data) {
          setError('Project not found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    loadProject()
  }, [projectId, getProjectById])

  useEffect(() => {
    listBounties().then(setBounties).catch(console.error)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <LoadingPair size="lg" label="Loading project..." />
          </Card>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-text-primary">Project Not Found</h1>
            <p className="text-text-secondary">{error || "The project you're looking for doesn't exist."}</p>
            <Button asChild><Link to="/">Back to Home</Link></Button>
          </Card>
        </div>
      </div>
    )
  }

  const totalStars = project.repositories.reduce((acc, repo) => acc + repo.stars, 0)
  const allContributors = project.repositories.flatMap((repo) => repo.contributors || [])
  const totalBountyValue = bounties
    .filter((b) => {
      if (b.status !== 'OPEN') return false
      return project.repositories.some((repo) => {
        try {
          const url = new URL(repo.githubUrl)
          const [owner, name] = url.pathname.replace(/^\/+/, '').split('/')
          return (
            owner &&
            name &&
            owner.toLowerCase() === b.repoOwner.toLowerCase() &&
            name.replace(/\.git$/, '').toLowerCase() === b.repoName.toLowerCase()
          )
        } catch {
          return false
        }
      })
    })
    .reduce((sum, b) => sum + (b.amount || 0), 0)

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto space-y-8">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm">
          <FiArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>

        {/* Project Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 rounded-lg border border-border-default overflow-hidden">
          {/* Main Card */}
          <div className="md:col-span-2 p-8 bg-bg-surface flex flex-col gap-6 justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                {project.category && (
                  <Badge variant="default">{project.category}</Badge>
                )}
                <h1 className="text-3xl font-bold text-text-primary">{project.name}</h1>
              </div>
              <VoteWidget voteKey={`project:${project.id}`} size="md" />
            </div>
            <p className="text-text-secondary leading-relaxed">
              {project.description || 'No description available'}
            </p>
            {/* Repo Links */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-border-default">
              {project.repositories.map((repo) => (
                <a
                  key={repo.id}
                  href={repo.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  {repo.name}
                  <span className="text-text-muted">⭐ {(repo.stars ?? 0).toLocaleString()}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Bounty Value Panel */}
          <div className="p-8 flex flex-col items-center justify-center bg-bg-elevated border-l border-border-default">
            <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Total Bounty Value</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-accent font-mono">
                <AnimatedNumber value={totalBountyValue} decimals={2} />
              </span>
              <span className="text-xl font-bold text-text-secondary">ALGO</span>
            </div>
            <p className="text-xs text-text-muted mt-2">across all open bounties</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <FiGitBranch className="text-info" />, value: project.repositories.length, label: 'Repositories' },
            { icon: <FiStar className="text-warning" />, value: totalStars, label: 'Total Stars' },
            { icon: <FiUsers className="text-success" />, value: allContributors.length, label: 'Contributors' },
          ].map(({ icon, value, label }) => (
            <Card key={label} className="p-4 text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">{icon}</span>
                <AnimatedNumber value={value} className="text-3xl font-bold text-text-primary" />
                <div className="text-sm text-text-secondary">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Repositories */}
        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.repositories.map((repo) => (
              <div key={repo.id} className="rounded-md border border-border-default p-4 space-y-3 bg-bg-elevated">
                <div className="flex items-center justify-between">
                  <a
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-text-primary hover:text-accent transition-colors flex items-center gap-1.5"
                  >
                    {repo.name}
                    <FiExternalLink className="w-3.5 h-3.5 text-text-muted" />
                  </a>
                  <span className="flex items-center gap-1 text-text-secondary text-sm">
                    <FiStar className="w-3.5 h-3.5 text-warning" />
                    {(repo.stars ?? 0).toLocaleString()}
                  </span>
                </div>
                {repo.description && <p className="text-sm text-text-secondary">{repo.description}</p>}
                {repo.contributors && repo.contributors.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {repo.contributors.slice(0, 5).map((contributor, idx) => (
                      <a
                        key={`${contributor.githubHandle}-${idx}`}
                        href={`https://github.com/${contributor.githubHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border-default bg-bg-hover hover:border-accent/50 transition-colors"
                      >
                        {contributor.avatarUrl && (
                          <img src={contributor.avatarUrl} alt={contributor.githubHandle} className="h-5 w-5 rounded-full object-cover" />
                        )}
                        <span className="text-xs text-text-secondary">@{contributor.githubHandle}</span>
                      </a>
                    ))}
                    {repo.contributors.length > 5 && (
                      <span className="text-xs text-text-muted px-2 py-1">+{repo.contributors.length - 5} more</span>
                    )}
                  </div>
                )}

                {/* Issues */}
                {repo.issues && repo.issues.length > 0 && (
                  <div className="pt-3 border-t border-border-default">
                    <h4 className="text-sm font-semibold text-text-primary mb-2">
                      Open Issues ({repo.issues.filter((i) => i.state === 'open').length})
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {repo.issues
                        .filter((i) => i.state === 'open')
                        .map((issue) => (
                          <div key={issue.id} className="w-full p-3 rounded-md border border-border-default bg-bg-base">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-success" />
                                  <span className="text-xs text-text-muted">#{issue.number}</span>
                                </div>
                                <a
                                  href={issue.htmlUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-text-primary hover:text-accent transition-colors truncate block"
                                >
                                  {issue.title}
                                </a>
                              </div>
                              {(() => {
                                const existingBounty = getIssueBounty(repo.githubUrl, issue.number)
                                if (existingBounty) {
                                  return (
                                    <Badge variant="warning" className="flex-shrink-0">
                                      {formatAlgoAmount(existingBounty.amount)}
                                    </Badge>
                                  )
                                }
                                return (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs flex-shrink-0 gap-1"
                                    onClick={() => openBountyModal(issue, repo.githubUrl)}
                                  >
                                    <FiPlus className="w-3 h-3" />
                                    {isConnected ? 'Bounty' : 'Connect'}
                                  </Button>
                                )
                              })()}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* All Contributors */}
        {allContributors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {allContributors.map((contributor, idx) => (
                  <a
                    key={`${contributor.githubHandle}-${idx}`}
                    href={`https://github.com/${contributor.githubHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-md border border-border-default bg-bg-elevated hover:border-accent/50 hover:bg-bg-hover transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      {contributor.avatarUrl && (
                        <AvatarImage src={contributor.avatarUrl} alt={contributor.githubHandle} />
                      )}
                      <AvatarFallback className="text-xs">{contributor.githubHandle[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-text-primary text-sm hover:text-accent transition-colors">
                      @{contributor.githubHandle}
                    </span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isBountyModalOpen && (
        <CreateBountyModal
          issue={selectedIssue}
          repoOwner={selectedRepoOwner}
          repoName={selectedRepoName}
          projectName={project.name}
          onClose={closeBountyModal}
          onInitBounty={handleInitBounty}
          onConfirmPayment={handleConfirmX402Payment}
        />
      )}

      <ConnectWalletModal open={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} />
    </div>
  )
}
