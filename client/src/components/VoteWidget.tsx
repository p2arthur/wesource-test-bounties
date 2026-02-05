import { useVotes } from '../contexts/VoteContext'

interface VoteWidgetProps {
  voteKey: string
  size?: 'sm' | 'md'
  className?: string
}

export default function VoteWidget({ voteKey, size = 'sm', className = '' }: VoteWidgetProps) {
  const { getVotes, upvote, downvote } = useVotes()
  const votes = getVotes(voteKey)

  const buttonSize = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button type="button" className="text-green-600" onClick={() => upvote(voteKey)}>
        ▲<span>{votes.up}</span>
      </button>
      <button type="button" className="text-red-600" onClick={() => downvote(voteKey)}>
        ▼<span>{votes.down}</span>
      </button>
    </div>
  )
}
