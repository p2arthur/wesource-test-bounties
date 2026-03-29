import { Link } from 'react-router-dom'
import { FiStar, FiGitBranch, FiUsers, FiZap } from 'react-icons/fi'
import { Badge } from './ui/badge'
import { Project } from '../interfaces/entities'
import VoteWidget from './VoteWidget'

interface Props {
  project: Project
}

export default function ProjectCard({ project }: Props) {
  const totalContributors = project.repositories.reduce((acc, repo) => acc + (repo.contributors?.length || 0), 0)
  const totalStars = project.repositories.reduce((acc, repo) => acc + repo.stars, 0)
  const openBounties = project.bounties?.filter((b) => b.status === 'OPEN').length ?? 0

  return (
    <Link to={`/project/${project.id}`} className="block h-full">
      <article className="rounded-lg border border-border-default bg-bg-surface p-4 flex flex-col gap-3 h-full hover:border-accent/40 hover:shadow-glow transition-all duration-150 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            {project.category && (
              <Badge variant="default">{project.category}</Badge>
            )}
            <h3 className="text-base font-semibold text-text-primary">
              {project.name}
            </h3>
          </div>
          <VoteWidget voteKey={`project:${project.id}`} />
        </div>

        {/* Description */}
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
          {project.description || 'No description available'}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Repo tags */}
        <div className="flex flex-wrap gap-1.5">
          {project.repositories.slice(0, 4).map((repo) => (
            <span key={repo.id} className="px-2 py-0.5 rounded-sm border border-border-default bg-bg-elevated text-xs text-text-secondary">
              {repo.name}
            </span>
          ))}
          {project.repositories.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-text-muted">+{project.repositories.length - 4}</span>
          )}
        </div>

        {/* Stats footer */}
        <div className="flex items-center gap-4 pt-2 border-t border-border-default">
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <FiGitBranch className="w-3.5 h-3.5" />
            <span>{project.repositories.length}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <FiStar className="w-3.5 h-3.5 text-warning" />
            <span>{totalStars.toLocaleString()}</span>
          </div>
          {totalContributors > 0 && (
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <FiUsers className="w-3.5 h-3.5" />
              <span>{totalContributors}</span>
            </div>
          )}
          {openBounties > 0 && (
            <div className="flex items-center gap-1 text-xs text-accent ml-auto">
              <FiZap className="w-3.5 h-3.5" />
              <span>{openBounties} open</span>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
