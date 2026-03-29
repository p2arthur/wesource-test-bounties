import LiveFeedWedge from './LiveFeedWedge'
import WalletMenu from './WalletMenu'
import NotificationBell from './NotificationBell'

export default function HeaderBar() {
  return (
    <header className="sticky top-0 z-50 flex flex-col items-center justify-between bg-bg-surface border-b border-border-default">
      <div className="w-full flex justify-between items-center px-4 py-2">
        <div className="flex items-center gap-3">
          <img src="/wecoop_loading.gif" alt="WeSource" className="h-10 w-10" />
          <h1 className="text-xl font-bold text-accent tracking-tight">WeSource</h1>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <WalletMenu />
        </div>
      </div>
      <LiveFeedWedge />
    </header>
  )
}
