# Backend Dev Agent — WeSource Plan

**Last Updated:** 2026-03-28
**Scope:** Phases 2–7 of WESOURCE_EXECUTIVE_PLAN.md
**Source:** `WeSource_full_audit/audit_results/CORE_FEATURES_PLAN.md` (Phases 2–7)

---

## Context: What Came Before

### From the Audit

WeSource has **13 features**. 3 work, 5 are broken, 5 are missing. The bounty lifecycle — the entire point of the product — is broken end-to-end.

**Key backend issues found:**
- `Bounty.amount` is Float (Prisma) but contract uses uint64 microAlgos — **1,000,000x mismatch**
- `buildBountyKey` uses SHA256 while contract uses djb2 — **different hashes for same bounty**
- No auth on any endpoint — anyone can call anything
- Oracle is fully off-chain — no on-chain winner authorization
- Claim button shown for wrong status, types passed incorrectly to contract
- No refund endpoint, no user profiles, no search, no pagination

### From On-Chain Agent (Phase 1 — Already Complete)

On-Chain completed before you start. Here's what they delivered:
- `create_bounty` now verifies grouped payment — no more unbacked bounty records
- `refund_bounty(bounty_id, recipient)` — manager-only, sends inner payment
- `revoke_bounty(bounty_id, recipient)` — manager-only, time-based with deadline
- `BountyDataType` extended with `deadline: arc4.Uint64`
- New ARC-56 spec: `contracts/artifacts/source_factory/SourceFactory.arc56.json`
- New contract deployed to TestNet — **check new app ID in .env**

**⚠️ Before starting Phase 2: Read the new ARC-56 spec. Your service code must match the exact method signatures.**

### From Frontend Dev (runs in parallel with you after Phase 2)

Frontend Dev depends on your API contract. They'll read your endpoint signatures and call them. Make sure your DTOs, response shapes, and error codes are clean.

---

## Phase 2: Type Alignment (Day 4)

### Task 2.1: Change Prisma `amount` from Float to Int

**Context:** F-4 in the audit. Contract stores microAlgos as uint64. DB stores ALGO as Float. When `syncFromChain` compares them, it's comparing 10 (ALGO) to 10000000 (microAlgos) — always wrong.

**What to do:**
- Open `prisma/schema.prisma`, find `Bounty` model
- Change `amount Float` to `amount Int`
- Run: `npx prisma migrate dev --name amount-to-microalgos`
- Update any queries that rely on Float behavior

**Deliverable:** Updated schema + migration file
**Test:** Verify existing bounties migrate correctly (or are wiped for fresh start — p2 decides)

---

### Task 2.2: Replace SHA256 with djb2 Hash Everywhere

**Context:** F-3 in the audit. Two different hashes exist: `bountyKey` (SHA256, in DB) vs `bountyId` (djb2, on-chain). They can never match.

**What to do:**
- Open `src/bounties/bounties.service.ts`
- Find `buildBountyKey` (SHA256) — **delete it**
- Use `computeBountyId` (djb2) for both on-chain ID and DB key
- Convert djb2 result to hex string for DB storage: `id.toString(16).padStart(16, '0')`
- Update any code that calls `buildBountyKey`

**Deliverable:** Single hash function (djb2) used everywhere
**Test:** Verify bounty creation stores same hash as contract computes

---

### Task 2.3: Convert ALGO to MicroAlgos at API Boundary

**Context:** The frontend sends ALGO amounts (e.g., 10) to the API. The contract expects microAlgos (e.g., 10000000). The backend must convert.

**What to do:**
- In `bounties.service.ts`, convert at the boundary: `const amountMicroAlgos = Math.round(payload.amount * 1_000_000)`
- Store microAlgos in DB (now that schema is Int)
- Keep API accepting human-friendly ALGO amounts (don't change the DTO)

**Deliverable:** Clean ALGO→microAlgos conversion in service layer
**Test:** Send 10 ALGO via API → DB stores 10000000 → contract sees 10000000

---

### Task 2.4: Update `syncFromChain` to Compare MicroAlgos

**Context:** Sync logic currently compares Float DB values to uint64 chain values. Always wrong.

**What to do:**
- In `syncFromChain`, both DB and chain values are now microAlgos (Int vs uint64)
- Direct comparison: `dbAmount === chainAmount`
- Update any sync logging to show microAlgos

**Deliverable:** Fixed sync comparison
**Test:** Create bounty, run sync, verify amounts match

---

### Task 2.5: Phase 2 Review Prep

**What to do:**
- Run all existing tests: `npm run test`
- Verify no regressions from schema migration
- Document any issues found in MEMORY.md

---

## Phase 3: Authentication (Days 5–6)

### Task 3.1: Create WalletAuthGuard

**Context:** F-11 in the audit. No endpoint has authentication. Anyone can create projects, bounties, trigger oracle.

**What to do:**
- Create `src/auth/auth.guard.ts` — NestJS guard that verifies Algorand wallet-signed messages
- Use `algosdk.verifyBytes()` for signature verification
- Message format: `"WeSource login: {timestamp}"` — reject if timestamp > 5 min old
- Create `src/auth/auth.module.ts` — NestJS module

**Deliverable:** `WalletAuthGuard` class + module
**Test:** Protected endpoint returns 401 without valid signature, 200 with valid signature

---

### Task 3.2: Apply Auth to Mutating Endpoints

**Context:** All POST/PUT/DELETE endpoints must require authentication. GET stays public.

**What to do:**
- Add `@UseGuards(WalletAuthGuard)` to:
  - `POST /projects` (create)
  - `DELETE /projects/:id` (delete)
  - `POST /api/bounties` (create)
  - `POST /api/bounties/claim` (claim)
  - `POST /api/bounties/:id/refund` (refund — Phase 5)
- GET endpoints stay public

**Deliverable:** Auth guards on all write endpoints
**Test:** Verify 401 on protected endpoints without token, 200 with token

---

### Task 3.3: Add Wallet Field to User Model

**Context:** Need to link wallet address ↔ GitHub user for winner identification and claim verification.

**What to do:**
- Add `wallet String? @unique` to User model in Prisma
- Create `linkIdentity(wallet, githubUsername, githubId)` method in auth service
- Run migration: `npx prisma migrate dev --name add-wallet-to-user`

**Deliverable:** Updated User model + identity linking method
**Test:** Create user with wallet, verify uniqueness constraint

---

## Phase 4: Claim Flow (Days 7–9)

### Task 4.1: Fix `claimBounty` Endpoint

**Context:** F-5 in the audit. Backend passes address string where contract expects Account. Claim button shown for wrong status.

**What to do:**
- Open `src/bounties/bounties.controller.ts`
- Add `@UseGuards(WalletAuthGuard)` to claim endpoint
- Verify authenticated wallet matches `bounty.winner.wallet`
- Verify bounty status is `READY_FOR_CLAIM`
- Fix type passed to contract (check ARC-56 spec for correct type)

**Deliverable:** Fixed claim endpoint with auth + type verification
**Test:** Claim with correct wallet → success. Claim with wrong wallet → 403. Claim on OPEN bounty → 400.

---

### Task 4.2: Fix `withdrawBounty` in AlgorandService

**Context:** F-5. Types passed to contract may not match ARC-56 spec.

**What to do:**
- Read the new ARC-56 spec for `withdraw_bounty` method signature
- Verify what type `winner` parameter expects (address string vs Account)
- Update `algorand.service.ts` to pass correct type
- Use the typed app client, not raw algosdk

**Deliverable:** Correctly typed contract call
**Test:** Call withdraw with valid winner → succeeds. Invalid type → descriptive error.

---

### Task 4.3: Winner Wallet Verification

**Context:** Oracle identifies winner by GitHub username, but the claim needs a wallet address. Need the link.

**What to do:**
- In oracle service, after upserting winner user, verify they have a wallet
- Add `POST /bounties/link-wallet` endpoint — auth-protected, links wallet to GitHub user
- If winner hasn't registered yet, bounty stays `READY_FOR_CLAIM` until they connect

**Deliverable:** Wallet linking endpoint + oracle integration
**Test:** Winner connects wallet → can claim. Winner without wallet → bounty waits.

---

## Phase 5: Refund Flow (Day 10)

### Task 5.1: Add `refundBounty` to AlgorandService

**Context:** On-Chain added `refund_bounty` to the contract. Backend needs to call it.

**What to do:**
- Add `refundBounty(owner, repo, issueNumber, creatorWallet)` method
- Use typed app client to call `refund_bounty` with correct args
- Include box reference for the bounty

**Deliverable:** New method in `algorand.service.ts`
**Test:** Verify method compiles and builds correct transaction

---

### Task 5.2: Add Refund Endpoint

**Context:** Creators need a way to reclaim funds for REFUNDABLE bounties.

**What to do:**
- Add `POST /bounties/:id/refund` — auth-protected
- Verify: bounty is REFUNDABLE, authenticated wallet is the creator
- Call `refundBounty` on AlgorandService
- Update DB status to REFUNDED

**Deliverable:** New refund endpoint
**Test:** Creator refunds → success. Non-creator → 403. Non-REFUNDABLE → 400.

---

### Task 5.3: Add `REFUNDED` to BountyStatus Enum

**Context:** Prisma enum needs the new status.

**What to do:**
- Add `REFUNDED` to `BountyStatus` enum in `schema.prisma`
- Run migration

**Deliverable:** Updated enum
**Test:** Verify enum accepts REFUNDED value

---

## Phase 6: User Profiles (Days 11–12)

### Task 6.1: Create User Endpoints

**Context:** F-15 in audit. Profile page shows hardcoded zeros. No backend endpoint exists.

**What to do:**
- Create `src/users/users.controller.ts` + `users.service.ts`
- `GET /users/:walletAddress` — return user + created bounties + won bounties
- `GET /users/:walletAddress/bounties` — bounties created by this wallet
- `GET /users/:walletAddress/wins` — bounties won by this user

**Deliverable:** New users module with 3 endpoints
**Test:** Fetch user by wallet → returns real data. Unknown wallet → empty (not error).

---

## Phase 7: Search, Pagination, Notifications (Days 13–15)

### Task 7.1: Pagination for List Endpoints

**Context:** All list endpoints return full dataset. No pagination.

**What to do:**
- Add `?page=1&limit=20` query params to all GET list endpoints
- Use Prisma `skip`/`take` for pagination
- Return `{ data, total, page, limit }` shape

**Deliverable:** Paginated list endpoints
**Test:** `GET /projects?page=2&limit=5` → returns 5 items, correct total

---

### Task 7.2: Bounty Filters

**Context:** No way to filter bounties by status, repo, or amount.

**What to do:**
- Add `?status=OPEN&repoOwner=x&minAmount=1&maxAmount=100` query params
- Build Prisma `where` clause from params

**Deliverable:** Filtered bounty list endpoint
**Test:** Filter by status → returns only matching bounties

---

### Task 7.3: Notification System

**Context:** No notifications exist. Winners don't know they can claim. Creators don't know bounties are refundable.

**What to do:**
- Add `Notification` model to Prisma (userId, type, message, bountyId, read, createdAt)
- Create `src/notifications/` module
- `GET /notifications` — user's notifications
- `PATCH /notifications/:id/read` — mark as read
- Trigger notifications in oracle service when status changes

**Deliverable:** Notification module + endpoints
**Test:** Oracle marks bounty READY_FOR_CLAIM → notification created for winner

---

## Completion Criteria

- [ ] All tasks across Phases 2–7 done
- [ ] `npm run test` — all passing
- [ ] All endpoints documented (Swagger or inline)
- [ ] MEMORY.md updated with all decisions and findings
- [ ] Report completion to p2

---

## Dependencies

- **Phase 2 depends on:** On-Chain Phase 1 complete (ARC-56 spec, new app ID)
- **Phase 3 depends on:** Phase 2 complete (types aligned)
- **Phases 4+5 depend on:** Phase 3 complete (auth guards)
- **Phase 6 depends on:** Phase 3 complete (User model with wallet)
- **Phase 7 depends on:** Phase 6 complete (User model)
- **Frontend Dev** depends on your API contract — keep DTOs clean
