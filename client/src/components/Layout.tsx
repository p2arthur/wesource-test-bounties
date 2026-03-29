import { ReactNode } from 'react'
import HeaderBar from './HeaderBar'
import Footer from './Footer'
import PixelRain from './PixelRain'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col bg-bg-base text-text-primary">
      <PixelRain />
      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 1 }}>
        <HeaderBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
