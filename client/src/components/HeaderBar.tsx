import LiveFeedWedge from './LiveFeedWedge'
import WalletMenu from './WalletMenu'

export default function HeaderBar() {
  return (
    <header className="flex flex-col items-center justify-between sticky top-0 z-50 bg-white">
      <div className="w-full flex justify-between px-4 border-b-4 border-black">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/wecoop_loading.gif" alt="Loading" className="h-16 w-16" />
            <h1 className="text-2xl font-bold text-black">WeSource</h1>
          </div>
        </div>

        <WalletMenu />
      </div>
      <LiveFeedWedge />
    </header>
  )
}
