import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import type { TransactionSigner } from 'algosdk'
import { SourceFactoryClient } from '../contracts/SourceFactoryClient'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

// The deployed SourceFactory App ID - this should come from env or config
const SOURCE_FACTORY_APP_ID = BigInt(import.meta.env.VITE_SOURCE_FACTORY_APP_ID || '0')

/**
 * Computes a deterministic bounty ID from repo info using a simple hash.
 * Uses the same canonical format as the server but produces a uint64.
 */
export function computeBountyId(repoOwner: string, repoName: string, issueNumber: number): bigint {
  const canonicalOwner = repoOwner.trim().toLowerCase()
  const canonicalRepo = repoName.trim().toLowerCase()
  const canonicalIssueNumber = Number(issueNumber)
  const canonical = `${canonicalOwner}|${canonicalRepo}|${canonicalIssueNumber}`

  // Simple hash to uint64 (djb2 algorithm variant)
  let hash = BigInt(5381)
  for (let i = 0; i < canonical.length; i++) {
    hash = ((hash << BigInt(5)) + hash) ^ BigInt(canonical.charCodeAt(i))
    hash = hash & BigInt('0xFFFFFFFFFFFFFFFF') // Keep as 64-bit
  }
  return hash
}

/**
 * Convert ALGO amount to microAlgos (1 ALGO = 1,000,000 microAlgos)
 */
export function algoToMicroAlgo(algoAmount: number): bigint {
  return BigInt(Math.round(algoAmount * 1_000_000))
}

/**
 * Minimum balance requirement for creating a bounty box.
 * Box storage cost: 2500 + 400 * (key_size + value_size) microAlgos
 * BountyIdType key = 8 bytes, BountyDataType value = 8 + 1 + 32 = 41 bytes
 * So: 2500 + 400 * (8 + 41) = 2500 + 19600 = 22100 microAlgos
 * Add some buffer for the box prefix (3 bytes for "b__")
 */
export const BOX_MBR_COST = AlgoAmount.MicroAlgo(25_000)

export interface CreateBountyOnChainParams {
  /** Repository owner (GitHub username/org) */
  repoOwner: string
  /** Repository name */
  repoName: string
  /** Issue number */
  issueNumber: number
  /** Bounty amount in ALGO */
  amountAlgo: number
  /** Wallet address of the bounty creator */
  senderAddress: string
  /** Transaction signer from the wallet */
  signer: TransactionSigner
}

export interface CreateBountyOnChainResult {
  /** The on-chain bounty ID */
  bountyId: bigint
  /** Transaction ID */
  txId: string
  /** Confirmed round */
  confirmedRound?: bigint
}

/**
 * Creates a bounty on the Algorand smart contract.
 * This sends a grouped transaction with:
 * 1. Payment to the contract (bounty amount + box MBR)
 * 2. Application call to createBounty method
 */
export async function createBountyOnChain(params: CreateBountyOnChainParams): Promise<CreateBountyOnChainResult> {
  const { repoOwner, repoName, issueNumber, amountAlgo, senderAddress, signer } = params

  if (!SOURCE_FACTORY_APP_ID || SOURCE_FACTORY_APP_ID === BigInt(0)) {
    throw new Error('SourceFactory App ID not configured. Set VITE_SOURCE_FACTORY_APP_ID env variable.')
  }

  // Compute deterministic bounty ID
  const bountyId = computeBountyId(repoOwner, repoName, issueNumber)
  const bountyAmountMicroAlgo = algoToMicroAlgo(amountAlgo)

  if (bountyAmountMicroAlgo <= BigInt(0)) {
    throw new Error('Bounty amount must be greater than 0')
  }

  // Create AlgorandClient from environment config
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({
    algodConfig: {
      server: algodConfig.server,
      port: algodConfig.port,
      token: algodConfig.token as string,
    },
  })

  // Register the wallet signer with the AlgorandClient
  algorand.setSigner(senderAddress, signer)

  // Get the SourceFactory typed client
  const appClient = algorand.client.getTypedAppClientById(SourceFactoryClient, {
    appId: SOURCE_FACTORY_APP_ID,
    defaultSender: senderAddress,
  })

  // Get the app address for payment
  const appAddress = appClient.appAddress

  // Total payment = bounty amount + box MBR
  const totalPayment = AlgoAmount.MicroAlgo(bountyAmountMicroAlgo + BOX_MBR_COST.microAlgo)

  // Build the box reference for the bounty
  // Key format: "b__" prefix + uint64 bounty_id (8 bytes big-endian)
  const boxKeyPrefix = new TextEncoder().encode('b__')
  const bountyIdBytes = new Uint8Array(8)
  const view = new DataView(bountyIdBytes.buffer)
  view.setBigUint64(0, bountyId, false) // big-endian
  const boxKey = new Uint8Array([...boxKeyPrefix, ...bountyIdBytes])

  // Create atomic transaction group: payment + app call
  const result = await algorand
    .newGroup()
    .addPayment({
      sender: senderAddress,
      receiver: appAddress,
      amount: totalPayment,
    })
    .addAppCallMethodCall(
      await appClient.params.createBounty({
        args: {
          bountyId: bountyId,
          bountyTotalValue: bountyAmountMicroAlgo,
        },
        boxReferences: [{ appId: SOURCE_FACTORY_APP_ID, name: boxKey }],
      }),
    )
    .send()

  return {
    bountyId,
    txId: result.txIds[0],
    confirmedRound: result.confirmations?.[0]?.confirmedRound,
  }
}

/**
 * Gets the current app balance
 */
export async function getAppBalance(): Promise<bigint> {
  if (!SOURCE_FACTORY_APP_ID || SOURCE_FACTORY_APP_ID === BigInt(0)) {
    throw new Error('SourceFactory App ID not configured')
  }

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({
    algodConfig: {
      server: algodConfig.server,
      port: algodConfig.port,
      token: algodConfig.token as string,
    },
  })

  const appClient = algorand.client.getTypedAppClientById(SourceFactoryClient, {
    appId: SOURCE_FACTORY_APP_ID,
  })

  const accountInfo = await algorand.account.getInformation(appClient.appAddress)
  return accountInfo.balance.microAlgo
}
