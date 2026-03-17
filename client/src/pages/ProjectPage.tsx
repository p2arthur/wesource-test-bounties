import { useEffect, useState } from 'react'
import AnimatedNumber from '../components/AnimatedNumber'
import { FaUsers, FaStar, FaCodeBranch, FaCoins } from 'react-icons/fa'
import { Link, useParams } from 'react-router-dom'
import ConnectWalletModal from '../components/ConnectWalletModal'
import CreateBountyModal from '../components/CreateBountyModal'
import LoadingPair from '../components/LoadingPair'
import VoteWidget from '../components/VoteWidget'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { useX402Fetch } from '../hooks/useX402Fetch'
import { Issue, Project } from '../interfaces/entities'
import { Bounty, checkBountyExists, createBounty, listBounties, preflightBountyCreation } from '../services/api'
import { X402PaymentRequirements } from '../services/api'
import { createBountyOnChain } from '../services/bountyContract'

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
      // x402 middleware was not enabled — bounty already registered
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

    // Refresh bounties list to update UI
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
          <div className="card p-8 text-center">
            <LoadingPair size="lg" label="Loading project..." />
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen p-4 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-black">Project Not Found</h1>
            <p className="text-muted">{error || "The project you're looking for doesn't exist."}</p>
            <Link to="/" className="btn-primary inline-block">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Calculate totals
  const totalStars = project.repositories.reduce((acc, repo) => acc + repo.stars, 0)
  const allContributors = project.repositories.flatMap((repo) => repo.contributors || [])
  // Calculate total bounty value for this project (all repos, only OPEN bounties)
  const totalBountyValue = bounties
    .filter((b) => {
      if (b.status !== 'OPEN') return false
      return project.repositories.some((repo) => {
        // Parse owner from repo.githubUrl
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
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-black hover:underline font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Projects
        </Link>

        {/* Project Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-2 rounded-lg border-black border-b-4">
          {/* Project Main Card */}
          <div className="md:col-span-2 p-8 flex flex-col gap-6 justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                {project.category && <span className="badge">{project.category}</span>}
                <h1 className="text-3xl font-bold text-black">{project.name}</h1>
              </div>
              <VoteWidget voteKey={`project:${project.id}`} size="md" />
            </div>
            <p className="text-black leading-relaxed">{project.description || 'No description available'}</p>
            {/* Repository Links */}
            <div className="flex flex-wrap gap-4 pt-4 border-t-2 border-black">
              {project.repositories.map((repo) => (
                <a
                  key={repo.id}
                  href={repo.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-black underline hover:no-underline"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {repo.name}
                  <span className="text-muted">⭐ {(repo.stars ?? 0).toLocaleString()}</span>
                </a>
              ))}
            </div>
          </div>
          {/* Bounty Value Card */}
          <div className="p-8 flex flex-col items-center justify-center bg-yellow-500 border-2 border-yellow-500">
            <div className="text-lg font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              <FaCoins className="text-2xl text-yellow-700" />
              Total Bounty Value
            </div>
            <div className="flex items-center gap-2 text-5xl font-extrabold text-white mb-1">
              <AnimatedNumber value={totalBountyValue} decimals={2} className="" />
              <span className="text-2xl font-bold">ALGO</span>
            </div>
            <div className="text-sm text-yellow-700">across all open bounties</div>
          </div>
        </div>
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <div className="flex flex-col items-center">
              <FaCodeBranch className="text-2xl text-blue-600 mb-1" />
              <AnimatedNumber value={project.repositories.length} className="text-3xl font-bold text-black" />
            </div>
            <div className="text-sm text-muted">Repositories</div>
          </div>
          <div className="card p-4 text-center">
            <div className="flex flex-col items-center">
              <FaStar className="text-2xl text-yellow-300 mb-1" />
              <AnimatedNumber value={totalStars} className="text-3xl font-bold text-black" />
            </div>
            <div className="text-sm text-muted">Total Stars</div>
          </div>
          <div className="card p-4 text-center">
            <div className="flex flex-col items-center">
              <FaUsers className="text-2xl text-green-600 mb-1" />
              <AnimatedNumber value={allContributors.length} className="text-3xl font-bold text-black" />
            </div>
            <div className="text-sm text-muted">Contributors</div>
          </div>
        </div>

        {/* Repositories */}
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-bold text-black">Repositories</h2>
          <div className="space-y-4">
            {project.repositories.map((repo) => (
              <div key={repo.id} className="p-4 border-2 border-black space-y-3">
                <div className="flex items-center justify-between">
                  <a
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-black underline hover:no-underline text-lg"
                  >
                    {repo.name}
                  </a>
                  <span className="flex items-center gap-1 text-black">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {(repo.stars ?? 0).toLocaleString()}
                  </span>
                </div>
                {repo.description && <p className="text-sm text-muted">{repo.description}</p>}
                {repo.contributors && repo.contributors.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {repo.contributors.slice(0, 5).map((contributor, idx) => (
                      <a
                        key={`${contributor.githubHandle}-${idx}`}
                        href={`https://github.com/${contributor.githubHandle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-1 border border-black hover:bg-gray-50"
                      >
                        {contributor.avatarUrl && (
                          <img src={contributor.avatarUrl} alt={contributor.githubHandle} className="h-6 w-6 object-cover" />
                        )}
                        <span className="text-xs">@{contributor.githubHandle}</span>
                      </a>
                    ))}
                    {repo.contributors.length > 5 && <span className="text-xs text-muted p-1">+{repo.contributors.length - 5} more</span>}
                  </div>
                )}

                {/* Issues Section */}
                {repo.issues && repo.issues.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-black mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Open Issues ({repo.issues.filter((i) => i.state === 'open').length})
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {repo.issues
                        .filter((i) => i.state === 'open')
                        .map((issue) => (
                          <div key={issue.id} className="w-full p-3 border border-black">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
                                  <span className="text-xs text-muted">#{issue.number}</span>
                                </div>
                                <a
                                  href={issue.htmlUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium text-black underline hover:no-underline truncate"
                                >
                                  {issue.title}
                                </a>
                              </div>
                              {(() => {
                                const existingBounty = getIssueBounty(repo.githubUrl, issue.number)
                                if (existingBounty) {
                                  return (
                                    <span className="text-xs px-2 py-1 flex-shrink-0 bg-yellow-100 border border-yellow-400 text-yellow-800 font-medium">
                                      {existingBounty.amount} ALGO
                                    </span>
                                  )
                                }
                                return (
                                  <button
                                    type="button"
                                    onClick={() => openBountyModal(issue, repo.githubUrl)}
                                    className="btn-secondary text-xs px-2 py-1 flex-shrink-0"
                                  >
                                    {isConnected ? '+ Bounty' : 'Connect to bounty'}
                                  </button>
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
          </div>
        </div>

        {/* All Contributors */}
        {allContributors.length > 0 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold text-black">All Contributors</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {allContributors.map((contributor, idx) => (
                <div key={`${contributor.githubHandle}-${idx}`} className="flex items-center gap-3 p-3 border-2 border-black">
                  {contributor.avatarUrl && (
                    <img
                      src={contributor.avatarUrl}
                      alt={contributor.githubHandle}
                      className="h-12 w-12 object-cover border-2 border-black"
                    />
                  )}
                  <a
                    href={`https://github.com/${contributor.githubHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-black underline hover:no-underline"
                  >
                    @{contributor.githubHandle}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Bounty Modal */}
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
