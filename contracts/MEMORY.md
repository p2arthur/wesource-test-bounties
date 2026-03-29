# On-Chain Agent — Working Memory

**Session Start**: 2026-03-28
**Current Task**: [1.5] Update ARC-56 spec + regenerate client (1.1-1.4 complete)

---

## Architectural Facts

- **Contract Path**: `smart_contracts/source_factory/contract.algo.ts`
- **Main Class**: `SourceFactory extends Contract`
- **Storage**: 2 GlobalState keys (MANAGER_ADDRESS, TOTAL_BOUNTIES) + 1 BoxMap (bounties)
- **Current Methods**: `bootstrap()`, `create_bounty()`, `withdraw_bounty()`
- **Types File**: `smart_contracts/source_factory/config.algo.ts` (defines BountyIdType, BountyDataType)
- **Test Helper**: `withGroupedPaymentAndAppCall` for testing grouped transactions

### Status of Critical Issues

| Issue | Location | Severity | Status |
|-------|----------|----------|--------|
| F-1: No access control on create_bounty | create_bounty | Critical | ✅ FIXED |
| F-2: No fund verification | create_bounty | Critical | ✅ FIXED |
| F-3: Hash mismatch (SHA256 vs djb2) | Backend/Contract mismatch | Critical | Backend fix |
| F-4: Amount mismatch (Float vs uint64) | Backend/Contract mismatch | Critical | Backend fix |

---

## Completed: Task [1.1] Add Fund Verification + Access Control

### What Was Done

**Implementation in `create_bounty` method:**
1. Added access control check: `this.assert_manager()`
   - Only manager (backend) can create bounties
   - Prevents front-running by users

2. Added fund verification:
   - Verify transaction is part of a group: `assert(Txn.groupIndex > 0)`
   - Access previous transaction: `const paymentTxn = gtxn.PaymentTxn(Txn.groupIndex - 1)`
   - Verify payment receiver: `assert(paymentTxn.receiver === Global.currentApplicationAddress)`
   - Verify payment amount: `assert(paymentTxn.amount >= bounty_total_value)`

3. Updated test file to support grouped transactions:
   - Created new test helper: `withGroupedPaymentAndAppCall`
   - Updated all bounty creation tests to use grouped payments
   - All unit tests now pass (5/5)

### Key Discoveries

**PuyaTs API for group transactions:**
- Import: `gtxn` from `@algorandfoundation/algorand-typescript`
- Namespace pattern: `gtxn.PaymentTxn(index)`, `gtxn.Transaction(index)`, etc.
- Returns typed transaction object with all fields accessible

**Test framework:**
- TestExecutionContext provides `ctx.ledger`, `ctx.txn`, `ctx.contract` utilities
- Can create grouped transactions with `ctx.txn.createScope([txn1, txn2], activeIndex)`
- Payment transaction created with `ctx.any.txn.payment({ sender, receiver, amount })`

### Test Results
```
Test Files: 1 failed | 1 passed (2)
Tests:      1 failed | 5 passed (6)
```
- ✅ Unit tests all pass (5/5 in contract.algo.spec.ts)
- ⚠️ E2E test fails (requires localnet, expected)

### Files Modified
1. `smart_contracts/source_factory/contract.algo.ts` — Added imports, updated method
2. `smart_contracts/source_factory/contract.algo.spec.ts` — Added test helper, updated tests

---

## Next Steps

**Task [1.2]**: Already completed as part of 1.1. Moved to:
**Task [1.3]**: Add `refund_bounty` method (4 hours)
- New method for manager to refund creator
- Checks bounty hasn't been paid
- Sends amount back to recipient
- Marks as paid

---

## Session Log

### [2026-03-28] Phase 1: Contract Fixes (1.1-1.4 Complete)

**Tasks Completed:**

- ✅ **1.1 & 1.2**: Fund verification + access control
  - Added check: `assert(Txn.groupIndex > 0)` and `gtxn.PaymentTxn(Txn.groupIndex - 1)`
  - Added check: `this.assert_manager()` at start of create_bounty
  - Prevents front-running and fund fraud

- ✅ **1.3**: Refund_bounty method
  - Manager-only method to return funds to creator
  - Checks bounty exists and hasn't been paid
  - Sends amount via inner payment
  - Marks bounty as paid with winner = zeroAddress

- ✅ **1.4**: Revoke_bounty for expired bounties
  - Extended BountyDataType with `bounty_deadline: arc4.Uint64` field
  - Checks deadline > 0 and `Global.latestTimestamp >= deadline`
  - Same payment logic as refund_bounty
  - Tests verify: expiration check, no-deadline error, already-paid error

**Test Status:**
- ✅ 9/10 unit tests passing
  - bootstrap (1)
  - create_bounty with grouped payment (1)
  - invalid create_bounty (1)
  - withdraw_bounty (2: happy path + invalid)
  - refund_bounty (2: happy path + invalid)
  - revoke_bounty (2: happy path + invalid)
- ⚠️ E2E test requires localnet (not available)

**Files Modified:**
1. `contract.algo.ts` — Added refund/revoke methods, deadline field, imports
2. `config.algo.ts` — Extended BountyDataType with deadline
3. `contract.algo.spec.ts` — Added test helper, new tests for refund/revoke
4. Artifacts auto-generated (arc56.json, client)

### [2026-03-28] Next Steps
- **1.5**: ARC-56 spec already auto-generated during build ✅
- **1.6**: Deploy to TestNet (requires env setup)

