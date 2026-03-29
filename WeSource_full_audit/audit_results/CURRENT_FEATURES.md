# CURRENT_FEATURES.md — WeSource Feature Inventory

**Date**: 2026-03-28
**Source**: Forensic audit of `/contracts`, `/server`, `/client`

---

## Feature Status Summary

| # | Feature | Contract | Backend | Frontend | Overall |
|---|---------|----------|---------|----------|---------|
| 1 | Project Registration | N/A | ✅ | ✅ | ✅ Works |
| 2 | Issue Ingestion (GitHub) | N/A | ✅ | ✅ | ✅ Works |
| 3 | Bounty Creation | ⚠️ Broken | ⚠️ Partial | ⚠️ Partial | ❌ Incomplete |
| 4 | Oracle Verification | ❌ Missing | ⚠️ Off-chain only | ❌ Missing | ❌ Incomplete |
| 5 | Fund Withdrawal | ⚠️ Manager-only | ⚠️ Partial | ⚠️ Wrong UI | ❌ Incomplete |
| 6 | Refund / Reclaim | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |
| 7 | Authentication | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |
| 8 | User Profiles | N/A | ❌ Missing | ⚠️ Hardcoded | ❌ Missing |
| 9 | Search & Filter | N/A | ❌ Missing | ❌ Missing | ❌ Missing |
| 10 | Transaction History | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |
| 11 | Notifications | N/A | ❌ Missing | ❌ Missing | ❌ Missing |
| 12 | Pagination | N/A | ❌ Missing | ❌ Missing | ❌ Missing |
| 13 | x402 Payment | N/A | ✅ | ✅ | ✅ Works |

---

## Stage 1: Project Registration — ✅ WORKS

### What Exists
- **Frontend**: `SubmitProjectForm.tsx` collects name, description, category, creator, repo URLs
- **Backend**: `ProjectsController.create()` accepts `CreateProjectDto`, calls `GithubService` to fetch metadata
- **Flow**: User fills form → POST `/projects` → backend fetches repo data (stars, contributors, issues) → saves to DB → returns enriched project

### What's Present
- GitHub URL validation and parsing (`parseGithubUrl`)
- Parallel fetch of repo metadata, contributors (top 10), issues (30 recent)
- Cascade delete of repositories when project is deleted
- Swagger/OpenAPI documentation

### What's Missing
- Authentication — anyone can create/delete projects
- Pagination — `GET /projects` returns all projects
- Search/filter — no query params for category, name, etc.
- Duplicate project prevention — no uniqueness constraint on name or repos
- Update/edit project — no `PUT /projects/:id` endpoint

---

## Stage 2: Issue Ingestion (GitHub) — ✅ WORKS

### What Exists
- **Backend**: `GithubService.getFullRepositoryData()` fetches issues via GitHub REST API
- **Frontend**: `ProjectPage.tsx` displays issues with state badges and "Create Bounty" buttons
- **Flow**: Project created → issues fetched with repo metadata → displayed per-repo in project detail page

### What's Present
- Issue metadata: number, title, state, labels, user, timestamps
- Open/closed state badges
- Direct GitHub links
- Rate limit handling with token fallback

### What's Missing
- Issue detail view — only title + state shown
- Issue caching — every page load re-fetches from GitHub
- Pagination for issues (only 30 per repo)
- Filtering issues by label, state, or search term
- Closed issues shown alongside open ones without differentiation

---

## Stage 3: Bounty Creation — ⚠️ BROKEN

### What Exists
- **Frontend**: `CreateBountyModal.tsx` with two-phase flow (on-chain → x402 payment)
- **Frontend**: `bountyContract.ts` builds atomic payment + app call group
- **Backend**: `BountiesController.create()` saves to DB, `BountiesService.create()` validates + hashes
- **Contract**: `create_bounty(bounty_id, bounty_total_value)` creates box record
- **x402**: Middleware gates `POST /api/bounties` with USDC micropayment

### What's BROKEN (from audit)
- **F-1**: Contract `create_bounty` has no access control — anyone can front-run and block legitimate bounties
- **F-2**: Contract doesn't verify deposit amount — users can claim 1000 ALGO escrow while depositing 1 ALGO
- **F-3**: bountyKey (SHA256 in DB) ≠ bountyId (djb2 on-chain) — fundamentally different values
- **F-4**: Amount stored as Float (ALGO) in DB vs uint64 (microAlgos) on-chain — 1,000,000x mismatch

### What's Missing
- Contract fund verification in `create_bounty`
- Consistent hash algorithm across all layers
- Type alignment for amounts (microAlgos everywhere)
- Proper error handling when on-chain creation fails but DB record was created
- Bounty amount minimum enforcement on-chain

### How It Should Work
```
User enters amount (ALGO)
  → Frontend converts to microAlgos
  → Frontend builds atomic group:
      [0] Payment to app address (amount + box MBR)
      [1] App call: create_bounty(bountyId, amountMicroAlgos)
  → Contract verifies payment in group matches bounty_total_value
  → Contract creates box record with verified amount
  → Frontend sends txId + amount to backend
  → Backend stores bounty with amount in microAlgos
  → x402 payment completes registration
```

---

## Stage 4: Oracle Verification — ❌ INCOMPLETE

### What Exists
- **Backend**: `OracleService.validateBounties()` — cron every 5 min
- **Backend**: `GithubService.getIssueClosureInfo()` — GraphQL query for closure events
- **Backend**: `GithubService.getIssueEvents()` — REST API for event history
- **Flow**: Oracle checks GitHub events → identifies closed issues → sets status to READY_FOR_CLAIM (with winner) or REFUNDABLE (not_planned)

### What's Present
- GitHub GraphQL + REST API integration
- `If-Modified-Since` for efficient polling
- Identity attribution: commit author priority, then close actor fallback
- `state_reason` parsing (completed vs not_planned)
- `processedEventId` tracking to prevent double-processing
- Mutex to prevent concurrent oracle runs

### What's BROKEN
- **F-7**: Oracle has no on-chain authorization — fully custodial
- No on-chain proof that the winner actually solved the issue
- Oracle decides winner off-chain, manager wallet executes withdrawal

### What's Missing
- On-chain winner authorization method in contract
- Identity verification linking GitHub account → wallet address
- Frontend UI for oracle status / winner notification
- Manual winner dispute or override mechanism
- Oracle failure/retry logic with dead letter queue

### How It Should Work
```
Oracle detects issue closed as "completed"
  → Identifies winner via commit author or close actor
  → Matches winner to wallet address (requires user registration)
  → Calls on-chain: authorize_winner(bounty_id, winner_address)
  → Winner sees "Claim Bounty" button in UI
  → Winner calls on-chain: claim(bounty_id)
  → Contract sends funds to winner's wallet
```

---

## Stage 5: Fund Withdrawal — ⚠️ BROKEN

### What Exists
- **Backend**: `BountiesController.claimBounty()` — POST endpoint
- **Backend**: `AlgorandService.withdrawBounty()` — calls contract
- **Contract**: `withdraw_bounty(bounty_id, winner)` — manager-only
- **Frontend**: BountyPage has "Claim Bounty" button (but shown for wrong status)

### What's BROKEN
- **F-5**: Backend passes address string where contract expects `Account`
- **F-6**: No refund mechanism — funds locked forever if no winner
- **F-8**: Claim button shown for OPEN bounties instead of READY_FOR_CLAIM
- Manager-only withdrawal means the winner can never claim directly
- No on-chain winner authorization — backend just asserts wallet address match

### What's Missing
- Refund method in contract + backend
- Self-claim flow (winner calls claim directly)
- Proper status-based UI (button only for READY_FOR_CLAIM)
- Expiry/deadline mechanism
- Fund reclaim UI for REFUNDABLE bounties

### How It Should Work
```
Happy path (winner claims):
  Oracle authorizes winner on-chain
  → Winner connects wallet on BountyPage
  → UI shows "Claim Bounty" (status = READY_FOR_CLAIM)
  → Winner clicks claim
  → Frontend calls contract: claim(bounty_id)
  → Contract verifies msg.sender == authorized_winner
  → Contract sends inner payment to winner
  → Backend updates status to CLAIMED

Refund path (no winner):
  Oracle marks REFUNDABLE in DB
  → Creator sees "Reclaim Funds" button
  → Creator clicks reclaim
  → Frontend calls contract: refund(bounty_id, creator_address)
  → Contract verifies manager authorization
  → Contract sends inner payment back to creator
  → Backend updates status to REFUNDED
```

---

## Stage 6: Refund / Reclaim — ❌ MISSING ENTIRELY

### What Exists
- DB has `REFUNDABLE` status in `BountyStatus` enum
- Oracle sets status to `REFUNDABLE` when issue closed as "not_planned"

### What's Missing
- Contract has no `refund_bounty` method
- Backend has no refund endpoint
- Frontend has no refund UI
- There is no way for a creator to get their money back

---

## Authentication — ❌ MISSING ENTIRELY

### What Exists
- Frontend has Web3Auth integration (`Web3AuthContext.tsx`)
- Frontend has wallet connection (`WalletManager`, Pera/Defly/Exodus)
- `ProfilePage.tsx` reads `githubHandle` from localStorage

### What's Missing
- No auth guard on any backend endpoint
- No JWT/session validation
- No wallet signature verification on backend
- No GitHub OAuth linking
- Anyone can call any API endpoint with no identity check

---

## User Profiles — ❌ MISSING

### What Exists
- Frontend route `/profile/:walletAddress`
- Shows hardcoded avatar from GitHub username (from localStorage)
- Shows hardcoded zeros for Projects, Bounties, Wins

### What's Missing
- No backend endpoint to fetch user data
- No relationship between wallet address and GitHub handle in DB
- User model exists in Prisma but only populated by oracle on winner creation
- No user registration flow
- No way to link wallet ↔ GitHub account

---

## Search & Filter — ❌ MISSING

### What Exists
- Nothing

### What's Missing
- No search endpoint
- No filter query params on list endpoints
- No search UI in frontend
- No category filter, status filter, or text search

---

## Transaction History — ❌ MISSING

### What Exists
- `AlgorandService.getBountyCreationTransactions()` queries indexer (used by sync)
- No persistent record of transactions

### What's Missing
- No Transaction model in DB
- No endpoint to list user's transactions
- No frontend transaction history view
- No audit trail of deposits, withdrawals, refunds

---

## Notifications — ❌ MISSING

### What Exists
- Nothing

### What's Missing
- No notification system (in-app or email)
- No alert when bounty status changes
- No reminder for REFUNDABLE bounties
- No notification to winner when READY_FOR_CLAIM

---

## Pagination — ❌ MISSING

### What Exists
- Nothing

### What's Missing
- No `?page=&limit=` query params
- No `?offset=&cursor=` support
- All list endpoints return full dataset
- Frontend loads everything at once

---

## x402 Payment — ✅ WORKS

### What Exists
- Backend middleware gates `POST /api/bounties`
- Frontend handles 402 response with payment preview UI
- Two-phase flow: on-chain creation → x402 payment → server registration

### What's Present
- `@x402-avm/express` middleware integration
- Payment requirements parsing from 402 response
- USDC micropayment on Algorand TestNet
- Facilitator integration (GoPlausible public facilitator)

### What's Fine for MVP
- Only gates bounty creation (not projects or reads)
- Price is $0.01 (configurable)
- Works as an additional revenue/spam mechanism
