import { Config } from '@algorandfoundation/algokit-utils'
import { registerDebugEventHandlers } from '@algorandfoundation/algokit-utils-debug'
import { algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { Address } from 'algosdk'
import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { SourceFactoryFactory } from '../artifacts/source_factory/SourceFactoryClient'

describe('SourceFactory contract', () => {
  const localnet = algorandFixture()
  beforeAll(() => {
    Config.configure({
      debug: true,
      // traceAll: true,
    })
    registerDebugEventHandlers()
  })
  beforeEach(localnet.newScope)

  const deploy = async (account: Address) => {
    const factory = localnet.algorand.client.getTypedAppFactory(SourceFactoryFactory, {
      defaultSender: account,
    })

    const { appClient } = await factory.deploy({
      onUpdate: 'append',
      onSchemaBreak: 'append',
    })
    return { client: appClient }
  }

  test('bootstraps, creates a bounty, and withdraws to winner', async () => {
    const { testAccount, algorand } = localnet.context
    const { client } = await deploy(testAccount.addr)

    await client.send.bootstrap()

    await algorand.send.payment({
      amount: (1).algo(),
      sender: testAccount.addr,
      receiver: client.appAddress,
    })

    await client.send.createBounty({ args: { bountyId: 1, bountyTotalValue: 1_000 } })

    const total = await client.state.global.totalBounties()
    expect(total).toBe(1n)

    const bountyBefore = await client.state.box.bounties.value({ bountyId: 1n })
    expect(bountyBefore?.bountyPaid).toBe(false)

    const winner = await localnet.context.generateAccount({ initialFunds: (1).algo() })
    algorand.setSignerFromAccount(testAccount)
    await client.send.withdrawBounty({
      args: { bountyId: 1, winner: winner.addr.toString() },
      maxFee: (0.002).algo(),
      coverAppCallInnerTransactionFees: true,
    })

    const bountyAfter = await client.state.box.bounties.value({ bountyId: 1n })
    expect(bountyAfter?.bountyPaid).toBe(true)
    expect(bountyAfter?.bountyWinner).toBe(winner.addr.toString())
  })
})
