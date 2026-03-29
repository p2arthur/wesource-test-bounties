import { FormEvent, useEffect, useRef, useState } from 'react'
import { FiZap } from 'react-icons/fi'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Issue } from '../interfaces/entities'
import { X402PaymentRequirements } from '../services/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import LoadingPair from './LoadingPair'
import Modal from './Modal'
import Tooltip from './Tooltip'

type SubmitStep = 'idle' | 'blockchain' | 'x402-preview' | 'server' | 'complete'

interface CreateBountyModalProps {
  issue: Issue | null
  repoOwner: string
  repoName: string
  projectName: string
  onClose: () => void
  onInitBounty: (
    issueNumber: number,
    amount: number,
    creatorWallet: string,
    repoOwner: string,
    repoName: string,
  ) => Promise<X402PaymentRequirements | null>
  onConfirmPayment: (issueNumber: number, amount: number, creatorWallet: string, repoOwner: string, repoName: string) => Promise<void>
}

export default function CreateBountyModal({
  issue,
  repoOwner,
  repoName,
  projectName,
  onClose,
  onInitBounty,
  onConfirmPayment,
}: CreateBountyModalProps) {
  const { activeAddress } = useUnifiedWallet()
  const [amount, setAmount] = useState<string>('')
  const [creatorWallet, setCreatorWallet] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStep, setSubmitStep] = useState<SubmitStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [x402Requirements, setX402Requirements] = useState<X402PaymentRequirements | null>(null)
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
    setSubmitStep('blockchain')
    try {
      console.log('Submitting bounty with:', { issueNumber: issue, algoAmount, creatorWallet, repoOwner, repoName })

      const requirements = await onInitBounty(issue.number, algoAmount, creatorWallet.trim(), repoOwner, repoName)

      if (requirements) {
        setX402Requirements(requirements)
        setSubmitStep('x402-preview')
        setIsSubmitting(false)
      } else {
        setSubmitStep('complete')
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bounty')
      setSubmitStep('idle')
      setIsSubmitting(false)
    }
  }

  const handleConfirmX402 = async () => {
    setError(null)
    setIsSubmitting(true)
    setSubmitStep('server')
    try {
      await onConfirmPayment(issue.number, parseFloat(amount), creatorWallet.trim(), repoOwner, repoName)
      setSubmitStep('complete')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setSubmitStep('x402-preview')
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
      icon={<FiZap className="w-4 h-4 text-accent" />}
    >
      {/* Issue Info */}
      <div className="rounded-md border border-border-default bg-bg-base p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="font-medium text-text-secondary">{projectName}</span>
          <span>/</span>
          <span>{repoName}</span>
          <span className="ml-auto">#{issue.number}</span>
        </div>
        <h4 className="font-semibold text-text-primary text-sm">{issue.title}</h4>
        <div className="flex items-center gap-2">
          <Badge variant={issue.state === 'open' ? 'success' : 'secondary'}>
            {issue.state}
          </Badge>
          <a href={issue.htmlUrl} target="_blank" rel="noreferrer" className="text-xs text-accent hover:text-accent-hover transition-colors">
            View on GitHub →
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-primary">Bounty Amount (ALGO)</label>
            <Tooltip text="This amount will be locked in the smart contract until the bounty is completed and claimed." />
          </div>
          <div className="relative">
            <Input
              type="number"
              step="0.001"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              disabled={isSubmitting || submitStep === 'x402-preview'}
              className="pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium">ALGO</span>
          </div>
          <p className="text-xs text-text-muted">Funds will be deposited to the smart contract</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-primary">Creator Wallet</label>
            <Tooltip text="Used to associate the bounty on-chain later." />
          </div>
          <Input
            type="text"
            required
            value={creatorWallet}
            onChange={(e) => setCreatorWallet(e.target.value)}
            placeholder="0x1234...abcd"
            disabled={true}
            className="font-mono text-xs opacity-70"
          />
        </div>

        {/* x402 Payment Preview */}
        {submitStep === 'x402-preview' && x402Requirements && (
          <div className="rounded-md border border-info/40 bg-info/10 p-4 space-y-3">
            <h4 className="font-semibold text-text-primary text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-info animate-pulse" />
              x402 Payment Required
            </h4>
            <p className="text-sm text-text-secondary">
              The server requires a USDC micropayment to register this bounty. Review and confirm to sign.
            </p>
            {x402Requirements.accepts.length > 0 ? (
              <div className="space-y-2">
                {x402Requirements.accepts.map((accept, idx) => (
                  <div key={idx} className="rounded-sm border border-border-default bg-bg-elevated p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Price:</span>
                      <span className="font-bold text-text-primary">{accept.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Network:</span>
                      <span className="font-mono text-xs text-text-secondary">
                        {accept.network.startsWith('algorand:') ? 'Algorand TestNet' : accept.network}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Pay To:</span>
                      <span className="font-mono text-xs text-text-secondary" title={accept.payTo}>
                        {accept.payTo.length > 16 ? `${accept.payTo.slice(0, 8)}...${accept.payTo.slice(-8)}` : accept.payTo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Scheme:</span>
                      <span className="text-text-secondary">{accept.scheme}</span>
                    </div>
                    {accept.description && (
                      <div className="pt-1 border-t border-border-default">
                        <span className="text-text-muted text-xs">{accept.description}</span>
                      </div>
                    )}
                    {accept.maxAmountRequired && (
                      <div className="flex justify-between">
                        <span className="text-text-muted">Max Amount:</span>
                        <span className="font-mono text-xs text-text-secondary">{accept.maxAmountRequired}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic">Payment requirements could not be parsed. The payment will still proceed.</p>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer text-text-muted hover:text-text-secondary transition-colors">View raw x402 header</summary>
              <pre className="mt-2 p-2 bg-bg-base border border-border-default rounded-sm overflow-x-auto text-xs text-text-secondary whitespace-pre-wrap break-all">
                {JSON.stringify(x402Requirements, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {submitStep === 'x402-preview' ? (
            <Button type="button" className="flex-1" onClick={handleConfirmX402} disabled={isSubmitting}>
              {isSubmitting ? 'Signing...' : 'Confirm & Pay'}
            </Button>
          ) : (
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Bounty'}
            </Button>
          )}
        </div>

        {isSubmitting && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg-base ${submitStep === 'blockchain' ? 'bg-warning animate-pulse' : 'bg-success'}`}>
                1
              </div>
              <span className="text-sm font-medium text-text-primary">
                {submitStep === 'blockchain' ? 'Signing & submitting to blockchain...' : 'Blockchain transaction submitted'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg-base ${submitStep === 'server' ? 'bg-warning animate-pulse' : submitStep === 'complete' ? 'bg-success' : 'bg-bg-hover'}`}>
                2
              </div>
              <span className={`text-sm ${submitStep === 'blockchain' ? 'text-text-muted' : 'font-medium text-text-primary'}`}>
                {submitStep === 'server' ? 'Signing x402 payment & registering bounty...' : 'x402 payment & server registration'}
              </span>
            </div>
            <LoadingPair size="md" label="Please confirm in your wallet..." />
          </div>
        )}
      </form>
    </Modal>
  )
}
