import { useVotes } from '../contexts/VoteContext'

interface VoteWidgetProps {
  voteKey: string
  size?: 'sm' | 'md'
  className?: string
}

export default function VoteWidget({ voteKey, size = 'sm', className = '' }: VoteWidgetProps) {
  const { getVotes, upvote, downvote } = useVotes()
  const votes = getVotes(voteKey)

  const base = 'flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium transition-colors'
  const upClass = `${base} text-text-secondary hover:bg-success/15 hover:text-success`
  const downClass = `${base} text-text-muted hover:bg-danger/15 hover:text-danger`

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button type="button" className={upClass} onClick={(e) => { e.preventDefault(); upvote(voteKey) }}>
        ▲ <span>{votes.up}</span>
      </button>
      <button type="button" className={downClass} onClick={(e) => { e.preventDefault(); downvote(voteKey) }}>
        ▼ <span>{votes.down}</span>
      </button>
    </div>
  )
}
