# CORE_FEATURES_PLAN.md — Actionable Plan

**Goal**: Make the 5 core bounty lifecycle stages + essential cross-cutting concerns work correctly, securely, and end-to-end.

**Total estimated effort**: 15 working days across 7 phases.

---

## Phase 1: Fix the Contract (Days 1–3)

The contract is the source of truth for funds. Every other layer follows it. Fix it first.

### 1.1 — Add access control to `create_bounty`
**File**: `contracts/smart_contracts/source_factory/contract.algo.ts`
**Effort**: 2 hours

Add a check that `create_bounty` is only callable by the manager:
```ts
assert(Txn.sender === this.MANAGER_ADDRESS.value, 'Only manager')
```

This means only the backend (with `MANAGER_MNEMONIC`) can create bounty records. The frontend sends funds to the contract but the backend is the one that creates the on-chain record. This prevents front-running.

**Alternative (preferred)**: Keep `create_bounty` open but verify the grouped payment. This lets users transact directly:
```ts
// Verify payment transaction exists and matches
assert(gtxn[0].Amount >= bounty_total_value, 'Deposit mismatch')
assert(gtxn[0].Receiver == Global.currentApplicationAddress, 'Deposit to wrong address')
```

**Decision needed**: Which approach — manager-only or payment-verified?

### 1.2 — Add fund verification to `create_bounty`
**File**: `contracts/smart_contracts/source_factory/contract.algo.ts`
**Effort**: 3 hours

Regardless of access control choice, verify funds are actually deposited. Check the app account balance increased:
```ts
const balanceBefore = op.balance(Global.currentApplicationAddress)
// ... (payment tx should be in group before this call)
assert(op.balance(Global.currentApplicationAddress) - balanceBefore >= bounty_total_value)
```

### 1.3 — Add `refund_bounty` method
**File**: `contracts/smart_contracts/source_factory/contract.algo.ts`
**Effort**: 4 hours

```ts
@abi.readonly(false)
public refund_bounty(bounty_id: arc4.Uint64, recipient: Account) {
    assert(Txn.sender === this.MANAGER_ADDRESS.value, 'Only manager')
    const bounty = this.bounties(bounty_id)
    assert(bounty.exists, 'Bounty not found')
    const data = bounty.value.copy()
    assert(!data.bountyPaid.value, 'Bounty already paid')

    // Send funds back
    itxn.Payment({
        receiver: recipient,
        amount: data.bountyTotalValue.value,
        fee: 0,
    }).submit()

    data.bountyPaid = new arc4.Bool(true)
    bounty.value = data.copy()
}
```

### 1.4 — Add `revoke_bounty` for expired bounties
**File**: `contracts/smart_contracts/source_factory/contract.algo.ts`
**Effort**: 3 hours

Add optional deadline to bounty data. After deadline, creator can reclaim:
```ts
// Extend BountyDataType with deadline
struct BountyDataType {
    bountyTotalValue: arc4.Uint64,
    bountyPaid: arc4.Bool,
    bountyWinner: arc4.Address,
    deadline: arc4.Uint64,  // Unix timestamp, 0 = no deadline
}

public revoke_bounty(bounty_id: arc4.Uint64, recipient: Account) {
    assert(Txn.sender === this.MANAGER_ADDRESS.value, 'Only manager')
    const bounty = this.bounties(bounty_id)
    assert(bounty.exists, 'Bounty not found')
    const data = bounty.value.copy()
    assert(!data.bountyPaid.value, 'Bounty already paid')
    assert(data.deadline.value > 0 && Global.latestTimestamp >= data.deadline.value, 'Not expired')

    itxn.Payment({
        receiver: recipient,
        amount: data.bountyTotalValue.value,
        fee: 0,
    }).submit()

    data.bountyPaid = new arc4.Bool(true)
    bounty.value = data.copy()
}
```

### 1.5 — Update ARC-56 spec + regenerate client
**Effort**: 1 hour

```bash
cd contracts && algokit project run build
```

Copy new `SourceFactory.arc56.json` to server artifacts. Regenerate `SourceFactoryClient.ts` in client:
```bash
npx @algorandfoundation/algokit-client-generator generate \
  --appSpec contracts/smart_contracts/artifacts/source_factory/SourceFactory.arc56.json \
  --output client/src/contracts/SourceFactoryClient.ts
```

### 1.6 — Deploy updated contract to TestNet
**Effort**: 1 hour
- Deploy via `deploy-config.ts`
- Update `VITE_SOURCE_FACTORY_APP_ID` and `SOURCE_FACTORY_APP_ID` env vars
- Run bootstrap if new deployment

---

## Phase 2: Fix Type Alignment (Day 4)

### 2.1 — Change Prisma `amount` from Float to Int (microAlgos)
**File**: `server/prisma/schema.prisma`
**Effort**: 1 hour

```prisma
model Bounty {
    // ...
    amount Int  // microAlgos (uint64 on-chain)
    // ...
}
```

Run migration:
```bash
npx prisma migrate dev --name amount-to-microalgos
```

### 2.2 — Standardize on djb2 hash everywhere
**Files**:
- `server/src/bounties/bounties.service.ts` — remove `buildBountyKey` (SHA256), use `computeBountyId` (djb2) for both
- `server/prisma/schema.prisma` — change `bountyKey` field type to `String` but store djb2 as hex

**Effort**: 2 hours

Replace:
```ts
// REMOVE this method
private buildBountyKey(owner: string, repo: string, issue: number): string {
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// USE this everywhere
private computeBountyIdHex(owner: string, repo: string, issue: number): string {
    const id = this.computeBountyId(owner, repo, issue);
    return id.toString(16).padStart(16, '0'); // 16 hex chars = 8 bytes
}
```

### 2.3 — Convert ALGO to microAlgos at API boundary
**File**: `server/src/bounties/bounties.service.ts` + `server/src/bounties/dto/create-bounty.dto.ts`
**Effort**: 2 hours

Option A: Accept microAlgos in the API (cleanest):
```ts
// create-bounty.dto.ts
amount: number  // now means microAlgos
```

Option B: Keep ALGO in API, convert in service:
```ts
// bounties.service.ts
const amountMicroAlgos = Math.round(payload.amount * 1_000_000);
```

**Recommendation**: Option B — keeps API human-friendly, converts in service.

### 2.4 — Update frontend to send ALGO amount (not microAlgos to API)
**File**: `client/src/services/api.ts`
**Effort**: 30 min

The frontend already sends ALGO to the API. Just verify the conversion path:
```
User types "10" ALGO
  → api.ts sends { amount: 10 } to backend
  → Backend stores 10_000_000 microAlgos in DB
  → Frontend sends 10_000_000 microAlgos to contract
  → Contract stores 10_000_000
  → Sync compares: DB 10_000_000 == Chain 10_000_000 ✅
```

### 2.5 — Update `syncFromChain` to use consistent types
**File**: `server/src/bounties/bounties.service.ts`
**Effort**: 1 hour

Fix `syncFromChain` to compare microAlgos:
```ts
const dbAmount = existingBounty.amount; // microAlgos (Int)
const chainAmount = Number(onChainBounty.totalValue); // microAlgos (uint64)
if (dbAmount !== chainAmount) {
    // Update
}
```

---

## Phase 3: Authentication (Days 5–6)

### 3.1 — Add wallet signature verification to backend
**Files**: New file `server/src/auth/auth.guard.ts`, `server/src/auth/auth.module.ts`
**Effort**: 4 hours

Create a simple guard that verifies an Algorand wallet-signed message:
```ts
// Verify: signature, public key, message
// Message format: "WeSource login: {timestamp}"
// Reject if timestamp > 5 minutes old
```

Use `algosdk.verifyBytes()` for verification.

### 3.2 — Add auth to mutating endpoints
**Files**: All controllers
**Effort**: 2 hours

```ts
@UseGuards(WalletAuthGuard)
@Post()
create() { ... }

@UseGuards(WalletAuthGuard)
@Delete(':id')
remove() { ... }
```

Read-only endpoints (`GET`) stay public.

### 3.3 — Link wallet to GitHub handle
**Files**: `server/prisma/schema.prisma`, new `server/src/auth/auth.service.ts`
**Effort**: 3 hours

```prisma
model User {
    id         Int      @id @default(autoincrement())
    githubId   Int      @unique
    username   String?
    wallet     String?  @unique  // Link wallet to user
    // ...
}
```

Login flow:
1. Frontend connects wallet
2. Frontend signs message with wallet
3. Frontend sends signature + wallet address + GitHub username
4. Backend verifies signature → upserts User with wallet address
5. Backend returns JWT or session token

### 3.4 — Frontend login flow
**Files**: `client/src/components/WalletMenu.tsx`, new `client/src/hooks/useAuth.ts`
**Effort**: 4 hours

Add "Connect GitHub" step after wallet connection:
- Wallet connected → prompt for GitHub username
- Sign login message → get JWT
- Store JWT in memory (not localStorage)
- Include JWT in API requests

---

## Phase 4: Claim Flow — End-to-End (Days 7–9)

### 4.1 — Backend: claim endpoint verification
**File**: `server/src/bounties/bounties.controller.ts`
**Effort**: 2 hours

```ts
@UseGuards(WalletAuthGuard)
@Post('claim')
async claimBounty(@Body() dto: ClaimBountyDto, @WalletAddress() wallet: string) {
    // Verify bounty is READY_FOR_CLAIM
    // Verify authenticated wallet matches bounty.winner.wallet
    // Call contract withdraw_bounty
    // Update DB status to CLAIMED
}
```

### 4.2 — Frontend: fix claim button logic
**File**: `client/src/pages/BountyPage.tsx`
**Effort**: 1 hour

```tsx
{bounty.status === 'READY_FOR_CLAIM' && isConnected && isWinner ? (
    <button onClick={handleClaim}>Claim Bounty</button>
) : bounty.status === 'OPEN' ? (
    <div>Solve this issue on GitHub to win this bounty</div>
) : bounty.status === 'READY_FOR_CLAIM' && !isWinner ? (
    <div>This bounty has been awarded to {winnerName}</div>
) : bounty.status === 'CLAIMED' ? (
    <div>This bounty has been claimed</div>
) : bounty.status === 'REFUNDABLE' && isCreator ? (
    <button onClick={handleRefund}>Reclaim Funds</button>
) : null}
```

### 4.3 — Backend: fix `withdrawBounty` to pass correct types
**File**: `server/src/algorand/algorand.service.ts`
**Effort**: 1 hour

Verify the ARC-56 client encoding. If `winner` param is `address` in the spec, passing a string works. If `Account`, convert first. Test with:
```ts
const appClient = this.algorand.client.getTypedAppClientById(SourceFactoryClient, {
    appId: this.appId,
    defaultSender: this.managerAddress,
});
// Verify args encoding
const result = await appClient.send.call({
    method: 'withdraw_bounty',
    args: [bountyId, winnerWallet], // should work if spec says address
});
```

### 4.4 — Frontend: direct on-chain claim (Phase 2 enhancement)
**Files**: `client/src/services/bountyContract.ts`, `client/src/pages/BountyPage.tsx`
**Effort**: 4 hours

Add a `claimBountyOnChain` function:
```ts
export async function claimBountyOnChain(params: {
    repoOwner: string;
    repoName: string;
    issueNumber: number;
    senderAddress: string;
    signer: TransactionSigner;
}): Promise<{ txId: string }> {
    const bountyId = computeBountyId(params.repoOwner, params.repoName, params.issueNumber);
    const appClient = algorand.client.getTypedAppClientById(SourceFactoryClient, {
        appId: SOURCE_FACTORY_APP_ID,
        defaultSender: params.senderAddress,
    });

    const boxKey = buildBoxKey(bountyId);
    const result = await appClient.send.call({
        method: 'claim', // or 'withdraw_bounty' if manager-only stays
        args: [bountyId],
        boxReferences: [{ appId: SOURCE_FACTORY_APP_ID, name: boxKey }],
    });

    return { txId: result.txIds[0] };
}
```

### 4.5 — Backend: winner wallet verification
**File**: `server/src/bounties/bounties.service.ts`
**Effort**: 2 hours

During oracle validation, link winner to wallet:
```ts
// In OracleService.validateSingleBounty():
// After upserting winner user, verify they have a wallet address
const winner = await tx.user.findUnique({ where: { githubId: winnerId } });
if (!winner?.wallet) {
    // Bounty is READY_FOR_CLAIM but winner hasn't registered yet
    // Set status, winner will claim when they connect wallet
}
```

Add endpoint to link wallet to existing winner user:
```ts
@Post('link-wallet')
@UseGuards(WalletAuthGuard)
async linkWalletToGithub(@Body() dto: { githubUsername: string }, @WalletAddress() wallet: string) {
    // Find user by username, set wallet address
    // This enables them to claim
}
```

---

## Phase 5: Refund Flow (Day 10)

### 5.1 — Backend: refund endpoint
**File**: `server/src/bounties/bounties.controller.ts`
**Effort**: 2 hours

```ts
@UseGuards(WalletAuthGuard)
@Post(':id/refund')
async refundBounty(@Param('id', ParseIntPipe) id: number, @WalletAddress() wallet: string) {
    const bounty = await this.bountiesService.findOne(id);

    if (bounty.status !== 'REFUNDABLE') {
        throw new HttpException('Bounty is not refundable', HttpStatus.BAD_REQUEST);
    }
    if (bounty.creatorWallet !== wallet) {
        throw new HttpException('Only the creator can refund', HttpStatus.FORBIDDEN);
    }

    // Call contract refund_bounty
    await this.algorandService.refundBounty(
        bounty.repository.owner, // need to store this
        bounty.repository.name,
        bounty.issueNumber,
        bounty.creatorWallet,
    );

    // Update DB
    await this.bountiesService.updateStatus(id, 'REFUNDED');

    return { message: 'Bounty refunded successfully' };
}
```

### 5.2 — Backend: add `refundBounty` to AlgorandService
**File**: `server/src/algorand/algorand.service.ts`
**Effort**: 1 hour

```ts
async refundBounty(owner: string, repo: string, issueNumber: number, creatorWallet: string): Promise<{ txId: string }> {
    const bountyId = this.computeBountyId(owner, repo, issueNumber);
    const boxKey = this.buildBoxKey(bountyId);

    const appClient = this.algorand.client.getAppClientById({
        appSpec: this.appSpec,
        appId: this.appId,
        defaultSender: this.managerAddress,
    });

    const result = await appClient.send.call({
        method: 'refund_bounty',
        args: [bountyId, creatorWallet],
        boxReferences: [{ appId: this.appId, name: boxKey }],
    });

    return { txId: result.txIds[0] };
}
```

### 5.3 — Frontend: refund UI
**File**: `client/src/pages/BountyPage.tsx`
**Effort**: 2 hours

```tsx
{bounty.status === 'REFUNDABLE' && isCreator && (
    <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
        <h3 className="font-bold">Bounty Refundable</h3>
        <p>This issue was closed without a solution. You can reclaim your funds.</p>
        <button onClick={handleRefund} className="btn-primary">
            Reclaim {bounty.amount} ALGO
        </button>
    </div>
)}
```

### 5.4 — Add `REFUNDED` to BountyStatus enum
**File**: `server/prisma/schema.prisma`
**Effort**: 5 min

```prisma
enum BountyStatus {
    OPEN
    READY_FOR_CLAIM
    CLAIMED
    CANCELLED
    REFUNDABLE
    REFUNDED    // ← add this
}
```

---

## Phase 6: User Profiles & Wallet Linking (Days 11–12)

### 6.1 — Backend: user endpoints
**Files**: New `server/src/users/users.controller.ts`, `server/src/users/users.service.ts`
**Effort**: 3 hours

```ts
@Controller('users')
export class UsersController {
    @Get(':walletAddress')
    async getUser(@Param('walletAddress') wallet: string) {
        // Return user + created bounties + won bounties + projects
    }

    @Get(':walletAddress/bounties')
    async getUserBounties(@Param('walletAddress') wallet: string) {
        // Return bounties created by this wallet
    }

    @Get(':walletAddress/wins')
    async getUserWins(@Param('walletAddress') wallet: string) {
        // Return bounties won by this user
    }
}
```

### 6.2 — Backend: link wallet ↔ GitHub
**File**: `server/src/auth/auth.service.ts`
**Effort**: 2 hours

During auth, upsert user with both wallet and GitHub:
```ts
async linkIdentity(wallet: string, githubUsername: string, githubId: number) {
    return this.prisma.user.upsert({
        where: { wallet },
        update: { username: githubUsername, githubId },
        create: { wallet, username: githubUsername, githubId },
    });
}
```

### 6.3 — Frontend: profile page with real data
**File**: `client/src/pages/ProfilePage.tsx`
**Effort**: 3 hours

```tsx
useEffect(() => {
    async function loadProfile() {
        const [profile, bounties, wins] = await Promise.all([
            fetchUser(walletAddress),
            fetchUserBounties(walletAddress),
            fetchUserWins(walletAddress),
        ]);
        setUser(profile);
        setBounties(bounties);
        setWins(wins);
    }
    loadProfile();
}, [walletAddress]);

// Replace hardcoded zeros with real counts
<div>{projects.length} Projects</div>
<div>{bounties.length} Bounties</div>
<div>{wins.length} Wins</div>
```

---

## Phase 7: Cross-Cutting — Search, Pagination, Notifications (Days 13–15)

### 7.1 — Backend: pagination for list endpoints
**Files**: All controllers + services
**Effort**: 3 hours

```ts
// projects.controller.ts
@Get()
async findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.projectsService.findAll({ page, limit, search });
}

// projects.service.ts
async findAll(params: { page: number; limit: number; search?: string }) {
    const where = params.search ? {
        OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { description: { contains: params.search, mode: 'insensitive' } },
        ],
    } : {};

    const [data, total] = await Promise.all([
        this.prisma.project.findMany({
            where,
            skip: (params.page - 1) * params.limit,
            take: params.limit,
            include: { repositories: true },
            orderBy: { createdAt: 'desc' },
        }),
        this.prisma.project.count({ where }),
    ]);

    return { data, total, page: params.page, limit: params.limit };
}
```

### 7.2 — Backend: bounty filters
**File**: `server/src/bounties/bounties.service.ts`
**Effort**: 2 hours

```ts
async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    repoOwner?: string;
    repoName?: string;
    minAmount?: number;
    maxAmount?: number;
}) { ... }
```

### 7.3 — Frontend: search bar + filters
**File**: `client/src/pages/Home.tsx` or new component
**Effort**: 4 hours

```tsx
<input type="text" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
    <option value="">All Status</option>
    <option value="OPEN">Open</option>
    <option value="READY_FOR_CLAIM">Ready to Claim</option>
    <option value="CLAIMED">Claimed</option>
</select>
```

### 7.4 — Backend: in-app notifications
**Files**: New `server/src/notifications/` module
**Effort**: 4 hours

```prisma
model Notification {
    id        Int      @id @default(autoincrement())
    userId    Int
    user      User     @relation(fields: [userId], references: [id])
    type      String   // BOUNTY_READY, BOUNTY_REFUNDABLE, BOUNTY_CLAIMED
    message   String
    bountyId  Int?
    read      Boolean  @default(false)
    createdAt DateTime @default(now())
}
```

Endpoints:
```ts
@Get()
async getNotifications(@WalletAddress() wallet: string) { ... }

@Patch(':id/read')
async markRead(@Param('id') id: number) { ... }
```

### 7.5 — Frontend: notification bell
**Effort**: 3 hours

Add notification indicator to header, dropdown with recent notifications, link to bounty pages.

---

## Verification Checklist

After each phase, run through this checklist:

### Contract Tests
```bash
cd contracts && algokit project run test
```
- [ ] `create_bounty` fails without deposit verification
- [ ] `create_bounty` succeeds with matching deposit
- [ ] `withdraw_bounty` only works for manager
- [ ] `refund_bounty` returns funds to creator
- [ ] `revoke_bounty` works after deadline
- [ ] Box data format matches ARC-56 spec

### Backend Tests
```bash
cd server && npm run test
```
- [ ] `POST /projects` requires auth (401 without token)
- [ ] `POST /api/bounties` requires auth + x402
- [ ] `POST /api/bounties/claim` verifies winner identity
- [ ] Amounts stored as microAlgos in DB
- [ ] `bountyKey` uses djb2 hash (matches contract)
- [ ] Oracle sets correct statuses

### Frontend Tests
```bash
cd client && npm run test
```
- [ ] Claim button only shows for READY_FOR_CLAIM
- [ ] Refund button only shows for REFUNDABLE + creator wallet
- [ ] Profile page fetches real data
- [ ] Search filters projects/bounties

### End-to-End (Manual)
- [ ] Create project → see issues → create bounty → see in list
- [ ] Bounty amount matches between DB, UI, and on-chain
- [ ] Oracle marks bounty READY_FOR_CLAIM when issue closed
- [ ] Winner can claim bounty (funds arrive in wallet)
- [ ] Creator can refund REFUNDABLE bounty (funds return)
- [ ] Auth protects all write endpoints

---

## Execution Order (Recommended)

```
Phase 1 (Contract) ──→ Phase 2 (Types) ──→ Phase 3 (Auth)
                                               │
                                               ├──→ Phase 4 (Claim Flow)
                                               │
                                               └──→ Phase 5 (Refund Flow)
                                                        │
                                                        └──→ Phase 6 (Profiles)
                                                               │
                                                               └──→ Phase 7 (Search/Pagination/Notifications)
```

Phases 1 and 2 are unblocked prerequisites. Phase 3 (Auth) blocks Phases 4, 5, 6. Phases 4 and 5 can run in parallel. Phase 7 is independent.

**Critical path**: 1 → 2 → 3 → 4/5 → 6 → 7
**Total**: 15 working days
**Minimum viable fix**: Phases 1–4 (10 days) gets the core lifecycle working
