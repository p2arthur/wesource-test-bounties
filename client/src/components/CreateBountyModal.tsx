import { FormEvent, useEffect, useRef, useState } from 'react'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Issue } from '../interfaces/entities'
import LoadingPair from './LoadingPair'
import Modal from './Modal'
import Tooltip from './Tooltip'

interface CreateBountyModalProps {
  issue: Issue | null
  repoName: string
  projectName: string
  onClose: () => void
  onSubmit: (issueNumber: number, amount: number, creatorWallet: string) => Promise<void>
}

export default function CreateBountyModal({ issue, repoName, projectName, onClose, onSubmit }: CreateBountyModalProps) {
  const { activeAddress } = useUnifiedWallet()
  const [amount, setAmount] = useState<string>('')
  const [creatorWallet, setCreatorWallet] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastAutoFilled = useRef<string>('')

  if (!issue) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const algoAmount = parseFloat(amount)
    if (isNaN(algoAmount) || algoAmount <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }

    if (!creatorWallet.trim()) {
      setError('Please enter a creator wallet address')
      return
    }

    setIsSubmitting(true)
    try {
      console.log('Submitting bounty with:', { issueNumber: issue, algoAmount, creatorWallet })

      await onSubmit(issue.number, algoAmount, creatorWallet.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bounty')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!activeAddress) return
    if (!creatorWallet || creatorWallet === lastAutoFilled.current) {
      setCreatorWallet(activeAddress)
      lastAutoFilled.current = activeAddress
    }
  }, [activeAddress, creatorWallet])

  return (
    <Modal
      open={Boolean(issue)}
      onClose={onClose}
      title="Create Bounty"
      panelClassName="max-w-lg"
      iconWrapperClassName="bg-yellow-100"
      icon={
        <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
    >
      {/* Issue Info */}
      <div className="p-4 border-2 border-black bg-gray-50 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="font-medium">{projectName}</span>
          <span>/</span>
          <span>{repoName}</span>
          <span className="ml-auto">#{issue.number}</span>
        </div>
        <h4 className="font-bold text-black">{issue.title}</h4>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium border ${
              issue.state === 'open' ? 'border-green-600 text-green-600 bg-green-50' : 'border-purple-600 text-purple-600 bg-purple-50'
            }`}
          >
            {issue.state}
          </span>
          <a href={issue.htmlUrl} target="_blank" rel="noreferrer" className="text-xs text-black underline hover:no-underline">
            View on GitHub →
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-black">
            Bounty Amount (USDC)
            <Tooltip text="This amount will be locked in a smart contract until the bounty is completed.">
              <span className="ml-2 inline-flex h-4 w-4 items-center justify-center border border-black text-[10px]">?</span>
            </Tooltip>
          </span>
          <div className="flex flex-col">
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0"
                required
                className="input-field w-full pr-16"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                disabled={isSubmitting}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-medium">USDC</span>
            </div>
            <span className="text-green-500">You have 300 USDC to fund bounties</span>
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-black">
            Creator Wallet *
            <Tooltip text="Used to associate the bounty on-chain later.">
              <span className="ml-2 inline-flex h-4 w-4 items-center justify-center border border-black text-[10px]">?</span>
            </Tooltip>
          </span>
          <input
            type="text"
            required
            className="input-field w-full bg-gray-400"
            value={creatorWallet}
            onChange={(e) => setCreatorWallet(e.target.value)}
            placeholder="0x1234...abcd"
            disabled={true}
          />
        </label>

        {error && <div className="p-3 border-2 border-black text-sm bg-red-50 text-red-800">{error}</div>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Bounty'}
          </button>
        </div>

        {isSubmitting && (
          <div className="border-2 border-black bg-yellow-50 py-3">
            <LoadingPair size="md" label="Processing bounty..." />
          </div>
        )}
      </form>
    </Modal>
  )
}
