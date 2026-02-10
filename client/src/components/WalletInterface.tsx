import { FormEvent, useCallback, useEffect, useState } from 'react'
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

  // Transfer form state
  const [transferState, setTransferState] = useState<TransferState>({
    receiver: '',
    amount: '',
    note: '',
  })

  // Opt-in form state
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

  // Lookup asset info when opt-in asset ID changes
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
      <div className="card p-6 text-center space-y-2">
        <div className="text-black font-medium">Wallet Not Connected</div>
        <p className="text-sm text-muted">Connect your wallet to view your assets and make transfers.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card p-6">
        <LoadingPair size="md" label="Loading wallet..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 space-y-4">
        <div className="p-3 border-2 border-black bg-red-50 text-red-800 text-sm">{error}</div>
        <button onClick={loadAccountInfo} className="btn-secondary">
          Retry
        </button>
      </div>
    )
  }

  const algoBalance = accountInfo ? Number(accountInfo.balance) / 1_000_000 : 0
  const availableBalance = accountInfo ? Number(accountInfo.balance - accountInfo.minBalance) / 1_000_000 : 0

  return (
    <>
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-black">Wallet</h2>
          <button onClick={loadAccountInfo} className="text-sm text-muted hover:text-black" title="Refresh">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* ALGO Balance */}
        <div className="border-2 border-black p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">ALGO Balance</span>
            <span className="text-2xl font-bold text-black">{algoBalance.toFixed(4)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Available</span>
            <span className="text-black">{availableBalance.toFixed(4)} ALGO</span>
          </div>
          <button onClick={() => setModalType('transfer-algo')} className="btn-primary w-full mt-2" disabled={availableBalance <= 0}>
            Send ALGO
          </button>
        </div>

        {/* Assets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-black">Assets</h3>
            <button onClick={() => setModalType('opt-in')} className="btn-secondary text-sm py-1 px-3">
              + Opt-In
            </button>
          </div>

          {accountInfo?.assets && accountInfo.assets.length > 0 ? (
            <div className="space-y-2">
              {accountInfo.assets.map((asset) => (
                <div key={asset.assetId.toString()} className="border-2 border-black p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-black">
                      {asset.name || `ASA #${asset.assetId}`}
                      {asset.unitName && <span className="text-muted ml-1">({asset.unitName})</span>}
                    </div>
                    <div className="text-sm text-muted">ID: {asset.assetId.toString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-black">{formatAssetAmount(asset.amount, asset.decimals)}</div>
                    <button
                      onClick={() => {
                        setSelectedAsset(asset)
                        setModalType('transfer-asset')
                      }}
                      className="text-xs text-black underline hover:no-underline mt-1"
                      disabled={asset.amount <= BigInt(0) || asset.isFrozen}
                    >
                      Send
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 p-4 text-center text-sm text-muted">
              No assets found. Opt-in to an asset to receive it.
            </div>
          )}
        </div>
      </div>

      {/* Transfer ALGO Modal */}
      <Modal
        open={modalType === 'transfer-algo'}
        onClose={resetModal}
        title="Send ALGO"
        panelClassName="max-w-md"
        icon={
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        }
      >
        <form onSubmit={handleTransferAlgo} className="space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-black">Recipient Address *</span>
            <input
              type="text"
              required
              className="input-field"
              value={transferState.receiver}
              onChange={(e) => setTransferState((s) => ({ ...s, receiver: e.target.value }))}
              placeholder="ALGO address..."
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-black">Amount (ALGO) *</span>
            <input
              type="number"
              step="0.0001"
              min="0"
              max={availableBalance}
              required
              className="input-field"
              value={transferState.amount}
              onChange={(e) => setTransferState((s) => ({ ...s, amount: e.target.value }))}
              placeholder="0.0"
              disabled={isSubmitting}
            />
            <span className="text-xs text-muted">Available: {availableBalance.toFixed(4)} ALGO</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-black">Note (optional)</span>
            <input
              type="text"
              className="input-field"
              value={transferState.note}
              onChange={(e) => setTransferState((s) => ({ ...s, note: e.target.value }))}
              placeholder="Transaction note..."
              disabled={isSubmitting}
              maxLength={1000}
            />
          </label>

          {submitError && <div className="p-3 border-2 border-black bg-red-50 text-red-800 text-sm">{submitError}</div>}
          {successMessage && <div className="p-3 border-2 border-black bg-green-50 text-green-800 text-sm">{successMessage}</div>}

          <div className="flex gap-3">
            <button type="button" onClick={resetModal} className="btn-secondary flex-1" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Asset Modal */}
      <Modal
        open={modalType === 'transfer-asset'}
        onClose={resetModal}
        title={`Send ${selectedAsset?.name || selectedAsset?.unitName || 'Asset'}`}
        panelClassName="max-w-md"
        icon={
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        }
      >
        <form onSubmit={handleTransferAsset} className="space-y-4">
          <div className="p-3 border-2 border-black bg-gray-50 text-sm">
            <div className="font-medium">{selectedAsset?.name || `ASA #${selectedAsset?.assetId}`}</div>
            <div className="text-muted">
              Balance: {selectedAsset && formatAssetAmount(selectedAsset.amount, selectedAsset.decimals)} {selectedAsset?.unitName}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-black">Recipient Address *</span>
            <input
              type="text"
              required
              className="input-field"
              value={transferState.receiver}
              onChange={(e) => setTransferState((s) => ({ ...s, receiver: e.target.value }))}
              placeholder="ALGO address..."
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-black">Amount *</span>
            <input
              type="text"
              required
              className="input-field"
              value={transferState.amount}
              onChange={(e) => setTransferState((s) => ({ ...s, amount: e.target.value }))}
              placeholder="0"
              disabled={isSubmitting}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-black">Note (optional)</span>
            <input
              type="text"
              className="input-field"
              value={transferState.note}
              onChange={(e) => setTransferState((s) => ({ ...s, note: e.target.value }))}
              placeholder="Transaction note..."
              disabled={isSubmitting}
              maxLength={1000}
            />
          </label>

          {submitError && <div className="p-3 border-2 border-black bg-red-50 text-red-800 text-sm">{submitError}</div>}
          {successMessage && <div className="p-3 border-2 border-black bg-green-50 text-green-800 text-sm">{successMessage}</div>}

          <div className="flex gap-3">
            <button type="button" onClick={resetModal} className="btn-secondary flex-1" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Opt-In Modal */}
      <Modal
        open={modalType === 'opt-in'}
        onClose={resetModal}
        title="Opt-In to Asset"
        panelClassName="max-w-md"
        icon={
          <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        }
      >
        <form onSubmit={handleOptIn} className="space-y-4">
          <p className="text-sm text-muted">
            Opt-in to an Algorand Standard Asset (ASA) to be able to receive it. This requires a small ALGO balance increase for the minimum
            balance requirement.
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-black">Asset ID *</span>
            <input
              type="number"
              required
              min="1"
              className="input-field"
              value={optInAssetId}
              onChange={(e) => setOptInAssetId(e.target.value)}
              placeholder="Enter ASA ID..."
              disabled={isSubmitting}
            />
          </label>

          {loadingAssetInfo && <div className="text-sm text-muted">Looking up asset...</div>}

          {optInAssetInfo && (
            <div className="p-3 border-2 border-black bg-green-50 text-sm">
              <div className="font-medium text-green-800">Asset Found</div>
              <div className="text-green-700">
                {optInAssetInfo.name || 'Unnamed Asset'}
                {optInAssetInfo.unitName && ` (${optInAssetInfo.unitName})`}
              </div>
            </div>
          )}

          {optInAssetId && !loadingAssetInfo && !optInAssetInfo && (
            <div className="p-3 border-2 border-black bg-yellow-50 text-sm text-yellow-800">Asset not found or invalid ID</div>
          )}

          {submitError && <div className="p-3 border-2 border-black bg-red-50 text-red-800 text-sm">{submitError}</div>}
          {successMessage && <div className="p-3 border-2 border-black bg-green-50 text-green-800 text-sm">{successMessage}</div>}

          <div className="flex gap-3">
            <button type="button" onClick={resetModal} className="btn-secondary flex-1" disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={isSubmitting || !optInAssetId || (!loadingAssetInfo && !optInAssetInfo)}
            >
              {isSubmitting ? 'Opting In...' : 'Opt-In'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
