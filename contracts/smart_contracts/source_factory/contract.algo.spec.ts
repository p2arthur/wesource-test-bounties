import { arc4, Global } from '@algorandfoundation/algorand-typescript'
import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { afterEach, describe, expect, it } from 'vitest'
import { BountyIdType } from './config.algo'
import { SourceFactory } from './contract.algo'

describe('SourceFactory contract', () => {
  const ctx = new TestExecutionContext()
  afterEach(() => {
    ctx.reset()
  })

  const withAppCall = <T>(contract: SourceFactory, sender: typeof ctx.defaultSender, body: () => T) => {
    const previousSender = ctx.defaultSender
    ctx.defaultSender = sender
    const appCall = ctx.any.txn.applicationCall({ sender, appId: contract })
    try {
      return ctx.txn.createScope([appCall], 0).execute(() => {
        ctx.txn.activeGroup.patchActiveTransactionFields({ sender })
        return body()
      })
    } finally {
      ctx.defaultSender = previousSender
    }
  }

  it('bootstraps once and sets manager', () => {
    const contract = ctx.contract.create(SourceFactory)
    const manager = ctx.defaultSender

    withAppCall(contract, manager, () => contract.bootstrap())

    expect(contract.MANAGER_ADDRESS.hasValue).toBe(true)
    expect(contract.MANAGER_ADDRESS.value.bytes.equals(manager.bytes)).toBe(true)
    expect(() => withAppCall(contract, manager, () => contract.bootstrap())).toThrow(/Already bootstrapped/)
  })

  it('creates a bounty and stores it in a box', () => {
    const contract = ctx.contract.create(SourceFactory)
    withAppCall(contract, ctx.defaultSender, () => contract.bootstrap())

    withAppCall(contract, ctx.defaultSender, () => contract.create_bounty(1, 1_000))

    expect(Number(contract.TOTAL_BOUNTIES.value.valueOf())).toBe(1)

    const bounty = contract.bounties(new BountyIdType({ bounty_id: new arc4.Uint64(1) }))
    expect(bounty.exists).toBe(true)
    expect(Number(bounty.value.bounty_total_value.asUint64().valueOf())).toBe(1_000)
    expect(bounty.value.bounty_paid.native).toBe(false)
    expect(bounty.value.bounty_winner.native.bytes.equals(Global.zeroAddress.bytes)).toBe(true)
  })

  it('rejects create_bounty from non-manager and invalid values', () => {
    const contract = ctx.contract.create(SourceFactory)
    const manager = ctx.defaultSender
    withAppCall(contract, manager, () => contract.bootstrap())

    let nonManager = ctx.any.account()
    if (nonManager.bytes.equals(manager.bytes)) {
      nonManager = ctx.any.account()
    }

    expect(() => withAppCall(contract, manager, () => contract.create_bounty(2, 0))).toThrow(/Bounty value must be > 0/)

    withAppCall(contract, manager, () => contract.create_bounty(3, 1_000))
    expect(() => withAppCall(contract, manager, () => contract.create_bounty(3, 1_000))).toThrow(
      /Bounty already exists/,
    )
  })

  it('withdraws a bounty and emits an inner payment', () => {
    const contract = ctx.contract.create(SourceFactory)
    const manager = ctx.defaultSender
    withAppCall(contract, manager, () => contract.bootstrap())
    withAppCall(contract, manager, () => contract.create_bounty(1, 2_000))

    const winner = ctx.any.account()
    const app = ctx.ledger.getApplicationForContract(contract)
    ctx.ledger.patchAccountData(app.address, { account: { balance: 10_000 } })

    withAppCall(contract, manager, () => contract.withdraw_bounty(1, winner))

    const bounty = contract.bounties(new BountyIdType({ bounty_id: new arc4.Uint64(1) }))
    expect(bounty.value.bounty_paid.native).toBe(true)
    expect(bounty.value.bounty_winner.native.bytes.equals(winner.bytes)).toBe(true)

    const itxn = ctx.txn.lastGroup.lastItxnGroup().getPaymentInnerTxn(0)
    expect(itxn.receiver.bytes.equals(winner.bytes)).toBe(true)
    expect(Number(itxn.amount.valueOf())).toBe(2_000)
    expect(Number(itxn.fee.valueOf())).toBe(0)
  })

  it('rejects invalid withdraws', () => {
    const contract = ctx.contract.create(SourceFactory)
    const manager = ctx.defaultSender
    withAppCall(contract, manager, () => contract.bootstrap())
    withAppCall(contract, manager, () => contract.create_bounty(1, 1_000))

    const winner = ctx.any.account()
    const app = ctx.ledger.getApplicationForContract(contract)
    ctx.ledger.patchAccountData(app.address, { account: { balance: 999 } })

    expect(() => withAppCall(contract, manager, () => contract.withdraw_bounty(1, Global.zeroAddress))).toThrow(
      /Winner required/,
    )
    expect(() => withAppCall(contract, manager, () => contract.withdraw_bounty(2, winner))).toThrow(/Bounty not found/)
    expect(() => withAppCall(contract, manager, () => contract.withdraw_bounty(1, winner))).toThrow(
      /Insufficient app balance/,
    )

    ctx.ledger.patchAccountData(app.address, { account: { balance: 2_000 } })
    withAppCall(contract, manager, () => contract.withdraw_bounty(1, winner))
    expect(() => withAppCall(contract, manager, () => contract.withdraw_bounty(1, winner))).toThrow(
      /Bounty already paid/,
    )
  })
})
