# On-Chain Agent — WeSource Plan

**Last Updated:** 2026-03-28
**Scope:** Phase 1 of WESOURCE_EXECUTIVE_PLAN.md — Contract Fix
**Source:** `WeSource_full_audit/audit_results/CORE_FEATURES_PLAN.md` (Phase 1)

---

## Context: What Came Before

The WeSource audit found **4 CRITICAL issues** in the smart contract:

1. **`create_bounty` has no access control** — anyone can front-run and block legitimate bounties
2. **`create_bounty` doesn't verify funds** — users can claim 1000 ALGO escrow while depositing 1 ALGO
3. **No refund mechanism** — funds locked forever if no winner
4. **No expiry/deadline** — no way to reclaim expired bounties

The contract currently has 3 methods: `bootstrap()`, `create_bounty(bounty_id, bounty_total_value)`, `withdraw_bounty(bounty_id, winner)`. Storage: 2 GlobalState keys + 1 BoxMap.

Backend Dev (their plan is in `../../server/.opencode/PLAN.md`) depends on your ARC-56 spec to build typed API calls. Frontend Dev (their plan is in `../../client/.opencode/PLAN.md`) depends on your generated `SourceFactoryClient.ts` to build transactions. **You go first.**

---

## Task 1.1: Add Fund Verification to `create_bounty`

**Goal:** Verify that the grouped payment transaction actually deposited funds matching `bounty_total_value`.

**Context:** Right now the frontend sends a grouped `[Payment, AppCall]` transaction, but the contract never checks that the payment amount matches what's claimed. F-2 in the audit.

**What to do:**
- Read `contract.algo.ts`, find `create_bounty`
- Add grouped transaction check: verify `gtxn[0].Amount >= bounty_total_value` and `gtxn[0].Receiver == Global.currentApplicationAddress`
- The payment should be in group index 0, app call in group index 1 (verify this matches frontend's `bountyContract.ts`)

**Deliverable:** Updated `contract.algo.ts` with payment verification assert
**Test:** Write a test that creates a bounty with correct payment (should pass) and one with insufficient payment (should fail)

---

## Task 1.2: Add Access Control to `create_bounty`

**Goal:** Prevent front-running attacks on bounty creation.

**Context:** F-1 in the audit. Anyone can call `create_bounty` for any `bounty_id` before the legitimate creator, creating a box with 0 value that blocks the real bounty.

**Decision point (p2 must decide):**
- **Option A: Manager-only** — only the backend (with `MANAGER_MNEMONIC`) can create bounty records. Simpler, centralized.
- **Option B: Payment-verified open** — keep it open but verify the grouped payment (from Task 1.1). If payment is verified, front-running is impossible because the attacker would have to deposit real funds.

**What to do (implement Option B unless p2 says otherwise):**
- Combined with Task 1.1 — if payment is verified, access control is implicit
- Add an assert that `gtxn[0].Amount >= bounty_total_value` — this alone prevents front-running because attacker must deposit real funds

**If Option A chosen instead:**
- Add `assert(Txn.sender === this.MANAGER_ADDRESS.value, 'Only manager can create bounties')`

**Deliverable:** Updated `contract.algo.ts` with chosen access control
**Test:** If Option B: test that creating with matching payment works, creating without payment fails. If Option A: test that non-manager call fails.

---

## Task 1.3: Add `refund_bounty` Method

**Goal:** Let creators reclaim funds when no winner is declared.

**Context:** F-6 in the audit. DB has `REFUNDABLE` status but no on-chain path. Funds are locked forever.

**What to do:**
- Add new method: `refund_bounty(bounty_id: arc4.Uint64, recipient: Account)`
- Access: manager-only (backend oracle triggers it)
- Logic: verify bounty exists, not already paid, send inner payment to recipient, mark as paid
- Use `itxn.Payment` with `fee: 0` (sender pays fees)

**Signature:**
```ts
@abi.readonly(false)
public refund_bounty(bounty_id: arc4.Uint64, recipient: Account) {
    assert(Txn.sender === this.MANAGER_ADDRESS.value, 'Only manager')
    const bounty = this.bounties(bounty_id)
    assert(bounty.exists, 'Bounty not found')
    const data = bounty.value.copy()
    assert(!data.bountyPaid.value, 'Bounty already paid')

    itxn.Payment({
        receiver: recipient,
        amount: data.bountyTotalValue.value,
        fee: 0,
    }).submit()

    data.bountyPaid = new arc4.Bool(true)
    bounty.value = data.copy()
}
```

**Deliverable:** New `refund_bounty` method in `contract.algo.ts`
**Test:** Test that refund sends correct amount to creator, fails if already paid, fails if bounty doesn't exist

---

## Task 1.4: Add `revoke_bounty` for Expired Bounties

**Goal:** Time-based reclaim — creator can get funds back after a deadline if no one solved.

**Context:** Currently no deadline mechanism exists. The bounty can sit in escrow forever.

**What to do:**
- Extend `BountyDataType` struct to include `deadline: arc4.Uint64` (Unix timestamp, 0 = no deadline)
- Add new method: `revoke_bounty(bounty_id: arc4.Uint64, recipient: Account)`
- Access: manager-only
- Logic: verify `Global.latestTimestamp >= deadline`, bounty exists, not paid, send payment, mark paid

**Deliverable:** Extended struct + new `revoke_bounty` method
**Test:** Test that revoke works after deadline, fails before deadline, fails with 0 deadline

---

## Task 1.5: Update ARC-56 Spec + Regenerate Client

**Goal:** Produce the artifact that backend and frontend consume.

**Context:** After all contract changes, the spec must reflect reality. Backend reads it to call methods. Frontend reads the generated client to build transactions.

**What to do:**
```bash
cd contracts && algokit project run build
```
- Verify `SourceFactory.arc56.json` includes all new methods
- Copy generated `SourceFactoryClient.ts` to `../client/src/contracts/SourceFactoryClient.ts`

**Deliverable:** Updated `.arc56.json` + `SourceFactoryClient.ts` in client
**Test:** Verify spec contains `refund_bounty` and `revoke_bounty` method signatures

---

## Task 1.6: Deploy Updated Contract to TestNet

**Goal:** Get the new contract live so backend/frontend can integrate.

**Context:** Backend Dev needs the new app ID to call the updated methods. Frontend Dev needs it for `VITE_SOURCE_FACTORY_APP_ID`.

**What to do:**
- Deploy via `deploy-config.ts`
- Record new app ID
- Update `.env` files in both `/server` and `/client` with new `SOURCE_FACTORY_APP_ID` / `VITE_SOURCE_FACTORY_APP_ID`

**Deliverable:** New app ID, updated env vars
**Test:** Verify deployment succeeded via indexer lookup

---

## Task 1.7: Write Integration Tests

**Goal:** Full test coverage for all new contract methods.

**Context:** Untested contract code = untrusted contract code. Every method must have passing tests.

**What to do:**
- Test `create_bounty` with correct payment → succeeds
- Test `create_bounty` without payment → fails
- Test `create_bounty` with insufficient payment → fails
- Test `withdraw_bounty` → succeeds for manager, fails for others
- Test `refund_bounty` → succeeds for manager, sends correct amount, fails if already paid
- Test `revoke_bounty` → succeeds after deadline, fails before
- Test double-claim prevention → second claim fails

**Deliverable:** Passing test suite via `algokit project run test`
**Test:** All green. No skips. No "todo later."

---

## Completion Criteria

- [ ] All 7 tasks done
- [ ] `algokit project run build` succeeds
- [ ] `algokit project run test` — all passing
- [ ] ARC-56 spec updated and copied to client
- [ ] New app ID deployed to TestNet
- [ ] MEMORY.md updated with all decisions and findings
- [ ] Report completion to p2

---

## Dependencies on Other Agents

- **You don't depend on anyone for Phase 1.** You go first.
- Backend Dev depends on your ARC-56 spec (Phase 2 starts after you finish)
- Frontend Dev depends on your `SourceFactoryClient.ts` (Phase 2 starts after you finish)
- After you finish, p2 will review and approve before Backend/Frontend start
