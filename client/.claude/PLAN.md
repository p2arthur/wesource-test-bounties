# Frontend Dev — Functional MVP Plan

**Last Updated:** 2026-03-29
**Scope:** Phases 3–7 — Auth, Claim, Refund, Profiles, Search
**Status:** ✅ COMPLETE (Phases 3–7.1)

---

## Phase 3: Authentication UI ✅

### Task 3.1: Create `useAuth` Hook ✅
- [x] Enhanced `src/hooks/useAuth.ts` with JWT token management
- [x] Flow: wallet signature → backend login → JWT storage → included in headers
- [x] Exports: `token`, `isAuthenticated`, `login`, `logout`, `jwtToken`, `walletAddress`
- [x] Commit: `feat(auth): Phase 3.1 — useAuth hook with JWT token management`

### Task 3.2: Update WalletMenu with GitHub Linking ✅
- [x] Updated `WalletLinkModal.tsx` to use JWT tokens
- [x] Added "Link GitHub Account" button in `WalletMenu.tsx`
- [x] Modal accepts GitHub username and ID
- [x] Refactored GitHub username fetching
- [x] Commit: `feat(auth): Phase 3.2 — GitHub linking in WalletMenu`

### Task 3.3: Attach Auth Headers to API Calls ✅
- [x] Updated `api.ts` — JWT added to Authorization header
- [x] `claimBounty`, `linkWallet`, `refundBounty` all accept jwtToken
- [x] Error handling for 401 via `handleAuthError`
- [x] Commits: Multiple (see MEMORY.md)

---

## Phase 4: Claim Flow UI ✅

### Task 4.1: Claim Button Logic ✅
- [x] Button visibility rules in `BountyPage.tsx`:
  - OPEN → "Solve this issue on GitHub" message ✅
  - READY_FOR_CLAIM + isWinner → "Claim Bounty" button ✅
  - READY_FOR_CLAIM + !isWinner → "Awarded to {winner}" ✅
  - CLAIMED → "Claimed" success state ✅
- [x] Commit: `feat(bounty): Phase 4 — Claim Flow UI with JWT authentication`

### Task 4.2: On-Chain Integration ✅
- [x] Backend's `withdrawBounty` method handles on-chain
- [x] Not needed in frontend (backend abstracts this)
- [x] SourceFactoryClient available for future use

### Task 4.3: Connect to Backend + On-Chain ✅
- [x] Claim click → `POST /api/bounties/claim` with JWT
- [x] Ensures JWT authentication before claiming
- [x] Updates UI with new bounty status
- [x] Error handling via `handleAuthError`
- [x] Commit: included in Phase 4

---

## Phase 5: Refund Flow UI ✅

### Task 5.1: Add Refund UI to BountyPage ✅
- [x] Added to `BountyPage.tsx`:
  - REFUNDABLE + isCreator → refund button with destructive variant ✅
  - `handleRefund` → `POST /api/bounties/:id/refund` with JWT ✅
  - Updates UI on success ✅
- [x] Commit: `feat(bounty): Phase 5 — Refund Flow UI`

---

## Phase 6: User Profiles ✅

### Task 6.1: Update ProfilePage with Real Data ✅
- [x] Fetches real data from `GET /api/users/:walletAddress`
- [x] Displays:
  - GitHub username (from profile, or "Not linked")
  - Bounty count (created)
  - Win count (won)
  - Joined date
- [x] Loading and error states implemented
- [x] Activity message dynamic based on stats
- [x] Commit: `feat(profile): Phase 6 — User Profiles with Real Data`

---

## Phase 7: Search, Pagination, Notifications

### Task 7.1: Search Bar + Status Filter ✅
- [x] Added search input (searches repo name, owner, issue #)
- [x] Added status dropdown (OPEN, READY_FOR_CLAIM, CLAIMED, REFUNDABLE, ALL)
- [x] 300ms debounce on search input
- [x] Filters wire to `?search=&status=` query params
- [x] Filters persist across page refreshes
- [x] Commit: `feat(search): Phase 7.1 — Search Bar + Status Filter for Bounties`

### Task 7.2: Pagination Controls 🔄
- [ ] Requires backend pagination API support (`?page=&limit=`)
- [ ] Add Previous/Next controls below lists
- [ ] Read `page`/`limit` from URL params
- [ ] Not started (waiting on backend support)

### Task 7.3: Notification Bell 🔄
- [ ] Requires `GET /notifications` backend endpoint
- [ ] Add bell icon to HeaderBar
- [ ] Unread count badge
- [ ] Dropdown with notifications
- [ ] Not started (waiting on backend support)

---

## Completion Criteria

- [x] Phases 3–6 and 7.1 complete
- [x] `npm run build` passes ✅
- [x] Browser testing: all flows verified ✅
- [x] Loading, error, empty states handled ✅
- [x] MEMORY.md updated ✅
- [x] TEST_RESULTS.md comprehensive report ✅
- [x] Playwright e2e tests written ✅
- [x] 6 commits created with clear messages ✅

## Final Status

✅ **Production Ready**
All core functional MVP features (Phases 3–7.1) implemented, tested, and verified working.
