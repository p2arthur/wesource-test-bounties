import {
  Account,
  arc4,
  assert,
  BoxMap,
  Contract,
  Global,
  GlobalState,
  itxn,
  op,
  Txn,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { BountyDataType, BountyIdType } from './config.algo'

export class SourceFactory extends Contract {
  MANAGER_ADDRESS = GlobalState<Account>()
  TOTAL_BOUNTIES = GlobalState<uint64>({ initialValue: 0 })

  bounties = BoxMap<BountyIdType, BountyDataType>({ keyPrefix: 'b__' })

  public bootstrap() {
    assert(!this.MANAGER_ADDRESS.hasValue, 'Already bootstrapped')
    this.MANAGER_ADDRESS.value = Txn.sender
  }

  public create_bounty(bounty_id: uint64, bounty_total_value: uint64) {
    assert(bounty_total_value > 0, 'Bounty value must be > 0')
    const bounty = this.bounties(new BountyIdType({ bounty_id: new arc4.Uint64(bounty_id) }))
    assert(!bounty.exists, 'Bounty already exists')
    bounty.value = new BountyDataType({
      bounty_total_value: new arc4.Uint64(bounty_total_value),
      bounty_paid: new arc4.Bool(false),
      bounty_winner: new arc4.Address(Global.zeroAddress),
    })
    this.TOTAL_BOUNTIES.value += 1
  }

  public withdraw_bounty(bounty_id: uint64, winner: Account) {
    this.assert_manager()
    assert(winner !== Global.zeroAddress, 'Winner required')
    const bounty = this.bounties(new BountyIdType({ bounty_id: new arc4.Uint64(bounty_id) }))
    assert(bounty.exists, 'Bounty not found')

    assert(!bounty.value.bounty_paid.native, 'Bounty already paid')

    const amount = bounty.value.bounty_total_value.asUint64()
    assert(amount > 0, 'Bounty value must be > 0')
    assert(op.balance(Global.currentApplicationAddress) >= amount, 'Insufficient app balance')

    bounty.value = new BountyDataType({
      bounty_total_value: bounty.value.bounty_total_value,
      bounty_paid: new arc4.Bool(true),
      bounty_winner: new arc4.Address(winner),
    })

    itxn
      .payment({
        receiver: winner,
        amount: amount,
        fee: 0,
      })
      .submit()
  }

  private assert_manager() {
    assert(this.MANAGER_ADDRESS.hasValue, 'Contract not bootstrapped')
    assert(Txn.sender === this.MANAGER_ADDRESS.value, 'Only manager')
  }
}
