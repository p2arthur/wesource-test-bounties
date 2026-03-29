import { useLiveFeed } from '../hooks/useLiveFeed'

const placeholderItems = [
  { id: 'p-1', type: 'project' as const, title: 'New project: AlgoTools', detail: 'Tooling · just now', timestamp: new Date() },
  { id: 'b-1', type: 'bounty' as const, title: 'New bounty: Fix wallet sync', detail: '40 ALGO · 2m ago', timestamp: new Date() },
  { id: 'p-2', type: 'project' as const, title: 'New project: ChainVault', detail: 'DeFi · 6m ago', timestamp: new Date() },
]

export default function LiveFeedWedge() {
  const { items: liveItems, isConnected } = useLiveFeed(10)
  const displayItems = liveItems.length > 0 ? liveItems : placeholderItems

  return (
    <div className="w-full py-1.5 px-4 bg-bg-elevated border-b border-border-default">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted flex-shrink-0">
          <span
            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-success animate-pulse' : 'bg-warning'}`}
            title={isConnected ? 'Connected to blockchain' : 'Connecting...'}
          />
          Live
        </div>
        <div className="flex-1 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-sm border px-2 py-0.5 text-xs transition-all duration-300 ${
                  item.type === 'project'
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-border-default bg-bg-hover text-text-secondary'
                } ${item.id.startsWith('b-0x') || item.id.startsWith('b-tx') ? 'animate-[pulse_1s_ease-in-out_2]' : ''}`}
              >
                <span className="font-medium">{item.title}</span>
                <span className="text-text-muted ml-1">· {item.detail}</span>
              </div>
            ))}
            {displayItems.length === 0 && (
              <div className="text-xs text-text-muted italic">Waiting for activity...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
