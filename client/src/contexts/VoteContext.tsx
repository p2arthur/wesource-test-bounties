import { createContext, ReactNode, useContext, useMemo, useState } from 'react'

type VoteRecord = {
  up: number
  down: number
}

interface VoteContextValue {
  getVotes: (key: string) => VoteRecord
  upvote: (key: string) => void
  downvote: (key: string) => void
}

const VoteContext = createContext<VoteContextValue | undefined>(undefined)

export function VoteProvider({ children }: { children: ReactNode }) {
  const [votes, setVotes] = useState<Record<string, VoteRecord>>({})

  const getVotes = (key: string) => votes[key] || { up: 0, down: 0 }

  const upvote = (key: string) => {
    setVotes((current) => {
      const existing = current[key] || { up: 0, down: 0 }
      return { ...current, [key]: { ...existing, up: existing.up + 1 } }
    })
  }

  const downvote = (key: string) => {
    setVotes((current) => {
      const existing = current[key] || { up: 0, down: 0 }
      return { ...current, [key]: { ...existing, down: existing.down + 1 } }
    })
  }

  const value = useMemo<VoteContextValue>(() => ({ getVotes, upvote, downvote }), [votes])

  return <VoteContext.Provider value={value}>{children}</VoteContext.Provider>
}

export function useVotes() {
  const context = useContext(VoteContext)
  if (!context) {
    throw new Error('useVotes must be used within a VoteProvider')
  }
  return context
}
