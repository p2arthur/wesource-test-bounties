import { useSnackbar } from 'notistack'
import { useState } from 'react'
import LoadingPair from './LoadingPair'
import { useUnifiedWallet } from '../hooks/useUnifiedWallet'

interface TransactInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [receiverAddress, setReceiverAddress] = useState<string>('')
  const { isConnected } = useUnifiedWallet()

  const { enqueueSnackbar } = useSnackbar()

  const handleSubmitAlgo = async () => {
    setLoading(true)

    if (!isConnected) {
      enqueueSnackbar('Please connect your account first', { variant: 'warning' })
      return
    }

    try {
      enqueueSnackbar('Web3Auth connected, Algorand signer not configured yet', { variant: 'info' })
    } catch (e) {
      enqueueSnackbar('Failed to send transaction', { variant: 'error' })
    }

    setLoading(false)
  }

  if (!openModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={() => setModalState(false)} />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-black">Send Payment</h3>
            <button
              onClick={() => setModalState(false)}
              className="btn-secondary w-8 h-8 p-0 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-black">Receiver Address</label>
            <input
              type="text"
              data-test-id="receiver-address"
              placeholder="Enter wallet address"
              className="input-field w-full"
              value={receiverAddress}
              onChange={(e) => setReceiverAddress(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setModalState(false)}>
              Close
            </button>
            <button
              data-test-id="send-algo"
              className={`btn-primary flex-1 flex items-center justify-center gap-2 ${receiverAddress.length !== 58 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleSubmitAlgo}
              disabled={!isConnected || receiverAddress.length !== 58}
            >
              {loading ? (
                <LoadingPair size="sm" label="Sending..." />
              ) : (
                'Send 1 ALGO'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Transact
