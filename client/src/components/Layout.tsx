import { ReactNode } from 'react'
import HeaderBar from './HeaderBar'
import LiveFeedWedge from './LiveFeedWedge'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <HeaderBar />
      <main className="flex-1">{children}</main>
    </>
  )
}
