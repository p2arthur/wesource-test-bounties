import { Link } from 'react-router-dom'
import { Project } from '../interfaces/entities'
import VoteWidget from './VoteWidget'

interface Props {
  project: Project
}

export default function ProjectCard({ project }: Props) {
  // Calculate total contributors across all repositories
  const totalContributors = project.repositories.reduce((acc, repo) => acc + (repo.contributors?.length || 0), 0)

  // Calculate total stars across all repositories
  const totalStars = project.repositories.reduce((acc, repo) => acc + repo.stars, 0)

  return (
    <Link to={`/project/${project.id}`}>
      <article className="card p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {project.category && <span className="badge">{project.category}</span>}
            <h3 className="text-xl font-bold text-black">{project.name}</h3>
          </div>
          <VoteWidget voteKey={`project:${project.id}`} />
        </div>

        <p className="text-sm text-black leading-relaxed line-clamp-2">{project.description || 'No description available'}</p>

        {/* Repository names as tags */}
        <div className="flex flex-wrap gap-2">
          {project.repositories.slice(0, 4).map((repo) => (
            <span key={repo.id} className="px-2 py-1 border-2 border-black text-xs font-medium text-black">
              {repo.name}
            </span>
          ))}
          {project.repositories.length > 4 && (
            <span className="px-2 py-1 text-xs font-medium text-muted">+{project.repositories.length - 4}</span>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2 border-t-2 border-black">
          <div className="flex items-center gap-1.5 text-sm text-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span>{project.repositories.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-black">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{totalStars.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-black">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
              />
            </svg>
            <span>{totalContributors}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
