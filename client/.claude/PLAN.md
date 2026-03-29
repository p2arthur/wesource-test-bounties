# Frontend Dev Agent — WeSource Plan

**Last Updated:** 2026-03-28
**Scope:** Phases 3–7 of WESOURCE_EXECUTIVE_PLAN.md
**Source:** `WeSource_full_audit/audit_results/CORE_FEATURES_PLAN.md` (Phases 3–7)

---

## Task 0: Visual Audit (Before Any Code)

**Context:** The current frontend is pixel wireframe style — raw, minimal, grid-based. p2 likes the direction but wants it refined into "pixel modern" — same DNA, better execution.

**What to do:**
- Run the app, click through every page
- Take screenshots (desktop + mobile)
- Document in MEMORY.md: color palette, font stack, spacing system, what works, what's rough
- Identify 2-3 specific components that need the most visual polish
- **Do NOT redesign everything.** This is an audit, not a rewrite.

**Ongoing rule:** Every time you touch a page for functional reasons (claim button, refund UI, etc.), make one small visual improvement while you're there. Compounding polish > big redesign.

---

## Context: What Came Before

### From the Audit

WeSource frontend has these issues:
- **Claim button shown for OPEN bounties** — should only show for READY_FOR_CLAIM (F-8)
- **Profile page hardcoded zeros** — never fetches real user data (F-15)
- **No auth flow** — wallet connects but no JWT/signature sent with API calls
- **No search/filter UI** — can't find projects or bounties
- **No notification UI** — winners don't know they can claim
- **No refund UI** — creators can't reclaim funds
- **Amounts may be misaligned** — need to verify ALGO→microAlgos conversion path

### From On-Chain Agent (Phase 1 — Complete)

- New `SourceFactoryClient.ts` generated — **import the updated client**
- `refund_bounty` and `revoke_bounty` methods added — you'll build UI for both
- New contract deployed to TestNet — **check `VITE_SOURCE_FACTORY_APP_ID` in .env**

### From Backend Dev (Phases 2–3 — Complete before your Phase 3+ work)

- Auth guards on mutating endpoints — you need to send wallet signature with API calls
- `GET /users/:walletAddress` — new endpoint for profile data
- `POST /bounties/link-wallet` — new endpoint for wallet↔GitHub linking
- Amounts in API responses are now microAlgos — **verify your display conversion**

### From Backend Dev (Phases 4–7 — runs in parallel with your work)

- Claim endpoint fixed with auth + type verification
- Refund endpoint added
- User endpoints created
- Pagination added to list endpoints
- Notification system built

---

## Phase 3: Authentication UI (Days 5–6)

### Task 3.1: Create `useAuth` Hook

**Context:** Backend now requires wallet-signed messages for all mutating endpoints. Frontend needs to handle the sign→JWT flow.

**What to do:**
- Create `src/hooks/useAuth.ts`
- Flow: wallet connected → prompt for GitHub username → sign login message → send to backend → store JWT in memory (NOT localStorage)
- Provide `isAuthenticated`, `token`, `login`, `logout` from hook

**Deliverable:** `useAuth.ts` hook with wallet→GitHub→JWT flow
**Test:** Connect wallet → sign → JWT received → protected endpoint works

---

### Task 3.2: Update WalletMenu with GitHub Linking

**Context:** After wallet connection, user needs to link their GitHub identity.

**What to do:**
- Update `WalletMenu.tsx` — after wallet connects, show "Connect GitHub" step
- Input for GitHub username
- Sign message → send to backend → show linked status
- Store wallet↔GitHub relationship for later use (winner identification)

**Deliverable:** Updated WalletMenu with GitHub linking flow
**Test:** Connect wallet → link GitHub → profile shows linked status

---

### Task 3.3: Attach Auth Headers to API Calls

**Context:** Backend returns 401 on mutating endpoints without auth. Frontend must send JWT.

**What to do:**
- Update `api.ts` — add auth header (Authorization: Bearer {token}) to all POST/PUT/DELETE requests
- Handle 401 responses → redirect to login or show "Connect Wallet" prompt
- GET requests stay unauthenticated

**Deliverable:** Auth-aware API client
**Test:** POST without token → 401. POST with token → 200.

---

## Phase 4: Claim Flow UI (Days 7–9)

### Task 4.1: Fix Claim Button Logic

**Context:** F-8 in audit. Claim button shows for OPEN bounties but claim requires READY_FOR_CLAIM.

**What to do:**
- Open `src/pages/BountyPage.tsx`
- Replace current claim button logic with:
  ```tsx
  {bounty.status === 'READY_FOR_CLAIM' && isConnected && isWinner ? (
      <button onClick={handleClaim}>Claim Bounty</button>
  ) : bounty.status === 'OPEN' ? (
      <div>Solve this issue on GitHub to win this bounty</div>
  ) : bounty.status === 'READY_FOR_CLAIM' && !isWinner ? (
      <div>This bounty has been awarded to {winnerName}</div>
  ) : bounty.status === 'CLAIMED' ? (
      <div>This bounty has been claimed</div>
  ) : null}
  ```

**Deliverable:** Correct status-based conditional rendering
**Test:** OPEN → "Solve this issue". READY_FOR_CLAIM + winner → "Claim" button. READY_FOR_CLAIM + not winner → "Awarded to X". CLAIMED → "Claimed".

---

### Task 4.2: Add `claimBountyOnChain` Function

**Context:** Winner needs to call the contract directly to claim funds.

**What to do:**
- Add to `src/services/bountyContract.ts`:
  ```ts
  export async function claimBountyOnChain(params: {
      repoOwner: string;
      repoName: string;
      issueNumber: number;
      senderAddress: string;
      signer: TransactionSigner;
  }): Promise<{ txId: string }>
  ```
- Use `SourceFactoryClient` to call `claim` method
- Include box reference for the bounty

**Deliverable:** Direct on-chain claim function
**Test:** Call with valid winner → txId returned. Call with wrong sender → error.

---

### Task 4.3: Connect Claim Button to Backend + On-Chain

**Context:** Claim flow has two steps: verify with backend, then execute on-chain.

**What to do:**
- Claim button click → call `POST /api/bounties/claim` (backend verifies auth + winner)
- If backend approves → call `claimBountyOnChain` (execute on-chain)
- Update UI on success → show "Claimed" status
- Handle errors: not winner, not ready, tx failed

**Deliverable:** End-to-end claim flow in UI
**Test:** Winner claims → funds arrive in wallet → status updates to CLAIMED

---

## Phase 5: Refund Flow UI (Day 10)

### Task 5.1: Add Refund UI to BountyPage

**Context:** Backend added refund endpoint. On-Chain added `refund_bounty`. Creator needs a button.

**What to do:**
- Add to `BountyPage.tsx`:
  ```tsx
  {bounty.status === 'REFUNDABLE' && isCreator && (
      <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
          <h3 className="font-bold">Bounty Refundable</h3>
          <p>This issue was closed without a solution. You can reclaim your funds.</p>
          <button onClick={handleRefund}>Reclaim {bounty.amount} ALGO</button>
      </div>
  )}
  ```
- `handleRefund` → call `POST /api/bounties/:id/refund` (backend handles on-chain call)

**Deliverable:** Refund button for REFUNDABLE + isCreator
**Test:** Creator sees reclaim button → click → funds returned → status REFUNDED

---

## Phase 6: User Profiles (Days 11–12)

### Task 6.1: Update ProfilePage with Real Data

**Context:** F-15 in audit. Profile shows hardcoded zeros. Backend now has `GET /users/:walletAddress`.

**What to do:**
- Open `src/pages/ProfilePage.tsx`
- Replace hardcoded zeros with API calls:
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
  ```
- Show real counts: `{bounties.length} Bounties`, `{wins.length} Wins`

**Deliverable:** Profile page with real data from API
**Test:** Visit profile → shows actual bounty count, win count, project count

---

## Phase 7: Search, Pagination, Notifications (Days 13–15)

### Task 7.1: Search Bar + Status Filter

**Context:** No way to search or filter projects/bounties.

**What to do:**
- Add search input + status dropdown to Home page
- Wire to backend query params: `?search=react&status=OPEN`
- Debounce search input (300ms)
- Show loading state while searching

**Deliverable:** Search + filter UI on Home page
**Test:** Type "react" → filters projects. Select "OPEN" → shows only open bounties.

---

### Task 7.2: Pagination Controls

**Context:** Backend added pagination. Frontend needs controls.

**What to do:**
- Add page controls (Previous/Next or page numbers) below lists
- Read `page`/`limit` from URL params (deep-linkable)
- Update API calls to include `?page=&limit=`

**Deliverable:** Pagination UI on all list pages
**Test:** Click Next → loads page 2. Share URL → opens same page.

---

### Task 7.3: Notification Bell

**Context:** Backend added notification system. Frontend needs a bell icon.

**What to do:**
- Add notification bell icon to header/nav
- Dropdown showing recent notifications (from `GET /notifications`)
- Unread count badge
- Click notification → navigate to relevant bounty
- Mark as read on click (`PATCH /notifications/:id/read`)

**Deliverable:** Notification bell + dropdown in header
**Test:** Oracle creates notification → bell shows badge → click → navigates to bounty

---

## Completion Criteria

- [ ] All tasks across Phases 3–7 done
- [ ] Browser testing: all flows work end-to-end
- [ ] Loading, error, empty states handled everywhere
- [ ] Responsive on mobile
- [ ] MEMORY.md updated with all decisions and findings
- [ ] Report completion to p2

---

## Dependencies

- **Phase 3 depends on:** Backend Phase 3 complete (WalletAuthGuard, JWT)
- **Phase 4 depends on:** Backend Phase 4 complete (claim endpoint), On-Chain Phase 1 (SourceFactoryClient)
- **Phase 5 depends on:** Backend Phase 5 complete (refund endpoint)
- **Phase 6 depends on:** Backend Phase 6 complete (user endpoints)
- **Phase 7 depends on:** Backend Phase 7 complete (pagination, notifications)
- **You can start Task 4.1 (fix claim button) and Task 5.1 (refund UI) early** — they're pure UI, no backend dependency
