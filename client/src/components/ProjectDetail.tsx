import { useEffect, useMemo, useState } from 'react'
import { Project } from '../interfaces/entities'

interface Props {
  project: Project | null
}

export default function ProjectDetail({ project }: Props) {
  const [activeRepoIndex, setActiveRepoIndex] = useState(0)

  useEffect(() => {
    setActiveRepoIndex(0)
  }, [project?.id])

  const activeRepo = useMemo(() => {
    if (!project || !project.repositories.length) return null
    return project.repositories[activeRepoIndex] || project.repositories[0]
  }, [activeRepoIndex, project])

  const totalStars = useMemo(() => {
    if (!project) return 0
    return project.repositories.reduce((acc, repo) => acc + repo.stars, 0)
  }, [project])

  const allContributors = useMemo(() => {
    if (!project) return []
    return project.repositories.flatMap((repo) => repo.contributors || [])
  }, [project])

  if (!project) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-2 border-black flex items-center justify-center">
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-black font-medium">Select a project to view details</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Project Info */}
      <div className="card p-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <span className="badge mb-1">{project.category}</span>
            <h2 className="text-xl font-bold text-black">{project.name}</h2>
          </div>
        </div>

        <p className="text-sm text-black leading-relaxed mb-4">{project.description || 'No description available'}</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="border-2 border-black p-3 text-center">
            <p className="text-2xl font-bold text-black">{project.repositories.length}</p>
            <p className="text-xs text-muted uppercase">Repos</p>
          </div>
          <div className="border-2 border-black p-3 text-center">
            <p className="text-2xl font-bold text-black">{totalStars.toLocaleString()}</p>
            <p className="text-xs text-muted uppercase">Stars</p>
          </div>
          <div className="border-2 border-black p-3 text-center">
            <p className="text-2xl font-bold text-black">{allContributors.length}</p>
            <p className="text-xs text-muted uppercase">Contributors</p>
          </div>
        </div>

        {/* Repository names as tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.repositories.map((repo) => (
            <span key={repo.id} className="px-2 py-1 border-2 border-black text-xs font-medium text-black">
              {repo.name}
            </span>
          ))}
        </div>
      </div>

      {/* Repos */}
      {project.repositories.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-black mb-3 uppercase tracking-wider">Repositories</h3>
          <div className="flex gap-2 flex-wrap mb-3">
            {project.repositories.map((repo, idx) => (
              <button
                key={repo.id}
                className={`tab-button px-3 py-1.5 text-sm ${
                  idx === activeRepoIndex ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
                }`}
                onClick={() => setActiveRepoIndex(idx)}
              >
                {repo.name}
              </button>
            ))}
          </div>
          {activeRepo && (
            <div className="border-2 border-black p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-black">{activeRepo.name}</h4>
                <span className="flex items-center gap-1 text-sm text-black">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {activeRepo.stars.toLocaleString()}
                </span>
              </div>
              {activeRepo.description && <p className="text-sm text-muted mb-3">{activeRepo.description}</p>}
              <a
                className="inline-flex items-center gap-1.5 text-sm text-black underline hover:no-underline"
                href={activeRepo.githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                Open on GitHub
              </a>
            </div>
          )}
        </div>
      )}

      {/* Contributors */}
      {allContributors.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-black mb-3 uppercase tracking-wider">Contributors</h3>
          <div className="flex flex-wrap gap-3">
            {allContributors.slice(0, 6).map((contributor, idx) => (
              <a
                key={`${contributor.githubHandle}-${idx}`}
                href={`https://github.com/${contributor.githubHandle}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border-2 border-black px-3 py-2 hover:bg-gray-50"
              >
                {contributor.avatarUrl && (
                  <img src={contributor.avatarUrl} alt={contributor.githubHandle} className="h-8 w-8 object-cover border-2 border-black" />
                )}
                <p className="text-sm font-medium text-black">@{contributor.githubHandle}</p>
              </a>
            ))}
            {allContributors.length > 6 && (
              <div className="flex items-center justify-center border-2 border-black px-4 py-2">
                <span className="text-sm text-muted">+{allContributors.length - 6} more</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
