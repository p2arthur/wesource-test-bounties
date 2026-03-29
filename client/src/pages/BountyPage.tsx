import { useEffect, useMemo, useState } from 'react'
import AnimatedNumber from '../components/AnimatedNumber'
import { FaCoins, FaCheckCircle, FaGithub, FaChevronRight } from 'react-icons/fa'
import { Link, useParams } from 'react-router-dom'
import LoadingPair from '../components/LoadingPair'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Bounty, Project } from '../interfaces/entities'
import { listBounties, refundBounty } from '../services/api'

/**
 * Convert microAlgos to ALGO (1 ALGO = 1,000,000 microAlgos)
 */
const microAlgosToAlgo = (microAlgos: number): number => {
  return microAlgos / 1_000_000
}

export default function BountyPage() {
  const { bountyId } = useParams<{ bountyId: string }>()
  const { isConnected, activeAddress } = useUnifiedWallet()
  const { projects, loading: projectsLoading, error: projectsError } = useProjects()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const [isRefunding, setIsRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  const handleRefund = async () => {
    if (!bounty) return

    setIsRefunding(true)
    setRefundError(null)

    try {
      await refundBounty(bounty.id)
      // Reload bounties to update status
      const data = await listBounties()
      setBounties(data)
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Failed to refund bounty')
    } finally {
      setIsRefunding(false)
    }
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
              Back to Home
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
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isOpen = bounty.status === 'OPEN'
  const isCreator = activeAddress === bounty.creatorWallet
  const bountyTitle = `${bounty.repoOwner}/${bounty.repoName} #${bounty.issueNumber}`

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-black hover:underline font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Bounties
        </Link>

        {/* Bounty Header */}
        <div className="card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <span className={`badge ${isOpen ? 'badge-success' : ''}`}>{bounty.status}</span>
              <h1 className="text-2xl font-bold text-black">{bountyTitle}</h1>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center gap-2 text-3xl font-bold text-black">
                <FaCoins className="text-yellow-600" />
                <AnimatedNumber value={microAlgosToAlgo(bounty.amount)} decimals={2} />
              </div>
              <div className="text-sm text-muted">ALGO</div>
            </div>
          </div>

          {/* Project Link */}
          {project && (
            <Link
              to={`/project/${project.id}`}
              className="flex items-center gap-3 p-3 border-2 border-black hover:bg-gray-50 transition-colors"
            >
              {project.logo && <img src={project.logo} alt={project.name} className="h-10 w-10 object-contain border-2 border-black p-1" />}
              <div>
                <div className="text-sm text-muted">Project</div>
                <div className="font-bold text-black">{project.name}</div>
              </div>
              <FaChevronRight className="w-5 h-5 ml-auto text-black" />
            </Link>
          )}
        </div>

        {/* Bounty Details */}
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-black mb-3">Description</h2>
            <p className="text-black leading-relaxed">
              This bounty is for GitHub issue {bountyTitle}. Contributors should review the issue for detailed requirements and
              specifications.
            </p>
          </div>

          <div className="border-t-2 border-black pt-4 space-y-4">
            <h3 className="text-lg font-bold text-black">Requirements</h3>
            <ul className="space-y-2 text-black">
              <li className="flex items-start gap-2">
                <FaCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                Code must follow the project's existing conventions
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Include tests for new functionality
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Update documentation if applicable
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit a PR referencing this bounty
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

            {bounty.status === 'REFUNDABLE' && isCreator ? (
              <div className="border-2 border-yellow-600 bg-yellow-50 p-4 flex-1 min-w-[180px] text-center" style={{ maxWidth: 320 }}>
                <h3 className="font-bold mb-2">Bounty Refundable</h3>
                <p className="text-sm mb-3">This issue was closed without a solution. You can reclaim your funds.</p>
                <button
                  onClick={handleRefund}
                  disabled={isRefunding}
                  className="btn-primary w-full py-2 px-4 border-2 border-black hover:bg-yellow-100 disabled:opacity-50"
                >
                  {isRefunding ? 'Refunding...' : `Reclaim ${microAlgosToAlgo(bounty.amount).toFixed(2)} ALGO`}
                </button>
                {refundError && <p className="text-red-600 text-xs mt-2">{refundError}</p>}
              </div>
            ) : isOpen && isConnected ? (
              <button
                className="flex-1 min-w-[180px] btn-primary flex items-center justify-center gap-3 py-4 text-lg font-semibold shadow-lg border-2 border-black hover:bg-green-100 transition-all"
                style={{ maxWidth: 320 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Claim Bounty</span>
              </button>
            ) : isOpen ? (
              <div className="flex-1 min-w-[180px] text-sm text-muted border-2 border-black p-3 text-center" style={{ maxWidth: 320 }}>
                Connect your account to claim this bounty
              </div>
            ) : (
              <div className="flex-1 min-w-[180px] text-sm text-muted border-2 border-black p-3 text-center" style={{ maxWidth: 320 }}>
                This bounty has been claimed
              </div>
            )}
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
      </div>
    </div>
  )
}
