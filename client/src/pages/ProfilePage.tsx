import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiUser } from 'react-icons/fi'
import WalletInterface from '../components/WalletInterface'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Card, CardContent } from '../components/ui/card'
import { ellipseAddress } from '../utils/ellipseAddress'

export default function ProfilePage() {
  const { walletAddress } = useParams<{ walletAddress: string }>()
  const githubHandle = localStorage.getItem('wesource_github_handle') || ''

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm">
          <FiArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {githubHandle ? (
                  <AvatarImage src={`https://github.com/${githubHandle}.png`} alt={githubHandle} />
                ) : null}
                <AvatarFallback>
                  <FiUser className="w-7 h-7 text-text-muted" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">
                  @{githubHandle || 'set-github'}
                </h1>
                <p className="text-sm text-text-secondary font-mono">
                  {walletAddress ? ellipseAddress(walletAddress) : 'Wallet not found'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t border-border-default pt-4 grid sm:grid-cols-3 gap-3">
              {[
                { label: 'Projects', value: 0 },
                { label: 'Bounties', value: 0 },
                { label: 'Wins', value: 0 },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-md border border-border-default bg-bg-elevated p-3 text-center">
                  <div className="text-2xl font-bold text-accent">{value}</div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <div className="text-text-primary font-medium">No activity yet</div>
            <p className="text-sm text-text-secondary">
              Once this wallet creates projects or completes bounties, they'll show up here.
            </p>
          </CardContent>
        </Card>

        {/* Wallet Interface */}
        <WalletInterface />
      </div>
    </div>
  )
}
