import { useState } from 'react'
import { useSnackbar } from 'notistack'
import { useAuth } from '../hooks/useAuth'
import { linkWallet } from '../services/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog'

interface WalletLinkModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  bountyId: number
}

export default function WalletLinkModal({ isOpen, onClose, onSuccess, bountyId }: WalletLinkModalProps) {
  const { enqueueSnackbar } = useSnackbar()
  const { getAuth } = useAuth()
  const [isLinking, setIsLinking] = useState(false)
  const [githubUsername, setGithubUsername] = useState('')
  const [githubId, setGithubId] = useState('')

  const handleLinkWallet = async () => {
    if (!githubUsername || !githubId) {
      enqueueSnackbar('Please enter GitHub username and ID', { variant: 'error' })
      return
    }

    setIsLinking(true)
    try {
      const headers = await getAuth()
      await linkWallet(githubUsername, parseInt(githubId, 10), headers)
      enqueueSnackbar('Wallet linked successfully!', { variant: 'success' })
      onSuccess()
      onClose()
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to link wallet', { variant: 'error' })
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Wallet to Claim Bounty</DialogTitle>
          <DialogDescription>
            Link your GitHub account to verify you're the issue solver and claim this bounty.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">GitHub Username</label>
            <Input
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              placeholder="octocat"
              disabled={isLinking}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">GitHub User ID</label>
            <Input
              type="number"
              value={githubId}
              onChange={(e) => setGithubId(e.target.value)}
              placeholder="123456"
              disabled={isLinking}
            />
            <p className="text-xs text-text-muted">Find your GitHub ID at github.com/settings/profile</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLinking}>
            Cancel
          </Button>
          <Button
            onClick={handleLinkWallet}
            disabled={isLinking || !githubUsername || !githubId}
          >
            {isLinking ? 'Linking...' : 'Link Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
