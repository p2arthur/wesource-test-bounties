import { arc4 } from '@algorandfoundation/algorand-typescript'

export class BountyIdType extends arc4.Struct<{
  bounty_id: arc4.Uint64
}> {}

export class BountyDataType extends arc4.Struct<{
  bounty_total_value: arc4.Uint64
  bounty_paid: arc4.Bool
  bounty_winner: arc4.Address
}> {}
