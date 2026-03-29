# MEMORY.md — Working Scratchpad

## Architectural Facts

**Project Summary**: WeSource is a decentralized open-source bounty platform on Algorand. Users register GitHub projects, create bounties for issues, and the platform manages escrow and automated prize distribution. The system has three layers: React/Vite frontend (`/client`), NestJS backend (`/server`), and Algorand smart contract (`/contracts`).

**Smart Contract (SourceFactory)**:
- 3 ABI methods: `bootstrap()void`, `create_bounty(uint64,uint64)void`, `withdraw_bounty(uint64,address)void`
- 2 GlobalState keys: `MANAGER_ADDRESS` (Account), `TOTAL_BOUNTIES` (uint64)
- 1 BoxMap: `b__` prefix, key=BountyIdType(bounty_id:Uint64), value=BountyDataType(total_value:Uint64, paid:Bool, winner:Address)
- `create_bounty` = no access control (any caller)
- `withdraw_bounty` = manager-only (assert_manager)
- Inner payment on withdraw: receiver=winner, amount=bounty_total_value, fee=0
- No expiry/deadline mechanism, no refund path, no reclaim by creator

**Backend (NestJS)**:
- Modules: PrismaModule, GithubModule, ProjectsModule, BountiesModule, AlgorandModule, SeedModule, OracleModule
- DB: PostgreSQL via Prisma. Models: Project, Repository, Bounty, User
- BountyStatus enum: OPEN, READY_FOR_CLAIM, CLAIMED, CANCELLED, REFUNDABLE
- Bounty.amount = Float (Prisma)
- Oracle: cron every 5 min, validates via GitHub GraphQL/REST API events
- AlgorandService: uses djb2 hash for bounty ID, algosdk for box reads, ARC-56 client for writes
- Manager wallet = `MANAGER_MNEMONIC` env var
- x402 middleware: gates `POST /api/bounties` behind USDC micropayment (optional)

**Frontend (React/Vite)**:
- Routes: `/` (Home), `/project/:projectId`, `/bounty/:bountyId`, `/profile/:walletAddress`
- Wallet: use-wallet-react (Pera, Defly, Exodus, KMD for localnet)
- `bountyContract.ts`: creates atomic group (payment + app call) via AlgorandClient
- `api.ts`: REST calls to backend, x402 preflight flow
- `CreateBountyModal.tsx`: two-phase flow (on-chain + x402 payment)

**Bounty ID Computation**:
- All three layers use djb2 hash of `owner|repo|issueNumber` (case-insensitive, trimmed)
- Backend `buildBountyKey` uses SHA256 (different from djb2 bountyId!)
- Two different "keys": bountyId (djb2, on-chain) vs bountyKey (SHA256, off-chain DB)

---

## Open Questions

- [ ] Bounty.amount in Prisma is Float but contract expects uint64 microAlgos — where is the conversion?
- [ ] `create_bounty` has no sender restriction — anyone can call it for any bountyId. Is this intentional?
- [ ] Backend `withdraw_bounty` passes `winnerWallet` (string) as second arg to contract's `withdraw_bounty(bounty_id: uint64, winner: Account)`. Does the ARC-56 client auto-convert address string to Account?
- [ ] No refund path on-chain. If no one solves, can creator reclaim?
- [ ] AlgorandService.getOnChainBounties() parses box data manually — is the struct layout correct?
- [ ] BountyPage.tsx has a "Claim Bounty" button for OPEN bounties, but claim flow requires READY_FOR_CLAIM status. Bug?
- [ ] The `createBountyOnChain` in frontend doesn't pass `creatorWallet` or `repoOwner/repoName` — only bounty_id and bounty_total_value go on-chain. How does the contract know who funded it?
- [ ] Docs say USDC but system uses ALGO/microAlgos. Which is correct?
- [ ] Oracle calls are all off-chain. There's no on-chain authorization for the oracle.

---

## Findings (Raw)

### CRITICAL

**F-1: Contract `create_bounty` has no access control**
- File: `contracts/smart_contracts/source_factory/contract.algo.ts:27-37`
- Anyone can call `create_bounty(bountyId, bountyValue)` for any bountyId. A malicious actor could call `create_bounty` with a victim's bountyId before the victim does, creating a box record with 0 value. When the victim then sends funds and calls `create_bounty`, it fails with "Bounty already exists".
- Impact: Denial of service on bounty creation. Attacker front-runs legitimate bounties.

**F-2: No fund deposit validation in contract `create_bounty`**
- File: `contracts/smart_contracts/source_factory/contract.algo.ts:27-37`
- The `create_bounty` method only creates a box record but doesn't verify that funds were actually deposited. The frontend sends a grouped payment + app call, but the contract doesn't assert that the payment amount matches `bounty_total_value`. A user could create a bounty record with 1000 ALGO value while only depositing 1 ALGO.
- Impact: Bounty records can lie about the amount of escrowed funds. Withdrawals will fail at `op.balance >= amount` check, but the DB will show inflated bounty amounts.

**F-3: Double-hash mismatch — bountyKey vs bountyId**
- Files:
  - `server/src/bounties/bounties.service.ts:393-406` (computeBountyId = djb2)
  - `server/src/bounties/bounties.service.ts:532-538` (buildBountyKey = SHA256)
  - `client/src/services/bountyContract.ts:14-27` (computeBountyId = djb2)
- The DB `bountyKey` field uses SHA256 while the on-chain `bountyId` uses djb2. They are fundamentally different values stored in the same Bounty record. The `bountyKey` in the DB cannot be used to look up the on-chain box.
- Impact: Confusion in sync operations. `syncFromChain` must re-compute djb2 from repo info for every bounty to match on-chain state.

### HIGH

**F-4: Bounty amount type mismatch — Float vs uint64**
- Files:
  - `server/prisma/schema.prisma:39` — `amount Float`
  - `server/src/bounties/dto/create-bounty.dto.ts:23` — `amount: number` (with maxDecimalPlaces: 4)
  - `client/src/services/bountyContract.ts:32-33` — `algoToMicroAlgo(algoAmount * 1_000_000)`
  - `contracts/smart_contracts/source_factory/contract.algo.ts:27` — `bounty_total_value: uint64`
- The Prisma schema stores bounty amount as a `Float`. The contract stores it as `uint64` microAlgos. There's no explicit conversion in the backend between the two. The frontend converts ALGO→microAlgos for the contract, but the backend stores whatever number the frontend sends (in ALGO) without conversion.
- Impact: Database stores amounts in ALGO (e.g., 10), contract stores in microAlgos (e.g., 10000000). When `syncFromChain` compares on-chain values to DB values, comparisons will be wrong.

**F-5: `withdraw_bounty` passes address string where contract expects Account**
- Files:
  - `server/src/algorand/algorand.service.ts:161` — `args: [bountyId, winnerWallet]` (winnerWallet = string)
  - `contracts/smart_contracts/source_factory/contract.algo.ts:39` — `winner: Account`
- The backend passes a string wallet address, but the contract parameter type is `Account`. The ARC-56 client may handle the conversion, but if it doesn't, the transaction will fail or produce incorrect behavior.
- Impact: Withdrawals may fail silently or produce unexpected results.

**F-6: No refund mechanism on-chain**
- Files:
  - `contracts/smart_contracts/source_factory/contract.algo.ts` — only `create_bounty` and `withdraw_bounty`
- The contract has no method for the creator to reclaim funds if a bounty expires or the issue is closed as "not_planned". The DB has `REFUNDABLE` status but there's no on-chain path to execute a refund.
- Impact: Funds are permanently locked if no winner is declared. The `REFUNDABLE` status in the DB is meaningless without an on-chain refund mechanism.

**F-7: Oracle has no on-chain authorization**
- Files:
  - `contracts/smart_contracts/source_factory/contract.algo.ts:39-63` — `withdraw_bounty` requires `Txn.sender === MANAGER_ADDRESS`
  - `server/src/algorand/algorand.service.ts:109` — manager = `algorand.account.fromMnemonic(managerMnemonic)`
- The oracle (backend) acts as the "manager" and calls `withdraw_bounty`. But the oracle verification is entirely off-chain. Anyone who obtains the `MANAGER_MNEMONIC` can withdraw any bounty to any address. There's no on-chain check that the winner actually solved the issue.
- Impact: Compromised mnemonic = all funds at risk. No on-chain verification of the oracle's decision.

### MEDIUM

**F-8: BountyPage "Claim Bounty" button shown for OPEN bounties**
- File: `client/src/pages/BountyPage.tsx:223-232`
- The "Claim Bounty" button is displayed when `isOpen && isConnected`, but the claim endpoint (`POST /api/bounties/claim`) requires status `READY_FOR_CLAIM`. Users can click "Claim" on an OPEN bounty, which will fail.
- Impact: Confusing UX. Users attempt claims that are guaranteed to fail.

**F-9: `create_bounty` in frontend sends payment but contract doesn't link payment to bounty**
- File: `client/src/services/bountyContract.ts:124-141`
- The frontend sends a grouped payment to the app address + `create_bounty` app call. But the contract's `create_bounty` doesn't verify that the payment was received or that the payment amount matches `bounty_total_value`. A user could create a bounty without actually funding it (by modifying the transaction).
- Impact: Bounty records without corresponding funds. Backend DB will show bounty as OPEN but withdrawals will fail.

**F-10: `getOnChainBounties()` manual box parsing may be incorrect**
- File: `server/src/algorand/algorand.service.ts:207-224`
- The code manually parses the BountyDataType struct: `totalValue` at bytes 0-7, `isPaid` at byte 8, `winner` at bytes 9-40. The ARC-4 struct encoding might not match this layout exactly — ARC-4 uses ABI encoding which could have different alignment.
- Impact: On-chain sync may read incorrect values, causing false CLAIMED statuses or wrong winner addresses.

**F-11: No authentication on API endpoints**
- Files:
  - `server/src/bounties/bounties.controller.ts` — no guards
  - `server/src/projects/projects.controller.ts` — no guards
- All endpoints are public. Anyone can create projects, create bounties, and trigger oracle validation. The docs mention "Public endpoints (MVP)" but this is a significant security gap.
- Impact: Anyone can spam the system, trigger expensive GitHub API calls, or manipulate bounty data.

**F-12: AlgorandService hardcodes method selector for indexer queries**
- File: `server/src/algorand/algorand.service.ts:300`
- `const createBountySelector = Buffer.from([0x2c, 0x5b, 0x7f, 0x85])` — this is hardcoded. If the contract is recompiled, the selector may change.
- Impact: `getBountyCreationTransactions()` will silently return no results if the selector doesn't match.

### LOW

**F-13: `githubIssueId` set to `BigInt(0)` on bounty creation**
- File: `server/src/bounties/bounties.service.ts:71` — `githubIssueId: BigInt(0)`
- The GitHub issue global ID is never populated. The field exists in the schema but is always zero.
- Impact: Unused field. Minor data integrity issue.

**F-14: Missing error handling in `getOnChainBounty`**
- File: `server/src/algorand/algorand.service.ts:265` — `catch { return null }`
- Silently swallows all errors. Network failures, box-not-found, and permission errors all return null.
- Impact: Impossible to diagnose why on-chain reads fail.

**F-15: Profile page shows hardcoded zeros**
- File: `client/src/pages/ProfilePage.tsx:42-53`
- Projects, Bounties, and Wins counts are hardcoded to 0. The page never fetches actual user data.
- Impact: Profile page is non-functional.

**F-16: `console.log` left in production code**
- File: `server/src/oracle/oracle.service.ts:120` — `console.log('Bounty data', bounty)`
- Leaks bounty data to stdout in production.
- Impact: Information disclosure, log pollution.

---

## Type Consistency Matrix (Draft)

| Data Field | Contract (Source of Truth) | Backend (Prisma) | Frontend (api.ts) | Status |
|---|---|---|---|---|
| Bounty Amount | uint64 (microAlgos) | Float | number (ALGO) | ❌ Mismatch |
| Bounty ID | uint64 (djb2 hash) | Int (autoincrement) | number (DB id) | ❌ Different identifiers |
| Bounty Key | — | String (SHA256) | string | ⚠️ Not on-chain |
| Status | paid:Bool, winner:Address | OPEN/READY/CLAIMED/CANCELLED/REFUNDABLE | string | ⚠️ Implicit mapping |
| Winner | Account (32 bytes) | User FK (Int) | number (id) | ❌ Different representations |
| Creator Wallet | — (not on-chain) | String | string | ⚠️ Only in DB |
| Issue Number | (in bountyId hash) | Int | number | ✅ Consistent |

---

## Archived

All findings have been moved to `AUDIT_REPORT.md`. See the report for full evidence, code paths, and recommendations.

---

## Report Meta

- **Date**: 2026-03-28
- **Files read**: 40+ source files across `/contracts`, `/server`, `/client`, `/docs`
- **Findings count**: 17 total (3 CRITICAL, 4 HIGH, 5 MEDIUM, 5 LOW)
- **Areas not fully audited**: Contract E2E tests (not run), frontend unit tests (not reviewed), deployment pipeline (not verified), seed module (utility only)
