import { Link } from 'react-router-dom'
import { FiExternalLink, FiGithub, FiClock, FiFolder } from 'react-icons/fi'
import { Badge } from './ui/badge'
import { Bounty } from '../interfaces/entities'
import { formatAlgoAmount } from '../utils/amount'

interface Props {
  bounty: Bounty
  disableLink?: boolean
}

function getBountyStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline' {
  switch (status) {
    case 'OPEN':
      return 'warning'
    case 'READY_FOR_CLAIM':
      return 'info'
    case 'CLAIMED':
      return 'success'
    default:
      return 'secondary'
  }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export default function BountyCard({ bounty, disableLink }: Props) {
  const content = (
    <article className="rounded-lg border border-border-default bg-bg-surface p-4 flex flex-col gap-3 h-full hover:border-accent/40 hover:shadow-glow transition-all duration-150 cursor-pointer">
      {/* Header: title + status - add test comment to close issue */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <FiGithub className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-text-muted leading-none mb-1">{bounty.repoOwner}</p>
            <h3 className="text-sm font-semibold text-text-primary">
              {bounty.repoName} <span className="text-text-muted font-normal">#{bounty.issueNumber}</span>
            </h3>
          </div>
        </div>
        <Badge variant={getBountyStatusVariant(bounty.status)} className="flex-shrink-0 text-xs">
          {bounty.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Project association */}
      {bounty.projectName && (
        <p className="text-xs text-text-secondary flex items-center gap-1.5">
          <FiFolder className="w-3.5 h-3.5 flex-shrink-0 text-text-muted" />
          {bounty.projectName}
        </p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer: amount + meta */}
      <div className="flex items-center justify-between pt-3 border-t border-border-default">
        <span className="text-xl font-bold text-accent font-mono">{formatAlgoAmount(bounty.amount)}</span>
        <div className="flex items-center gap-3">
          {bounty.createdAt && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <FiClock className="w-3 h-3" />
              {relativeTime(bounty.createdAt)}
            </span>
          )}
          {bounty.issueUrl && (
            <a
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors"
              href={bounty.issueUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <FiExternalLink className="w-3.5 h-3.5" />
              Issue
            </a>
          )}
        </div>
      </div>
    </article>
  )

  if (disableLink) {
    return content
  }

  return (
    <Link to={`/bounty/${bounty.id}`} className="block h-full">
      {content}
    </Link>
  )
}
