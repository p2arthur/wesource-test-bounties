import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import type { TransactionSigner } from 'algosdk'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

export interface AssetHolding {
  assetId: bigint
  amount: bigint
  isFrozen: boolean
  name?: string
  unitName?: string
  decimals?: number
}

export interface AccountInfo {
  address: string
  balance: bigint // microAlgos
  minBalance: bigint // microAlgos
  assets: AssetHolding[]
}

/**
 * Creates an AlgorandClient from environment configuration
 */
function getAlgorandClient(): AlgorandClient {
  const algodConfig = getAlgodConfigFromViteEnvironment()
  return AlgorandClient.fromConfig({
    algodConfig: {
      server: algodConfig.server,
      port: algodConfig.port,
      token: algodConfig.token as string,
    },
  })
}

/**
 * Fetches account information including ALGO balance and ASA holdings
 */
export async function getAccountInfo(address: string): Promise<AccountInfo> {
  const algorand = getAlgorandClient()
  const accountInfo = await algorand.account.getInformation(address)

  // Get asset details for each holding
  const assets: AssetHolding[] = []

  if (accountInfo.assets) {
    for (const asset of accountInfo.assets) {
      try {
        const assetInfo = await algorand.client.algod.getAssetByID(Number(asset.assetId)).do()
        assets.push({
          assetId: asset.assetId,
          amount: asset.amount,
          isFrozen: asset.isFrozen,
          name: assetInfo.params.name,
          unitName: assetInfo.params.unitName,
          decimals: assetInfo.params.decimals,
        })
      } catch {
        // Asset info not available, add with basic info
        assets.push({
          assetId: asset.assetId,
          amount: asset.amount,
          isFrozen: asset.isFrozen,
        })
      }
    }
  }

  return {
    address,
    balance: accountInfo.balance.microAlgo,
    minBalance: accountInfo.minBalance.microAlgo,
    assets,
  }
}

export interface TransferAlgoParams {
  senderAddress: string
  receiverAddress: string
  amountAlgo: number
  signer: TransactionSigner
  note?: string
}

export interface TransferAssetParams {
  senderAddress: string
  receiverAddress: string
  assetId: bigint
  amount: bigint
  signer: TransactionSigner
  note?: string
}

export interface OptInAssetParams {
  address: string
  assetId: bigint
  signer: TransactionSigner
}

export interface TransactionResult {
  txId: string
  confirmedRound?: bigint
}

/**
 * Transfer ALGO to another address
 */
export async function transferAlgo(params: TransferAlgoParams): Promise<TransactionResult> {
  const { senderAddress, receiverAddress, amountAlgo, signer, note } = params

  if (amountAlgo <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  const algorand = getAlgorandClient()
  algorand.setSigner(senderAddress, signer)

  const result = await algorand.send.payment({
    sender: senderAddress,
    receiver: receiverAddress,
    amount: AlgoAmount.Algo(amountAlgo),
    note: note ? new TextEncoder().encode(note) : undefined,
  })

  return {
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound,
  }
}

/**
 * Transfer an ASA to another address
 */
export async function transferAsset(params: TransferAssetParams): Promise<TransactionResult> {
  const { senderAddress, receiverAddress, assetId, amount, signer, note } = params

  if (amount <= BigInt(0)) {
    throw new Error('Amount must be greater than 0')
  }

  const algorand = getAlgorandClient()
  algorand.setSigner(senderAddress, signer)

  const result = await algorand.send.assetTransfer({
    sender: senderAddress,
    receiver: receiverAddress,
    assetId: assetId,
    amount: amount,
    note: note ? new TextEncoder().encode(note) : undefined,
  })

  return {
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound,
  }
}

/**
 * Opt-in to an ASA (allows receiving the asset)
 */
export async function optInToAsset(params: OptInAssetParams): Promise<TransactionResult> {
  const { address, assetId, signer } = params

  const algorand = getAlgorandClient()
  algorand.setSigner(address, signer)

  const result = await algorand.send.assetOptIn({
    sender: address,
    assetId: assetId,
  })

  return {
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound,
  }
}

/**
 * Get information about an ASA
 */
export async function getAssetInfo(assetId: bigint): Promise<{
  name?: string
  unitName?: string
  decimals: number
  total: bigint
  creator: string
}> {
  const algorand = getAlgorandClient()
  const assetInfo = await algorand.client.algod.getAssetByID(Number(assetId)).do()

  return {
    name: assetInfo.params.name,
    unitName: assetInfo.params.unitName,
    decimals: assetInfo.params.decimals,
    total: BigInt(assetInfo.params.total),
    creator: assetInfo.params.creator,
  }
}

/**
 * Format asset amount with decimals
 */
export function formatAssetAmount(amount: bigint, decimals: number = 0): string {
  if (decimals === 0) {
    return amount.toString()
  }

  const divisor = BigInt(10 ** decimals)
  const wholePart = amount / divisor
  const fractionalPart = amount % divisor

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString()
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${wholePart}.${fractionalStr}`
}

/**
 * Parse asset amount from string to bigint with decimals
 */
export function parseAssetAmount(amountStr: string, decimals: number = 0): bigint {
  const parts = amountStr.split('.')
  const wholePart = BigInt(parts[0] || '0')

  if (decimals === 0 || parts.length === 1) {
    return wholePart * BigInt(10 ** decimals)
  }

  const fractionalStr = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals)
  const fractionalPart = BigInt(fractionalStr)

  return wholePart * BigInt(10 ** decimals) + fractionalPart
}
