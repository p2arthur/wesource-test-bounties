import { FormEvent, useEffect, useRef, useState } from 'react'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import { Issue } from '../interfaces/entities'
import { X402PaymentRequirements } from '../services/api'
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
  /** Phase 1: on-chain creation + preflight to get x402 requirements */
  onInitBounty: (
    issueNumber: number,
    amount: number,
    creatorWallet: string,
    repoOwner: string,
    repoName: string,
  ) => Promise<X402PaymentRequirements | null>
  /** Phase 2: sign the x402 payment and complete server registration */
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

  /** Phase 1 — on-chain + preflight */
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
        // x402 payment required — show preview
        setX402Requirements(requirements)
        setSubmitStep('x402-preview')
        setIsSubmitting(false)
      } else {
        // No x402 middleware — bounty already created
        setSubmitStep('complete')
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bounty')
      setSubmitStep('idle')
      setIsSubmitting(false)
    }
  }

  /** Phase 2 — user confirmed x402 payment */
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
            Bounty Amount (ALGO)
            <Tooltip text="This amount will be locked in the smart contract until the bounty is completed and claimed.">
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
                placeholder="10"
                disabled={isSubmitting || submitStep === 'x402-preview'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-medium">ALGO</span>
            </div>
            <span className="text-xs text-muted mt-1">Funds will be deposited to the smart contract</span>
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

        {/* x402 Payment Preview */}
        {submitStep === 'x402-preview' && x402Requirements && (
          <div className="border-2 border-black bg-blue-50 p-4 space-y-3">
            <h4 className="font-bold text-black flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              x402 Payment Required
            </h4>
            <p className="text-sm text-gray-700">
              The server requires a USDC micropayment to register this bounty. Review the details below and confirm to sign.
            </p>
            {x402Requirements.accepts.length > 0 ? (
              <div className="space-y-2">
                {x402Requirements.accepts.map((accept, idx) => (
                  <div key={idx} className="border border-gray-300 bg-white p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Price:</span>
                      <span className="font-bold text-black">{accept.price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Network:</span>
                      <span className="font-mono text-xs text-black">
                        {accept.network.startsWith('algorand:') ? 'Algorand TestNet' : accept.network}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Pay To:</span>
                      <span className="font-mono text-xs text-black" title={accept.payTo}>
                        {accept.payTo.length > 16 ? `${accept.payTo.slice(0, 8)}...${accept.payTo.slice(-8)}` : accept.payTo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Scheme:</span>
                      <span className="text-black">{accept.scheme}</span>
                    </div>
                    {accept.description && (
                      <div className="pt-1 border-t border-gray-200">
                        <span className="text-muted">{accept.description}</span>
                      </div>
                    )}
                    {accept.maxAmountRequired && (
                      <div className="flex justify-between">
                        <span className="text-muted">Max Amount:</span>
                        <span className="font-mono text-xs text-black">{accept.maxAmountRequired}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted italic">Payment requirements could not be parsed. The payment will still proceed.</p>
            )}

            {/* Raw header for developer inspection */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted hover:text-black">View raw x402 header</summary>
              <pre className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded overflow-x-auto text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(x402Requirements, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {error && <div className="p-3 border-2 border-black text-sm bg-red-50 text-red-800">{error}</div>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3" disabled={isSubmitting}>
            Cancel
          </button>
          {submitStep === 'x402-preview' ? (
            <button
              type="button"
              onClick={handleConfirmX402}
              className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing...' : 'Confirm & Pay'}
            </button>
          ) : (
            <button
              type="submit"
              className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Bounty'}
            </button>
          )}
        </div>

        {isSubmitting && (
          <div className="border-2 border-black bg-yellow-50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  submitStep === 'blockchain' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                }`}
              >
                1
              </div>
              <span className="text-sm font-medium">
                {submitStep === 'blockchain' ? 'Signing & submitting to blockchain...' : 'Blockchain transaction submitted'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  submitStep === 'server' ? 'bg-yellow-400 animate-pulse' : submitStep === 'complete' ? 'bg-green-400' : 'bg-gray-300'
                }`}
              >
                2
              </div>
              <span className={`text-sm ${submitStep === 'blockchain' ? 'text-gray-400' : 'font-medium'}`}>
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
