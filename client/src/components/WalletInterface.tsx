import { FormEvent, useCallback, useEffect, useState } from 'react'
import { FiRefreshCw, FiSend, FiPlus } from 'react-icons/fi'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'
import {
  AccountInfo,
  AssetHolding,
  formatAssetAmount,
  getAccountInfo,
  getAssetInfo,
  optInToAsset,
  parseAssetAmount,
  transferAlgo,
  transferAsset,
} from '../services/walletService'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import LoadingPair from './LoadingPair'
import Modal from './Modal'

type ModalType = 'none' | 'transfer-algo' | 'transfer-asset' | 'opt-in'

interface TransferState {
  receiver: string
  amount: string
  note: string
}

export default function WalletInterface() {
  const { activeAddress, signer, isConnected } = useUnifiedWallet()
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalType, setModalType] = useState<ModalType>('none')
  const [selectedAsset, setSelectedAsset] = useState<AssetHolding | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [transferState, setTransferState] = useState<TransferState>({
    receiver: '',
    amount: '',
    note: '',
  })

  const [optInAssetId, setOptInAssetId] = useState('')
  const [optInAssetInfo, setOptInAssetInfo] = useState<{ name?: string; unitName?: string } | null>(null)
  const [loadingAssetInfo, setLoadingAssetInfo] = useState(false)

  const loadAccountInfo = useCallback(async () => {
    if (!activeAddress) return
    setLoading(true)
    setError(null)
    try {
      const info = await getAccountInfo(activeAddress)
      setAccountInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account info')
    } finally {
      setLoading(false)
    }
  }, [activeAddress])

  useEffect(() => {
    if (activeAddress) {
      loadAccountInfo()
    } else {
      setAccountInfo(null)
    }
  }, [activeAddress, loadAccountInfo])

  useEffect(() => {
    const lookupAsset = async () => {
      if (!optInAssetId || isNaN(Number(optInAssetId))) {
        setOptInAssetInfo(null)
        return
      }
      setLoadingAssetInfo(true)
      try {
        const info = await getAssetInfo(BigInt(optInAssetId))
        setOptInAssetInfo({ name: info.name, unitName: info.unitName })
      } catch {
        setOptInAssetInfo(null)
      } finally {
        setLoadingAssetInfo(false)
      }
    }
    const timeout = setTimeout(lookupAsset, 500)
    return () => clearTimeout(timeout)
  }, [optInAssetId])

  const resetModal = () => {
    setModalType('none')
    setSelectedAsset(null)
    setTransferState({ receiver: '', amount: '', note: '' })
    setOptInAssetId('')
    setOptInAssetInfo(null)
    setSubmitError(null)
    setSuccessMessage(null)
  }

  const handleTransferAlgo = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeAddress || !signer) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await transferAlgo({
        senderAddress: activeAddress,
        receiverAddress: transferState.receiver.trim(),
        amountAlgo: parseFloat(transferState.amount),
        signer,
        note: transferState.note || undefined,
      })
      setSuccessMessage(`Transfer successful! TX: ${result.txId.slice(0, 8)}...`)
      await loadAccountInfo()
      setTimeout(resetModal, 2000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTransferAsset = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeAddress || !signer || !selectedAsset) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const amount = parseAssetAmount(transferState.amount, selectedAsset.decimals || 0)
      const result = await transferAsset({
        senderAddress: activeAddress,
        receiverAddress: transferState.receiver.trim(),
        assetId: selectedAsset.assetId,
        amount,
        signer,
        note: transferState.note || undefined,
      })
      setSuccessMessage(`Transfer successful! TX: ${result.txId.slice(0, 8)}...`)
      await loadAccountInfo()
      setTimeout(resetModal, 2000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Transfer failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOptIn = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeAddress || !signer) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await optInToAsset({
        address: activeAddress,
        assetId: BigInt(optInAssetId),
        signer,
      })
      setSuccessMessage(`Opted in successfully! TX: ${result.txId.slice(0, 8)}...`)
      await loadAccountInfo()
      setTimeout(resetModal, 2000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Opt-in failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <Card className="p-6 text-center space-y-2">
        <div className="text-text-primary font-medium">Wallet Not Connected</div>
        <p className="text-sm text-text-secondary">Connect your wallet to view your assets and make transfers.</p>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingPair size="md" label="Loading wallet..." />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 space-y-4">
        <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-danger text-sm">{error}</div>
        <Button variant="secondary" onClick={loadAccountInfo}>Retry</Button>
      </Card>
    )
  }

  const algoBalance = accountInfo ? Number(accountInfo.balance) / 1_000_000 : 0
  const availableBalance = accountInfo ? Number(accountInfo.balance - accountInfo.minBalance) / 1_000_000 : 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Wallet</CardTitle>
            <Button variant="ghost" size="icon" onClick={loadAccountInfo} title="Refresh">
              <FiRefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ALGO Balance */}
          <div className="rounded-md border border-border-default bg-bg-elevated p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">ALGO Balance</span>
              <span className="text-2xl font-bold text-text-primary font-mono">{algoBalance.toFixed(4)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Available</span>
              <span className="text-text-secondary font-mono">{availableBalance.toFixed(4)} ALGO</span>
            </div>
            <Button className="w-full gap-2" onClick={() => setModalType('transfer-algo')} disabled={availableBalance <= 0}>
              <FiSend className="w-4 h-4" />
              Send ALGO
            </Button>
          </div>

          {/* Assets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Assets</h3>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setModalType('opt-in')}>
                <FiPlus className="w-3.5 h-3.5" />
                Opt-In
              </Button>
            </div>

            {accountInfo?.assets && accountInfo.assets.length > 0 ? (
              <div className="space-y-2">
                {accountInfo.assets.map((asset) => (
                  <div key={asset.assetId.toString()} className="rounded-md border border-border-default bg-bg-elevated p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {asset.name || `ASA #${asset.assetId}`}
                        {asset.unitName && <Badge variant="secondary" className="ml-2 text-[10px]">{asset.unitName}</Badge>}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">ID: {asset.assetId.toString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-text-primary text-sm font-mono">{formatAssetAmount(asset.amount, asset.decimals)}</div>
                      <button
                        onClick={() => { setSelectedAsset(asset); setModalType('transfer-asset') }}
                        className="text-xs text-accent hover:text-accent-hover transition-colors mt-1"
                        disabled={asset.amount <= BigInt(0) || asset.isFrozen}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border-default p-4 text-center text-sm text-text-muted">
                No assets found. Opt-in to an asset to receive it.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transfer ALGO Modal */}
      <Modal open={modalType === 'transfer-algo'} onClose={resetModal} title="Send ALGO" panelClassName="max-w-md" icon={<FiSend className="w-4 h-4 text-accent" />}>
        <form onSubmit={handleTransferAlgo} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Recipient Address *</label>
            <Input type="text" required value={transferState.receiver} onChange={(e) => setTransferState((s) => ({ ...s, receiver: e.target.value }))} placeholder="ALGO address..." disabled={isSubmitting} className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Amount (ALGO) *</label>
            <Input type="number" step="0.0001" min="0" max={availableBalance} required value={transferState.amount} onChange={(e) => setTransferState((s) => ({ ...s, amount: e.target.value }))} placeholder="0.0" disabled={isSubmitting} />
            <p className="text-xs text-text-muted">Available: {availableBalance.toFixed(4)} ALGO</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Note (optional)</label>
            <Input type="text" value={transferState.note} onChange={(e) => setTransferState((s) => ({ ...s, note: e.target.value }))} placeholder="Transaction note..." disabled={isSubmitting} maxLength={1000} />
          </div>
          {submitError && <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-danger text-sm">{submitError}</div>}
          {successMessage && <div className="rounded-md border border-success/40 bg-success/10 p-3 text-success text-sm">{successMessage}</div>}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={resetModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send'}</Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Asset Modal */}
      <Modal open={modalType === 'transfer-asset'} onClose={resetModal} title={`Send ${selectedAsset?.name || selectedAsset?.unitName || 'Asset'}`} panelClassName="max-w-md" icon={<FiSend className="w-4 h-4 text-accent" />}>
        <form onSubmit={handleTransferAsset} className="space-y-4">
          <div className="rounded-md border border-border-default bg-bg-base p-3 text-sm">
            <div className="font-medium text-text-primary">{selectedAsset?.name || `ASA #${selectedAsset?.assetId}`}</div>
            <div className="text-text-secondary text-xs mt-0.5">Balance: {selectedAsset && formatAssetAmount(selectedAsset.amount, selectedAsset.decimals)} {selectedAsset?.unitName}</div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Recipient Address *</label>
            <Input type="text" required value={transferState.receiver} onChange={(e) => setTransferState((s) => ({ ...s, receiver: e.target.value }))} placeholder="ALGO address..." disabled={isSubmitting} className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Amount *</label>
            <Input type="text" required value={transferState.amount} onChange={(e) => setTransferState((s) => ({ ...s, amount: e.target.value }))} placeholder="0" disabled={isSubmitting} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Note (optional)</label>
            <Input type="text" value={transferState.note} onChange={(e) => setTransferState((s) => ({ ...s, note: e.target.value }))} placeholder="Transaction note..." disabled={isSubmitting} maxLength={1000} />
          </div>
          {submitError && <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-danger text-sm">{submitError}</div>}
          {successMessage && <div className="rounded-md border border-success/40 bg-success/10 p-3 text-success text-sm">{successMessage}</div>}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={resetModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send'}</Button>
          </div>
        </form>
      </Modal>

      {/* Opt-In Modal */}
      <Modal open={modalType === 'opt-in'} onClose={resetModal} title="Opt-In to Asset" panelClassName="max-w-md" icon={<FiPlus className="w-4 h-4 text-accent" />}>
        <form onSubmit={handleOptIn} className="space-y-4">
          <p className="text-sm text-text-secondary">
            Opt-in to an Algorand Standard Asset (ASA) to receive it. This requires a small ALGO balance increase for the minimum balance requirement.
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Asset ID *</label>
            <Input type="number" required min="1" value={optInAssetId} onChange={(e) => setOptInAssetId(e.target.value)} placeholder="Enter ASA ID..." disabled={isSubmitting} />
          </div>
          {loadingAssetInfo && <p className="text-sm text-text-secondary">Looking up asset...</p>}
          {optInAssetInfo && (
            <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
              <div className="font-medium text-success">Asset Found</div>
              <div className="text-success/80 text-xs mt-0.5">{optInAssetInfo.name || 'Unnamed Asset'}{optInAssetInfo.unitName && ` (${optInAssetInfo.unitName})`}</div>
            </div>
          )}
          {optInAssetId && !loadingAssetInfo && !optInAssetInfo && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">Asset not found or invalid ID</div>
          )}
          {submitError && <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-danger text-sm">{submitError}</div>}
          {successMessage && <div className="rounded-md border border-success/40 bg-success/10 p-3 text-success text-sm">{successMessage}</div>}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={resetModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || !optInAssetId || (!loadingAssetInfo && !optInAssetInfo)}>{isSubmitting ? 'Opting In...' : 'Opt-In'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
