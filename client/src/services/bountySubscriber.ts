import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import type { SubscribedTransaction, TransactionFilter } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

// The deployed SourceFactory App ID
const SOURCE_FACTORY_APP_ID = BigInt(import.meta.env.VITE_SOURCE_FACTORY_APP_ID || '0')

// Method selector for create_bounty(uint64,uint64)void
const CREATE_BOUNTY_METHOD_SELECTOR = '0x32896276'

/**
 * Event emitted when a new bounty is created on-chain
 */
export interface BountyCreatedEvent {
  bountyId: bigint
  bountyAmount: bigint
  creator: string
  txId: string
  timestamp: Date
  round: bigint
}

/**
 * Event listener type for bounty events
 */
export type BountyEventListener = (event: BountyCreatedEvent) => void

/**
 * Singleton class to manage real-time blockchain subscription for bounty events
 */
class BountySubscriberService {
  private subscriber: AlgorandSubscriber | null = null
  private listeners: Set<BountyEventListener> = new Set()
  private isRunning = false
  private algorand: AlgorandClient | null = null
  private lastProcessedRound = 0n
  private pollIntervalId: ReturnType<typeof setInterval> | null = null
  private recentEvents: BountyCreatedEvent[] = []
  private maxRecentEvents = 50

  /**
   * Initialize the Algorand client based on environment
   */
  private getAlgorandClient(): AlgorandClient {
    if (this.algorand) {
      return this.algorand
    }

    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()

    this.algorand = AlgorandClient.fromConfig({
      algodConfig: {
        server: algodConfig.server,
        port: algodConfig.port,
        token: algodConfig.token as string,
      },
      indexerConfig: {
        server: indexerConfig.server,
        port: indexerConfig.port,
        token: indexerConfig.token as string,
      },
    })

    return this.algorand
  }

  /**
   * Start subscribing to bounty creation events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      // eslint-disable-next-line no-console
      console.log('[BountySubscriber] Already running')
      return
    }

    if (!SOURCE_FACTORY_APP_ID || SOURCE_FACTORY_APP_ID === 0n) {
      // eslint-disable-next-line no-console
      console.warn('[BountySubscriber] SourceFactory App ID not configured, skipping subscription')
      return
    }

    try {
      const algorand = this.getAlgorandClient()
      const algod = algorand.client.algod

      // Get the current round to start from
      const status = await algod.status().do()
      this.lastProcessedRound = BigInt(status.lastRound || 0)

      // eslint-disable-next-line no-console
      console.log(`[BountySubscriber] Starting from round ${this.lastProcessedRound}`)

      // Create the subscription filter for create_bounty app calls
      const filter: TransactionFilter = {
        appId: SOURCE_FACTORY_APP_ID,
        methodSignature: 'create_bounty(uint64,uint64)void',
      }

      // Create the subscriber
      this.subscriber = new AlgorandSubscriber(
        {
          filters: [
            {
              name: 'bounty-created',
              filter,
            },
          ],
          frequencyInSeconds: 2,
          maxRoundsToSync: 100,
          syncBehaviour: 'catchup-with-indexer',
          watermarkPersistence: {
            get: async () => this.lastProcessedRound,
            set: async (round) => {
              this.lastProcessedRound = round
            },
          },
        },
        algorand.client.algod,
        algorand.client.indexer,
      )

      // Subscribe to bounty-created events
      this.subscriber.on('bounty-created', (txn: SubscribedTransaction) => {
        this.handleBountyCreated(txn)
      })

      // Start the subscriber
      this.subscriber.start()
      this.isRunning = true

      // eslint-disable-next-line no-console
      console.log('[BountySubscriber] Started successfully')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[BountySubscriber] Failed to start:', error)
      // Fallback to polling if subscriber fails
      this.startPolling()
    }
  }

  /**
   * Fallback polling mechanism when real-time subscription is unavailable
   */
  private startPolling(): void {
    if (this.pollIntervalId) {
      return
    }

    // eslint-disable-next-line no-console
    console.log('[BountySubscriber] Starting fallback polling')

    this.pollIntervalId = setInterval(async () => {
      await this.pollForNewBounties()
    }, 5000) // Poll every 5 seconds

    this.isRunning = true
  }

  /**
   * Poll for new bounty transactions using indexer
   */
  private async pollForNewBounties(): Promise<void> {
    if (!SOURCE_FACTORY_APP_ID || SOURCE_FACTORY_APP_ID === 0n) {
      return
    }

    try {
      const algorand = this.getAlgorandClient()
      const indexer = algorand.client.indexer

      // Get recent transactions for the app
      const response = await indexer
        .searchForTransactions()
        .applicationID(Number(SOURCE_FACTORY_APP_ID))
        .minRound(Number(this.lastProcessedRound + 1n))
        .limit(20)
        .do()

      const transactions = response.transactions || []

      for (const txn of transactions) {
        // Check if it's a create_bounty call by checking the method selector in app args
        const appArgs = txn.applicationTransaction?.applicationArgs || []
        if (appArgs.length > 0) {
          // First arg is the method selector (base64 encoded)
          const methodSelector = Buffer.from(appArgs[0] as Uint8Array).toString('hex')
          if (`0x${methodSelector}` === CREATE_BOUNTY_METHOD_SELECTOR) {
            // Parse bounty_id and bounty_total_value from args
            const bountyIdBytes = Buffer.from(appArgs[1] as Uint8Array)
            const bountyValueBytes = Buffer.from(appArgs[2] as Uint8Array)

            const bountyId = bountyIdBytes.readBigUInt64BE(0)
            const bountyAmount = bountyValueBytes.readBigUInt64BE(0)

            const event: BountyCreatedEvent = {
              bountyId,
              bountyAmount,
              creator: txn.sender || 'Unknown',
              txId: txn.id || '',
              timestamp: new Date(txn.roundTime ? txn.roundTime * 1000 : Date.now()),
              round: BigInt(txn.confirmedRound || 0),
            }

            this.emitEvent(event)
          }
        }

        // Update last processed round
        const txnRound = BigInt(txn.confirmedRound || 0)
        if (txnRound > this.lastProcessedRound) {
          this.lastProcessedRound = txnRound
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[BountySubscriber] Polling error:', error)
    }
  }

  /**
   * Handle a bounty creation event from the subscriber
   */
  private handleBountyCreated(txn: SubscribedTransaction): void {
    try {
      const appArgs = txn.applicationTransaction?.applicationArgs || []

      if (appArgs.length < 3) {
        return
      }

      // Parse bounty_id and bounty_total_value from args (args[0] is method selector)
      const bountyIdBytes = Buffer.from(appArgs[1] as Uint8Array)
      const bountyValueBytes = Buffer.from(appArgs[2] as Uint8Array)

      const bountyId = bountyIdBytes.readBigUInt64BE(0)
      const bountyAmount = bountyValueBytes.readBigUInt64BE(0)

      const bountyEvent: BountyCreatedEvent = {
        bountyId,
        bountyAmount,
        creator: txn.sender || 'Unknown',
        txId: txn.id || '',
        timestamp: new Date(txn.roundTime ? txn.roundTime * 1000 : Date.now()),
        round: BigInt(txn.confirmedRound || 0),
      }

      this.emitEvent(bountyEvent)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[BountySubscriber] Error parsing bounty event:', error)
    }
  }

  /**
   * Emit an event to all registered listeners
   */
  private emitEvent(event: BountyCreatedEvent): void {
    // Check for duplicate events
    const isDuplicate = this.recentEvents.some((e) => e.txId === event.txId)
    if (isDuplicate) {
      return
    }

    // Add to recent events (for deduplication)
    this.recentEvents.unshift(event)
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.pop()
    }

    // eslint-disable-next-line no-console
    console.log('[BountySubscriber] New bounty created:', {
      bountyId: event.bountyId.toString(),
      amount: `${Number(event.bountyAmount) / 1_000_000} ALGO`,
      creator: `${event.creator.slice(0, 8)}...`,
    })

    // Notify all listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[BountySubscriber] Listener error:', error)
      }
    })
  }

  /**
   * Stop the subscriber
   */
  stop(): void {
    if (this.subscriber) {
      this.subscriber.stop('')
      this.subscriber = null
    }

    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId)
      this.pollIntervalId = null
    }

    this.isRunning = false
    // eslint-disable-next-line no-console
    console.log('[BountySubscriber] Stopped')
  }

  /**
   * Add a listener for bounty created events
   */
  addListener(listener: BountyEventListener): () => void {
    this.listeners.add(listener)

    // Start the subscriber if this is the first listener
    if (this.listeners.size === 1 && !this.isRunning) {
      this.start()
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)

      // Stop the subscriber if no more listeners
      if (this.listeners.size === 0) {
        this.stop()
      }
    }
  }

  /**
   * Get the most recent events (useful for initial state)
   */
  getRecentEvents(): BountyCreatedEvent[] {
    return [...this.recentEvents]
  }

  /**
   * Check if the subscriber is currently running
   */
  isActive(): boolean {
    return this.isRunning
  }
}

// Export singleton instance
export const bountySubscriber = new BountySubscriberService()
