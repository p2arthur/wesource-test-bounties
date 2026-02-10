import { useEffect, useState, useCallback } from 'react'
import { bountySubscriber, BountyCreatedEvent } from '../services/bountySubscriber'

/**
 * A live feed item that can be either a bounty or project
 */
export interface LiveFeedItem {
  id: string
  type: 'bounty' | 'project'
  title: string
  detail: string
  timestamp: Date
  txId?: string
  creator?: string
}

/**
 * Formats a relative time string (e.g., "just now", "2m ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 10) {
    return 'just now'
  }
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  return `${diffDays}d ago`
}

/**
 * Convert microAlgos to a formatted ALGO string
 */
function formatAlgoAmount(microAlgos: bigint): string {
  const algos = Number(microAlgos) / 1_000_000
  return algos.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/**
 * Convert a BountyCreatedEvent to a LiveFeedItem
 */
function bountyEventToFeedItem(event: BountyCreatedEvent): LiveFeedItem {
  return {
    id: `b-${event.txId}`,
    type: 'bounty',
    title: `New bounty #${event.bountyId.toString().slice(-6)}`,
    detail: `${formatAlgoAmount(event.bountyAmount)} ALGO · ${formatRelativeTime(event.timestamp)}`,
    timestamp: event.timestamp,
    txId: event.txId,
    creator: event.creator,
  }
}

/**
 * Hook to subscribe to live bounty feed events
 */
export function useLiveFeed(maxItems = 10): {
  items: LiveFeedItem[]
  isConnected: boolean
} {
  const [items, setItems] = useState<LiveFeedItem[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Update relative times periodically
  const updateTimestamps = useCallback(() => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.type === 'bounty' && item.timestamp) {
          const baseDetail = item.detail.split('·')[0]
          return { ...item, detail: `${baseDetail}· ${formatRelativeTime(item.timestamp)}` }
        }
        return item
      }),
    )
  }, [])

  useEffect(() => {
    // Initialize with any recent events from the subscriber
    const recentEvents = bountySubscriber.getRecentEvents()
    if (recentEvents.length > 0) {
      const feedItems = recentEvents.slice(0, maxItems).map(bountyEventToFeedItem)
      setItems(feedItems)
    }

    // Subscribe to new bounty events
    const unsubscribe = bountySubscriber.addListener((event) => {
      const newItem = bountyEventToFeedItem(event)

      setItems((currentItems) => {
        // Check if this item already exists
        if (currentItems.some((item) => item.id === newItem.id)) {
          return currentItems
        }

        // Add to the front, keep only maxItems
        const updated = [newItem, ...currentItems].slice(0, maxItems)
        return updated
      })
    })

    // Check connection status
    const checkConnection = () => {
      setIsConnected(bountySubscriber.isActive())
    }

    checkConnection()
    const connectionCheckInterval = setInterval(checkConnection, 5000)

    // Update timestamps every 30 seconds
    const timestampInterval = setInterval(updateTimestamps, 30000)

    return () => {
      unsubscribe()
      clearInterval(connectionCheckInterval)
      clearInterval(timestampInterval)
    }
  }, [maxItems, updateTimestamps])

  return { items, isConnected }
}
