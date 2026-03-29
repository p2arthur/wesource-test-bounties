# Contract Layer Plan — Phase 1: Fix the Contract

**Role**: Algorand Smart Contract Engineer (PuyaTs)
**Scope**: `/contracts` — Smart contracts, ARC-56 specs, deployment
**Project**: WeSource — Decentralized bounty platform

---

## Context

The audit found 4 CRITICAL issues in the contract:

1. **F-1**: `create_bounty` has no access control — anyone can front-run
2. **F-2**: `create_bounty` doesn't verify funds — users can claim escrow they didn't deposit
3. **F-3**: bountyKey hash mismatch (SHA256 DB vs djb2 on-chain)
4. **F-4**: Amount mismatch (Float ALGO in DB vs uint64 microAlgos on-chain)

Phase 1 focuses on fixing the contract itself. Phases 2+ will fix backend/frontend alignment.

---

## Phase 1 Tasks

### [1.1] Add Fund Verification to `create_bounty` ⏳ IN_PROGRESS

**File**: `smart_contracts/source_factory/contract.algo.ts`
**Effort**: 3 hours
**Blocker**: None
**Decision Point**: Manager-only vs. payment-verified (payment-verified chosen — allows direct user txns)

#### What
Modify `create_bounty()` to verify that a payment transaction in the group actually transferred the promised amount to the contract.

#### How
- Caller provides `bounty_total_value` in microAlgos
- Contract expects a grouped payment tx before the app call
- Verify: `gtxn[Txn.groupIndex - 1].Amount >= bounty_total_value`
- Verify: `gtxn[Txn.groupIndex - 1].Receiver == Global.currentApplicationAddress`

#### Definition of Done
- [ ] Implement verification logic in `create_bounty`
- [ ] Tests verify bounty creation fails if deposit is missing
- [ ] Tests verify bounty creation fails if deposit is too small
- [ ] Tests verify bounty creation succeeds with matching deposit
- [ ] Contract compiles without errors

---

### [1.2] Add Access Control to `create_bounty`

**File**: `smart_contracts/source_factory/contract.algo.ts`
**Effort**: 2 hours
**Blocker**: None
**Approach**: Manager-only (backend controls bounty creation)

#### What
Add guard: only the manager (backend) can call `create_bounty`. Prevents user front-running.

#### How
```ts
public create_bounty(bounty_id: uint64, bounty_total_value: uint64) {
  this.assert_manager()  // ← Add this
  // ... rest of method
}
```

#### Definition of Done
- [ ] `assert_manager()` is called at start of method
- [ ] Tests verify bounty creation fails when called by non-manager
- [ ] Tests verify bounty creation succeeds when called by manager
- [ ] No other changes to method logic

---

### [1.3] Add `refund_bounty` Method

**File**: `smart_contracts/source_factory/contract.algo.ts`
**Effort**: 4 hours
**Blocker**: 1.1
**Purpose**: Allows manager to return funds to creator if bounty expires/is cancelled

#### What
New public method that:
- Verifies caller is manager
- Checks bounty exists and hasn't been paid
- Sends amount back to recipient (creator)
- Marks bounty as paid

#### Definition of Done
- [ ] Method signature: `public refund_bounty(bounty_id: uint64, recipient: Account)`
- [ ] Tests verify refund fails if bounty already paid
- [ ] Tests verify refund fails when called by non-manager
- [ ] Tests verify refund succeeds and funds arrive
- [ ] Tests verify marked as paid after refund

---

### [1.4] Add `revoke_bounty` for Expired Bounties

**File**: `smart_contracts/source_factory/contract.algo.ts`
**Effort**: 3 hours
**Blocker**: 1.3
**Purpose**: Allows reclaim of bounties after a deadline

#### What
- Extend `BountyDataType` with `deadline: arc4.Uint64` field
- New method: `revoke_bounty(bounty_id, recipient)` — manager-only
- Checks: deadline > 0 AND `Global.latestTimestamp >= deadline`
- Sends funds back to recipient
- Marks bounty as paid

#### Definition of Done
- [ ] `BountyDataType` has deadline field
- [ ] `revoke_bounty` method implemented
- [ ] Tests verify revoke fails before deadline
- [ ] Tests verify revoke succeeds after deadline
- [ ] Tests verify funds returned and marked as paid

---

### [1.5] Update ARC-56 Spec + Regenerate Client

**Effort**: 1 hour
**Blocker**: 1.1, 1.2, 1.3, 1.4
**Purpose**: Generate spec consumed by backend/frontend

#### What
```bash
cd contracts && algokit project run build
```
- Compiles contract
- Generates `SourceFactory.arc56.json`
- Copy to: `server/artifacts/` + `client/src/contracts/`

#### Definition of Done
- [ ] Contract builds without errors
- [ ] `SourceFactory.arc56.json` generated
- [ ] Copied to server artifacts
- [ ] Client can import spec

---

### [1.6] Deploy to TestNet

**Effort**: 1 hour
**Blocker**: 1.5
**Purpose**: Updated contract lives on-chain

#### What
- Run `deploy-config.ts`
- Update `VITE_SOURCE_FACTORY_APP_ID` env var
- Update `SOURCE_FACTORY_APP_ID` in server config
- Call bootstrap if new deployment

#### Definition of Done
- [ ] Contract deployed to TestNet
- [ ] New app ID recorded
- [ ] Env vars updated
- [ ] Bootstrap called (if new deployment)
- [ ] `algokit project run test` passes

---

## Verification Checklist (Phase 1)

```bash
cd contracts && algokit project run test
```

- [ ] `create_bounty` fails without deposit verification
- [ ] `create_bounty` succeeds with matching deposit
- [ ] `create_bounty` fails when called by non-manager
- [ ] `withdraw_bounty` only works for manager
- [ ] `refund_bounty` returns funds to creator
- [ ] `revoke_bounty` works after deadline
- [ ] All box data matches ARC-56 spec
- [ ] Contract compiles cleanly

---

## Notes & Decisions

- **Payment verification approach**: Group transactions — caller sends payment in position `Txn.groupIndex - 1`, contract verifies amount
- **Access control**: Manager-only for all state-changing methods
- **Box structure**: Keep existing `BountyDataType`, just add `deadline` field
- **Testing**: Use `algorandFixture` for integration tests, verify both success and failure paths

