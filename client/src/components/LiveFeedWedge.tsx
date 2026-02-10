import { useLiveFeed } from '../hooks/useLiveFeed'

// Static items to show when no live events are available
const placeholderItems = [
  { id: 'p-1', type: 'project' as const, title: 'New project: AlgoTools', detail: 'Tooling · just now', timestamp: new Date() },
  { id: 'b-1', type: 'bounty' as const, title: 'New bounty: Fix wallet sync', detail: '40 ALGO · 2m ago', timestamp: new Date() },
  { id: 'p-2', type: 'project' as const, title: 'New project: ChainVault', detail: 'DeFi · 6m ago', timestamp: new Date() },
]

export default function LiveFeedWedge() {
  const { items: liveItems, isConnected } = useLiveFeed(10)

  // Use live items if available, otherwise show placeholders
  const displayItems = liveItems.length > 0 ? liveItems : placeholderItems

  return (
    <div className="w-full py-1 px-4 border-b-2 border-black bg-gray-200">
      <div className="mx-auto px-">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black">
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}
              title={isConnected ? 'Connected to blockchain' : 'Connecting...'}
            />
            Live
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className={`border-2 border-black p-1 text-xs font-medium transition-all duration-300 ${
                    item.type === 'project' ? 'bg-yellow-100' : 'bg-white'
                  } ${item.id.startsWith('b-0x') || item.id.startsWith('b-tx') ? 'animate-[pulse_1s_ease-in-out_2]' : ''}`}
                >
                  <div className="text-black">{item.title}</div>
                  <div className="text-muted">{item.detail}</div>
                </div>
              ))}
              {displayItems.length === 0 && <div className="text-xs text-muted italic">Waiting for activity...</div>}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <img src="/wecoop_loading.gif" alt="Live" className="h-5 w-5 object-contain" />
            <span>Live feed</span>
          </div>
        </div>
      </div>
    </div>
  )
}
