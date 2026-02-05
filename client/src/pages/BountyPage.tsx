import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingPair from '../components/LoadingPair'
import { useProjects } from '../contexts/ProjectContext'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Bounty, Project } from '../interfaces/entities'
import { listBounties } from '../services/api'

export default function BountyPage() {
  const { bountyId } = useParams<{ bountyId: string }>()
  const { isConnected } = useUnifiedWallet()
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
            <div className="text-right">
              <div className="text-3xl font-bold text-black">{bounty.amount}</div>
              <div className="text-sm text-muted">ALGO</div>
            </div>
          </div>

          {/* Project Link */}
        {project && (
          <Link to={`/project/${project.id}`} className="flex items-center gap-3 p-3 border-2 border-black hover:bg-gray-50 transition-colors">
            {project.logo && <img src={project.logo} alt={project.name} className="h-10 w-10 object-contain border-2 border-black p-1" />}
            <div>
              <div className="text-sm text-muted">Project</div>
                <div className="font-bold text-black">{project.name}</div>
              </div>
              <svg className="w-5 h-5 ml-auto text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Bounty Details */}
        <div className="card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-black mb-3">Description</h2>
            <p className="text-black leading-relaxed">
              This bounty is for GitHub issue {bountyTitle}. Contributors should review the issue for detailed requirements and specifications.
            </p>
          </div>

          <div className="border-t-2 border-black pt-4 space-y-4">
            <h3 className="text-lg font-bold text-black">Requirements</h3>
            <ul className="space-y-2 text-black">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-bold text-black">Actions</h2>

          <div className="flex flex-wrap gap-4">
            {bounty.issueUrl && (
              <a href={bounty.issueUrl} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                View GitHub Issue
              </a>
            )}

            {isOpen && isConnected ? (
              <button className="btn-primary flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Claim Bounty
              </button>
            ) : isOpen ? (
              <div className="text-sm text-muted border-2 border-black p-3">Connect your account to claim this bounty</div>
            ) : (
              <div className="text-sm text-muted border-2 border-black p-3">This bounty has been claimed</div>
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
