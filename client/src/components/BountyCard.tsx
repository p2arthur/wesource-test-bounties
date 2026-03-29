import { Link } from 'react-router-dom'
import { Bounty } from '../interfaces/entities'
import { formatAlgoAmount } from '../utils/amount'

interface Props {
  bounty: Bounty
  disableLink?: boolean
}

export default function BountyCard({ bounty, disableLink }: Props) {
  const isOpen = bounty.status === 'OPEN'
  const bountyTitle = `${bounty.repoOwner}/${bounty.repoName} #${bounty.issueNumber}`

  const content = (
    <article className="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-black line-clamp-2">{bountyTitle}</h3>
        <span className={`badge flex-shrink-0 ${isOpen ? 'badge-success' : ''}`}>
          {bounty.status}
        </span>
      </div>

      {bounty.projectName && (
        <p className="text-sm text-black flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          {bounty.projectName}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t-2 border-black">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-black flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-black">
            {formatAlgoAmount(bounty.amount)}
          </span>
        </div>
        {bounty.issueUrl && (
          <a
            className="flex items-center gap-1.5 text-sm text-black underline hover:no-underline"
            href={bounty.issueUrl}
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
