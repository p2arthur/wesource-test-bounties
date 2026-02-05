const feedItems = [
  { id: 'p-1', type: 'project', title: 'New project: AlgoTools', detail: 'Tooling · just now' },
  { id: 'b-1', type: 'bounty', title: 'New bounty: Fix wallet sync', detail: '40 ALGO · 2m ago' },
  { id: 'p-2', type: 'project', title: 'New project: ChainVault', detail: 'DeFi · 6m ago' },
]

export default function LiveFeedWedge() {
  return (
    <div className="w-full py-1 px-4 border-b-2 border-black bg-gray-200">
      <div className="mx-auto px-">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {feedItems.map((item) => (
                <div
                  key={item.id}
                  className={`border-2 border-black p-1 text-xs font-medium ${item.type === 'project' ? 'bg-yellow-100' : 'bg-white'}`}
                >
                  <div className="text-black">{item.title}</div>
                  <div className="text-muted">{item.detail}</div>
                </div>
              ))}
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
