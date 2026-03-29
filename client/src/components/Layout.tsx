import { ReactNode } from 'react'
import HeaderBar from './HeaderBar'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-primary">
      <HeaderBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
