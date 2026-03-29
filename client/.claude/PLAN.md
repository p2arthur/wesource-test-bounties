# Frontend Dev — Functional MVP Plan

**Last Updated:** 2026-03-29
**Scope:** Phases 3–7 — Auth, Claim, Refund, Profiles, Search
**Status:** UI overhaul complete. Functional work starts now.

---

## Phase 3: Authentication UI

### Task 3.1: Create `useAuth` Hook
- [ ] Create `src/hooks/useAuth.ts`
- [ ] Flow: wallet connected → sign login message → send to backend → store JWT in memory
- [ ] Provide: `isAuthenticated`, `token`, `login`, `logout`
- [ ] Commit

### Task 3.2: Update WalletMenu with GitHub Linking
- [ ] Update `WalletMenu.tsx` — after wallet connects, show "Connect GitHub" step
- [ ] Input for GitHub username → sign → send to backend → show linked status
- [ ] Commit

### Task 3.3: Attach Auth Headers to API Calls
- [ ] Update `api.ts` — add `Authorization: Bearer {token}` to POST/PUT/DELETE
- [ ] Handle 401 → redirect to login
- [ ] GET requests stay unauthenticated
- [ ] Commit

---

## Phase 4: Claim Flow UI

### Task 4.1: Fix Claim Button Logic
- [ ] Open `BountyPage.tsx`
- [ ] Replace claim button with correct conditional:
  - OPEN → "Solve this issue on GitHub"
  - READY_FOR_CLAIM + isWinner → "Claim Bounty" button
  - READY_FOR_CLAIM + !isWinner → "Awarded to {winner}"
  - CLAIMED → "Claimed"
- [ ] Commit

### Task 4.2: Add `claimBountyOnChain` Function
- [ ] Add to `bountyContract.ts`:
  ```ts
  export async function claimBountyOnChain(params: {
    repoOwner: string; repoName: string; issueNumber: number;
    senderAddress: string; signer: TransactionSigner;
  }): Promise<{ txId: string }>
  ```
- [ ] Use `SourceFactoryClient` `claim` method + box reference
- [ ] Commit

### Task 4.3: Connect Claim Button to Backend + On-Chain
- [ ] Claim click → `POST /api/bounties/claim` (backend verifies auth + winner)
- [ ] Backend approves → call `claimBountyOnChain` (on-chain)
- [ ] Update UI → show "Claimed" status
- [ ] Handle errors: not winner, not ready, tx failed
- [ ] Commit

---

## Phase 5: Refund Flow UI

### Task 5.1: Add Refund UI to BountyPage
- [ ] Add to `BountyPage.tsx`:
  - REFUNDABLE + isCreator → refund button + warning styling
  - `handleRefund` → `POST /api/bounties/:id/refund`
  - Update UI on success → REFUNDED status
- [ ] Commit

---

## Phase 6: User Profiles

### Task 6.1: Update ProfilePage with Real Data
- [ ] Open `ProfilePage.tsx`
- [ ] Replace hardcoded zeros with API calls:
  ```ts
  const [profile, bounties, wins] = await Promise.all([
    fetchUser(walletAddress),
    fetchUserBounties(walletAddress),
    fetchUserWins(walletAddress),
  ]);
  ```
- [ ] Show real counts
- [ ] Commit

---

## Phase 7: Search, Pagination, Notifications

### Task 7.1: Search Bar + Status Filter
- [ ] Add search input + status dropdown to Home
- [ ] Wire to `?search=&status=` query params
- [ ] Debounce search (300ms)
- [ ] Commit

### Task 7.2: Pagination Controls
- [ ] Add Previous/Next controls below lists
- [ ] Read `page`/`limit` from URL params
- [ ] Update API calls with `?page=&limit=`
- [ ] Commit

### Task 7.3: Notification Bell
- [ ] Add bell icon to HeaderBar
- [ ] Dropdown with notifications from `GET /notifications`
- [ ] Unread count badge
- [ ] Click → navigate to bounty, mark as read
- [ ] Commit

---

## Completion Criteria

- [ ] All tasks across Phases 3–7 done
- [ ] `npm run build` passes
- [ ] Browser testing: all flows end-to-end
- [ ] Loading, error, empty states handled everywhere
- [ ] MEMORY.md updated with decisions
- [ ] Report done
