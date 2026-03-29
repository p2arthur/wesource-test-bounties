import { Link } from 'react-router-dom'
import { FiExternalLink } from 'react-icons/fi'
import { Badge } from './ui/badge'
import { Bounty } from '../interfaces/entities'
import { formatAlgoAmount } from '../utils/amount'

interface Props {
  bounty: Bounty
  disableLink?: boolean
}

function getBountyStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline' {
  switch (status) {
    case 'OPEN': return 'warning'
    case 'READY_FOR_CLAIM': return 'info'
    case 'CLAIMED': return 'success'
    default: return 'secondary'
  }
}

export default function BountyCard({ bounty, disableLink }: Props) {
  const bountyTitle = `${bounty.repoOwner}/${bounty.repoName} #${bounty.issueNumber}`

  const content = (
    <article className="rounded-lg border border-border-default bg-bg-surface p-4 flex flex-col gap-3 hover:border-accent/40 hover:shadow-glow transition-all duration-150 cursor-pointer">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{bountyTitle}</h3>
        <Badge variant={getBountyStatusVariant(bounty.status)} className="flex-shrink-0">
          {bounty.status}
        </Badge>
      </div>

      {bounty.projectName && (
        <p className="text-xs text-text-secondary flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          {bounty.projectName}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border-default">
        <span className="text-xl font-bold text-accent font-mono">
          {formatAlgoAmount(bounty.amount)}
        </span>
        {bounty.issueUrl && (
          <a
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors"
            href={bounty.issueUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <FiExternalLink className="w-3.5 h-3.5" />
            View Issue
          </a>
        )}
      </div>
    </article>
  )

  if (disableLink) {
    return content
  }

  return <Link to={`/bounty/${bounty.id}`}>{content}</Link>
}
